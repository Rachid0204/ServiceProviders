import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import {
  auth,
  db,
  signInWithGoogle,
  resolvePendingAuthRedirect,
  deleteCurrentAuthUser,
  signOutUser,
  handleFirestoreError,
  reportFirestoreError,
  OperationType,
} from '../firebase';
import {
  CITY_COORDINATES,
  DEFAULT_CATEGORY_IMAGE,
  isSafeImageUrl,
  type LanguageCode,
  type MoroccanCity,
  type ServiceCategory,
  type UserProfileRecord,
  type UserRole,
} from '../utils/marketplace';
import { isVerifiedAuthUser } from '../utils/authHelpers';

const PROFILE_STORAGE_KEY = 'moul_lkhedma_profile';

export interface SaveProfileInput {
  role: UserRole;
  fullName: string;
  phone: string;
  city: MoroccanCity;
  neighborhood: string;
  languagePref: LanguageCode;
  specialty: ServiceCategory | 'none';
  hourlyRateMad: number;
  bio: string;
}

export interface UpdateProviderDetailsInput {
  bioFr?: string;
  bioAr?: string;
  hourlyRateMAD?: number;
  fixedVisitFeeMAD?: number;
  experienceYears?: number;
  skills?: string[];
  portfolioImages?: string[];
  isAvailableNow?: boolean;
}

export function useMarketplaceAuth(onLanguageSync: (lang: LanguageCode) => void) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authRedirectError, setAuthRedirectError] = useState<unknown | null>(null);
  const authSeqRef = useRef<number>(0);
  const [userProfile, setUserProfile] = useState<UserProfileRecord | null>(null);
  const [profileLoaded, setProfileLoaded] = useState<boolean>(false);

  // Resolve any pending OAuth redirect result (Safari / iOS WebView / mobile fallback)
  useEffect(() => {
    let active = true;
    resolvePendingAuthRedirect().catch((err) => {
      if (active) setAuthRedirectError(err);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;
      const seq = ++authSeqRef.current;
      setFirebaseUser(user);
      setAuthReady(true);
      if (user) setAuthRedirectError(null);

      if (!user) {
        // Strictly clear all user state & cached profile on sign-out (zero fake local preview)
        setUserProfile(null);
        setProfileLoaded(true);
        try {
          localStorage.removeItem(PROFILE_STORAGE_KEY);
        } catch {
          // ignore storage errors
        }
        return;
      }

      // Immediately drop any profile belonging to a different UID while fetching the new account's profile
      setUserProfile((prev) => (prev?.uid === user.uid ? prev : null));
      setProfileLoaded(false);

      const userDocPath = `users/${user.uid}`;
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        // Ignore stale responses if another auth event fired while this read was in flight
        if (!active || authSeqRef.current !== seq) return;
        if (snap.exists()) {
          const data = snap.data() as UserProfileRecord;
          setUserProfile(data);
          try {
            localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data));
          } catch {
            // ignore quota errors
          }
          if (data.languagePref === 'ar' || data.languagePref === 'fr') {
            onLanguageSync(data.languagePref);
          }
        } else {
          // New Firebase account without a Firestore profile yet: clear any stale cached user
          setUserProfile(null);
          localStorage.removeItem(PROFILE_STORAGE_KEY);
        }
      } catch (err) {
        if (!active || authSeqRef.current !== seq) return;
        reportFirestoreError(err, OperationType.GET, userDocPath);
      } finally {
        if (active && authSeqRef.current === seq) {
          setProfileLoaded(true);
        }
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [onLanguageSync]);

  const handleSignOut = async () => {
    setUserProfile(null);
    setProfileLoaded(true);
    try {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
    return signOutUser();
  };

  const handleSaveProfile = async (profileInput: SaveProfileInput) => {
    if (!firebaseUser) {
      throw new Error(
        profileInput.languagePref === 'ar'
          ? 'يرجى تسجيل الدخول أولاً لحفظ ملفك الشخصي.'
          : 'Veuillez vous connecter avant d’enregistrer votre profil.'
      );
    }
    if (!isVerifiedAuthUser(firebaseUser)) {
      throw new Error(
        profileInput.languagePref === 'ar'
          ? 'يرجى تأكيد بريدك الإلكتروني أولاً لحفظ ملفك الشخصي.'
          : 'Veuillez vérifier votre adresse e-mail avant d’enregistrer votre profil.'
      );
    }

    const uid = firebaseUser.uid;
    let verifiedBadgeVal =
      userProfile && userProfile.uid === uid ? Boolean(userProfile.verifiedBadge) : false;
    const roundedRate = Math.max(0, Math.round(profileInput.hourlyRateMad || 0));

    const record: UserProfileRecord = {
      uid,
      role: profileInput.role,
      fullName: profileInput.fullName,
      phone: profileInput.phone,
      city: profileInput.city,
      neighborhood: profileInput.neighborhood,
      languagePref: profileInput.languagePref,
      verifiedBadge: verifiedBadgeVal,
      specialty: profileInput.specialty,
      hourlyRateMad: roundedRate,
      bio: profileInput.bio,
    };

    const userPath = `users/${firebaseUser.uid}`;
    const userRef = doc(db, 'users', firebaseUser.uid);
    const providerRef = doc(db, 'providers', firebaseUser.uid);
    try {
      const [existingSnap, providerSnap] = await Promise.all([
        getDoc(userRef),
        getDoc(providerRef),
      ]);
      let createdAtVal: unknown = serverTimestamp();

      if (existingSnap.exists()) {
        const existingData = existingSnap.data();
        verifiedBadgeVal = Boolean(existingData.verifiedBadge);
        createdAtVal = existingData.createdAt;
      }

      record.verifiedBadge = verifiedBadgeVal;
      const existingProvider = providerSnap.exists() ? providerSnap.data() : null;

      const batch = writeBatch(db);
      batch.set(
        userRef,
        {
          ...record,
          verifiedBadge: verifiedBadgeVal,
          createdAt: createdAtVal,
          updatedAt: serverTimestamp(),
        },
        { merge: false }
      );

      if (profileInput.role === 'provider' || profileInput.role === 'both') {
        const cat: ServiceCategory =
          profileInput.specialty && profileInput.specialty !== 'none'
            ? profileInput.specialty
            : 'Plomberie';
        const cityCoords =
          CITY_COORDINATES[profileInput.city] || CITY_COORDINATES.Casablanca;
        const bioText =
          profileInput.bio && profileInput.bio.length >= 10
            ? profileInput.bio
            : 'Prestataire professionnel inscrit sur Moul L’Khedma — Intervention rapide.';

        const preservedSkills =
          Array.isArray(existingProvider?.skills) && existingProvider.skills.length > 0
            ? existingProvider.skills
            : [cat];
        const preservedPortfolio =
          Array.isArray(existingProvider?.portfolioImages) &&
          existingProvider.portfolioImages.length > 0
            ? existingProvider.portfolioImages
            : [DEFAULT_CATEGORY_IMAGE[cat]];

        // Preserve opposite-language name/bio when editing an existing bilingual provider profile
        const fullNameFr =
          profileInput.languagePref === 'ar' && typeof existingProvider?.fullNameFr === 'string'
            ? existingProvider.fullNameFr
            : profileInput.fullName;
        const fullNameAr =
          profileInput.languagePref === 'fr' && typeof existingProvider?.fullNameAr === 'string'
            ? existingProvider.fullNameAr
            : profileInput.fullName;
        const bioFr =
          profileInput.languagePref === 'ar' &&
          typeof existingProvider?.bioFr === 'string' &&
          existingProvider.bioFr.length >= 10
            ? existingProvider.bioFr
            : bioText;
        const bioAr =
          profileInput.languagePref === 'fr' &&
          typeof existingProvider?.bioAr === 'string' &&
          existingProvider.bioAr.length >= 10
            ? existingProvider.bioAr
            : bioText;

        const providerPayload: Record<string, unknown> = {
          uid: firebaseUser.uid,
          fullNameFr,
          fullNameAr,
          category: cat,
          bioFr,
          bioAr,
          hourlyRateMAD: Math.max(50, Math.round(profileInput.hourlyRateMad || 150)),
          fixedVisitFeeMAD:
            typeof existingProvider?.fixedVisitFeeMAD === 'number'
              ? Math.round(existingProvider.fixedVisitFeeMAD)
              : 70,
          experienceYears:
            typeof existingProvider?.experienceYears === 'number'
              ? Math.round(existingProvider.experienceYears)
              : 5,
          skills: preservedSkills,
          portfolioImages: preservedPortfolio,
          ratingAvg: existingProvider ? Number(existingProvider.ratingAvg ?? 5.0) : 5.0,
          reviewCount: existingProvider ? Math.round(Number(existingProvider.reviewCount ?? 0)) : 0,
          isAvailableNow: existingProvider ? Boolean(existingProvider.isAvailableNow) : true,
          verifiedBadge: existingProvider
            ? Boolean(existingProvider.verifiedBadge)
            : verifiedBadgeVal,
          phone: profileInput.phone,
          completedJobs:
            typeof existingProvider?.completedJobs === 'number'
              ? Math.round(existingProvider.completedJobs)
              : 0,
          location: {
            lat:
              existingProvider?.location?.city === profileInput.city &&
              typeof existingProvider?.location?.lat === 'number'
                ? existingProvider.location.lat
                : cityCoords.lat,
            lng:
              existingProvider?.location?.city === profileInput.city &&
              typeof existingProvider?.location?.lng === 'number'
                ? existingProvider.location.lng
                : cityCoords.lng,
            city: profileInput.city,
            quartier: profileInput.neighborhood,
          },
          createdAt: existingProvider ? existingProvider.createdAt : serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (typeof existingProvider?.lastCompletedBookingId === 'string') {
          providerPayload.lastCompletedBookingId = existingProvider.lastCompletedBookingId;
        }
        if (typeof existingProvider?.lastReviewBookingId === 'string') {
          providerPayload.lastReviewBookingId = existingProvider.lastReviewBookingId;
        }

        batch.set(providerRef, providerPayload, { merge: false });
      } else if (existingProvider && existingProvider.isAvailableNow) {
        // User switched role back to 'client': atomically mark public provider listing unavailable
        batch.update(providerRef, {
          isAvailableNow: false,
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, userPath);
    }

    setUserProfile(record);
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(record));
    } catch {
      // ignore quota errors
    }
    onLanguageSync(profileInput.languagePref);
  };

  /**
   * Updates strictly the authenticated provider's own `providers/{uid}` profile fields
   * (bio, rates, experience, skills, portfolio photos) in compliance with firestore.rules.
   */
  const updateOwnProviderDetails = async (patch: UpdateProviderDetailsInput) => {
    if (!firebaseUser || !isVerifiedAuthUser(firebaseUser)) {
      throw new Error('Authentication required');
    }
    const providerPath = `providers/${firebaseUser.uid}`;
    const providerRef = doc(db, 'providers', firebaseUser.uid);
    const updatePayload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (typeof patch.bioFr === 'string' && patch.bioFr.trim().length >= 10) {
      updatePayload.bioFr = patch.bioFr.trim().slice(0, 600);
    }
    if (typeof patch.bioAr === 'string' && patch.bioAr.trim().length >= 10) {
      updatePayload.bioAr = patch.bioAr.trim().slice(0, 600);
    }
    if (typeof patch.hourlyRateMAD === 'number' && !Number.isNaN(patch.hourlyRateMAD)) {
      updatePayload.hourlyRateMAD = Math.max(50, Math.min(50000, Math.round(patch.hourlyRateMAD)));
    }
    if (typeof patch.fixedVisitFeeMAD === 'number' && !Number.isNaN(patch.fixedVisitFeeMAD)) {
      updatePayload.fixedVisitFeeMAD = Math.max(0, Math.min(10000, Math.round(patch.fixedVisitFeeMAD)));
    }
    if (typeof patch.experienceYears === 'number' && !Number.isNaN(patch.experienceYears)) {
      updatePayload.experienceYears = Math.max(0, Math.min(60, Math.round(patch.experienceYears)));
    }
    if (Array.isArray(patch.skills)) {
      const cleanedSkills = patch.skills
        .map((s) => s.trim().slice(0, 64))
        .filter((s) => s.length >= 1)
        .slice(0, 10);
      if (cleanedSkills.length >= 1) {
        updatePayload.skills = cleanedSkills;
      }
    }
    if (Array.isArray(patch.portfolioImages)) {
      const safeImages = patch.portfolioImages
        .filter((u) => isSafeImageUrl(u))
        .slice(0, 6);
      if (safeImages.length >= 1) {
        updatePayload.portfolioImages = safeImages;
      }
    }
    if (typeof patch.isAvailableNow === 'boolean') {
      updatePayload.isAvailableNow = patch.isAvailableNow;
    }

    try {
      await updateDoc(providerRef, updatePayload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, providerPath);
    }
  };

  const hydrateUserProfile = (profile: UserProfileRecord) => {
    setUserProfile(profile);
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // ignore storage errors
    }
  };

  const handleDeleteAccount = async () => {
    if (!firebaseUser) return;
    const providerRef = doc(db, 'providers', firebaseUser.uid);
    try {
      const providerSnap = await getDoc(providerRef);
      if (providerSnap.exists() && providerSnap.data()?.isAvailableNow) {
        await updateDoc(providerRef, {
          isAvailableNow: false,
          updatedAt: serverTimestamp(),
        });
      }
    } catch {
      // Proceed with account deletion even if provider doc is absent or already inactive
    }
    await deleteCurrentAuthUser();
    setUserProfile(null);
    try {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  };

  const isAuthenticated = Boolean(firebaseUser);
  const isVerified = isVerifiedAuthUser(firebaseUser);
  const needsOnboarding = Boolean(authReady && firebaseUser && profileLoaded && !userProfile);

  return {
    firebaseUser,
    authReady,
    isAuthenticated,
    isVerified,
    needsOnboarding,
    authRedirectError,
    userProfile,
    hydrateUserProfile,
    signInWithGoogle,
    signOutUser: handleSignOut,
    deleteAccount: handleDeleteAccount,
    handleSaveProfile,
    updateOwnProviderDetails,
  };
}
