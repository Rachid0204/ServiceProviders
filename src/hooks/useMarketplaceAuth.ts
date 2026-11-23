import { useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import {
  auth,
  db,
  signInWithGoogle,
  resolvePendingAuthRedirect,
  reloadCurrentUser,
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
import {
  isVerifiedAuthUser,
  persistSignupRoleIntent,
  readSignupRoleIntent,
  clearSignupRoleIntent,
  clearTermsAcceptedIntent,
  preserveProtectedUserFields,
  preserveProtectedProviderFields,
} from '../utils/authHelpers';

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
  diplomaFr?: string;
  diplomaAr?: string;
  skills?: string[];
  portfolioImages?: string[];
  isAvailableNow?: boolean;
}

export interface SaveFullProviderCardInput {
  role: 'provider' | 'both';
  fullName: string;
  phone: string;
  city: MoroccanCity;
  neighborhood: string;
  lat?: number;
  lng?: number;
  category: ServiceCategory;
  experienceYears: number;
  diploma: string;
  hourlyRateMAD: number;
  fixedVisitFeeMAD: number;
  isAvailableNow: boolean;
  bio: string;
  skills: string[];
  portfolioImages: string[];
  languagePref: LanguageCode;
}

function readInitialRoleIntent(): UserRole | null {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const paramRole = params.get('role');
    if (paramRole === 'client' || paramRole === 'provider' || paramRole === 'both') {
      persistSignupRoleIntent(paramRole);
      return paramRole;
    }
  }
  return readSignupRoleIntent();
}

export function useMarketplaceAuth(onLanguageSync: (lang: LanguageCode) => void) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authRedirectError, setAuthRedirectError] = useState<unknown | null>(null);
  const authSeqRef = useRef<number>(0);
  const [userProfile, setUserProfile] = useState<UserProfileRecord | null>(null);
  const [profileLoaded, setProfileLoaded] = useState<boolean>(false);
  const [verifiedOverride, setVerifiedOverride] = useState<boolean>(false);
  const [signupRoleIntent, setSignupRoleIntentState] = useState<UserRole | null>(
    readInitialRoleIntent
  );

  const setSignupRoleIntent = useCallback((role: UserRole | null) => {
    setSignupRoleIntentState(role);
    if (role) {
      persistSignupRoleIntent(role);
    } else {
      clearSignupRoleIntent();
    }
  }, []);

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
      setVerifiedOverride(isVerifiedAuthUser(user));
      setAuthReady(true);
      if (user) setAuthRedirectError(null);

      if (!user) {
        // Strictly clear all user state & cached profile on sign-out (zero fake local preview)
        setUserProfile(null);
        setProfileLoaded(true);
        setVerifiedOverride(false);
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

  /**
   * Reloads Firebase Auth user & refreshes ID token so email verification is detected reactively
   * (since user.reload() mutates auth.currentUser in place without re-firing onAuthStateChanged).
   */
  const refreshVerificationStatus = useCallback(async (): Promise<boolean> => {
    const refreshed = await reloadCurrentUser();
    const verified = isVerifiedAuthUser(refreshed);
    if (refreshed) {
      setFirebaseUser(refreshed);
      setVerifiedOverride(verified);
    }
    return verified;
  }, []);

  const handleSignOut = async () => {
    setUserProfile(null);
    setProfileLoaded(true);
    setVerifiedOverride(false);
    setSignupRoleIntent(null);
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
    if (!isVerifiedAuthUser(firebaseUser) && !verifiedOverride) {
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
      const existingData = existingSnap.exists() ? existingSnap.data() : null;
      if (existingData?.accountStatus === 'suspended') {
        throw new Error(
          profileInput.languagePref === 'ar'
            ? 'تم تعليق هذا الحساب مؤقتاً من طرف الإدارة.'
            : 'Ce compte est actuellement suspendu par l’administration.'
        );
      }

      if (existingData) {
        verifiedBadgeVal = Boolean(existingData.verifiedBadge);
        if (existingData.accountStatus === 'active' || existingData.accountStatus === 'suspended') {
          record.accountStatus = existingData.accountStatus;
        }
        if ('termsAcceptedAt' in existingData && existingData.termsAcceptedAt !== undefined) {
          record.termsAcceptedAt = existingData.termsAcceptedAt;
        }
      }

      record.verifiedBadge = verifiedBadgeVal;
      const existingProvider = providerSnap.exists() ? providerSnap.data() : null;

      const userDocPayload = preserveProtectedUserFields(
        {
          ...record,
          updatedAt: serverTimestamp(),
        },
        existingData,
        serverTimestamp()
      );

      const batch = writeBatch(db);
      batch.set(userRef, userDocPayload, { merge: false });

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

        const baseProviderPayload: Record<string, unknown> = {
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

        if (typeof existingProvider?.diplomaFr === 'string' && existingProvider.diplomaFr) {
          baseProviderPayload.diplomaFr = existingProvider.diplomaFr;
        }
        if (typeof existingProvider?.diplomaAr === 'string' && existingProvider.diplomaAr) {
          baseProviderPayload.diplomaAr = existingProvider.diplomaAr;
        }

        const providerPayload = preserveProtectedProviderFields(
          baseProviderPayload,
          existingProvider
        );

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
    setSignupRoleIntent(null);
    clearTermsAcceptedIntent();
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(record));
    } catch {
      // ignore quota errors
    }
    onLanguageSync(profileInput.languagePref);
  };

  /**
   * Atomically creates or updates the complete Maâlem public card (`providers/{uid}`)
   * together with `users/{uid}` directly from the Maâlem Card Studio in ProviderDashboard.
   */
  const saveFullProviderCard = async (input: SaveFullProviderCardInput) => {
    if (!firebaseUser || (!isVerifiedAuthUser(firebaseUser) && !verifiedOverride)) {
      throw new Error(
        input.languagePref === 'ar'
          ? 'يرجى تأكيد بريدك الإلكتروني أولاً.'
          : 'Veuillez vérifier votre adresse e-mail avant de publier votre fiche Maâlem.'
      );
    }

    const uid = firebaseUser.uid;
    const userRef = doc(db, 'users', uid);
    const providerRef = doc(db, 'providers', uid);
    const userPath = `providers/${uid}`;

    try {
      const [existingUserSnap, existingProviderSnap] = await Promise.all([
        getDoc(userRef),
        getDoc(providerRef),
      ]);
      const existingUser = existingUserSnap.exists() ? existingUserSnap.data() : null;
      const existingProvider = existingProviderSnap.exists() ? existingProviderSnap.data() : null;

      if (existingUser?.accountStatus === 'suspended') {
        throw new Error(
          input.languagePref === 'ar'
            ? 'تم تعليق هذا الحساب مؤقتاً من طرف الإدارة.'
            : 'Ce compte est actuellement suspendu par l’administration.'
        );
      }

      const verifiedBadgeVal = Boolean(
        existingProvider?.verifiedBadge ?? existingUser?.verifiedBadge ?? false
      );
      const cityCoords = CITY_COORDINATES[input.city] || CITY_COORDINATES.Casablanca;
      const safeLat =
        typeof input.lat === 'number' && input.lat >= 20 && input.lat <= 37
          ? input.lat
          : existingProvider?.location?.city === input.city &&
            typeof existingProvider?.location?.lat === 'number'
          ? existingProvider.location.lat
          : cityCoords.lat;
      const safeLng =
        typeof input.lng === 'number' && input.lng >= -18 && input.lng <= -1
          ? input.lng
          : existingProvider?.location?.city === input.city &&
            typeof existingProvider?.location?.lng === 'number'
          ? existingProvider.location.lng
          : cityCoords.lng;

      const cleanedSkills = input.skills
        .map((s) => s.trim().slice(0, 64))
        .filter((s) => s.length >= 1)
        .slice(0, 10);
      const finalSkills = cleanedSkills.length > 0 ? cleanedSkills : [input.category];

      const safeImages = input.portfolioImages
        .filter((u) => isSafeImageUrl(u))
        .slice(0, 6);
      const finalImages =
        safeImages.length > 0 ? safeImages : [DEFAULT_CATEGORY_IMAGE[input.category]];

      const trimmedName = input.fullName.trim().slice(0, 80);
      const trimmedBio =
        input.bio.trim().length >= 10
          ? input.bio.trim().slice(0, 600)
          : 'Artisan Maâlem inscrit sur Moul L’Khedma — Intervention rapide et soignée.';
      const trimmedDiploma = input.diploma.trim().slice(0, 160);

      const userRecord: UserProfileRecord = {
        uid,
        role: input.role,
        fullName: trimmedName,
        phone: input.phone,
        city: input.city,
        neighborhood: input.neighborhood.trim().slice(0, 80),
        languagePref: input.languagePref,
        verifiedBadge: verifiedBadgeVal,
        specialty: input.category,
        hourlyRateMad: Math.max(50, Math.min(50000, Math.round(input.hourlyRateMAD))),
        bio: trimmedBio.slice(0, 500),
        ...(existingUser?.accountStatus === 'active' || existingUser?.accountStatus === 'suspended'
          ? { accountStatus: existingUser.accountStatus }
          : {}),
        ...(existingUser && 'termsAcceptedAt' in existingUser && existingUser.termsAcceptedAt !== undefined
          ? { termsAcceptedAt: existingUser.termsAcceptedAt }
          : {}),
      };

      const fullNameFr =
        input.languagePref === 'ar' && typeof existingProvider?.fullNameFr === 'string'
          ? existingProvider.fullNameFr
          : trimmedName;
      const fullNameAr =
        input.languagePref === 'fr' && typeof existingProvider?.fullNameAr === 'string'
          ? existingProvider.fullNameAr
          : trimmedName;
      const bioFr =
        input.languagePref === 'ar' &&
        typeof existingProvider?.bioFr === 'string' &&
        existingProvider.bioFr.length >= 10
          ? existingProvider.bioFr
          : trimmedBio;
      const bioAr =
        input.languagePref === 'fr' &&
        typeof existingProvider?.bioAr === 'string' &&
        existingProvider.bioAr.length >= 10
          ? existingProvider.bioAr
          : trimmedBio;

      const baseProviderPayload: Record<string, unknown> = {
        uid,
        fullNameFr,
        fullNameAr,
        category: input.category,
        bioFr,
        bioAr,
        hourlyRateMAD: Math.max(50, Math.min(50000, Math.round(input.hourlyRateMAD))),
        fixedVisitFeeMAD: Math.max(0, Math.min(10000, Math.round(input.fixedVisitFeeMAD))),
        experienceYears: Math.max(0, Math.min(60, Math.round(input.experienceYears))),
        skills: finalSkills,
        portfolioImages: finalImages,
        ratingAvg: existingProvider ? Number(existingProvider.ratingAvg ?? 5.0) : 5.0,
        reviewCount: existingProvider ? Math.round(Number(existingProvider.reviewCount ?? 0)) : 0,
        isAvailableNow: Boolean(input.isAvailableNow),
        verifiedBadge: verifiedBadgeVal,
        phone: input.phone,
        location: {
          lat: safeLat,
          lng: safeLng,
          city: input.city,
          quartier: input.neighborhood.trim().slice(0, 80),
        },
        createdAt: existingProvider ? existingProvider.createdAt : serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (trimmedDiploma) {
        if (input.languagePref === 'ar') {
          baseProviderPayload.diplomaAr = trimmedDiploma;
          if (typeof existingProvider?.diplomaFr === 'string' && existingProvider.diplomaFr) {
            baseProviderPayload.diplomaFr = existingProvider.diplomaFr;
          }
        } else {
          baseProviderPayload.diplomaFr = trimmedDiploma;
          if (typeof existingProvider?.diplomaAr === 'string' && existingProvider.diplomaAr) {
            baseProviderPayload.diplomaAr = existingProvider.diplomaAr;
          }
        }
      }

      const userDocPayload = preserveProtectedUserFields(
        {
          ...userRecord,
          updatedAt: serverTimestamp(),
        },
        existingUser,
        serverTimestamp()
      );
      const providerPayload = preserveProtectedProviderFields(
        baseProviderPayload,
        existingProvider
      );

      const batch = writeBatch(db);
      batch.set(userRef, userDocPayload, { merge: false });
      batch.set(providerRef, providerPayload, { merge: false });
      await batch.commit();

      setUserProfile(userRecord);
      setSignupRoleIntent(null);
      clearTermsAcceptedIntent();
      try {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(userRecord));
      } catch {
        // ignore quota errors
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, userPath);
    }
  };

  /**
   * Updates strictly the authenticated provider's own `providers/{uid}` profile fields
   * (bio, rates, experience, diploma, skills, portfolio photos) in compliance with firestore.rules.
   */
  const updateOwnProviderDetails = async (patch: UpdateProviderDetailsInput) => {
    if (!firebaseUser || (!isVerifiedAuthUser(firebaseUser) && !verifiedOverride)) {
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
    if (typeof patch.diplomaFr === 'string') {
      updatePayload.diplomaFr = patch.diplomaFr.trim().slice(0, 160);
    }
    if (typeof patch.diplomaAr === 'string') {
      updatePayload.diplomaAr = patch.diplomaAr.trim().slice(0, 160);
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
    setVerifiedOverride(false);
    setSignupRoleIntent(null);
    try {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  };

  const isAuthenticated = Boolean(firebaseUser);
  const isVerified = Boolean(firebaseUser && (verifiedOverride || isVerifiedAuthUser(firebaseUser)));
  const needsOnboarding = Boolean(authReady && firebaseUser && isVerified && profileLoaded && !userProfile);

  return {
    firebaseUser,
    authReady,
    profileLoaded,
    isAuthenticated,
    isVerified,
    needsOnboarding,
    signupRoleIntent,
    setSignupRoleIntent,
    refreshVerificationStatus,
    authRedirectError,
    userProfile,
    hydrateUserProfile,
    signInWithGoogle,
    signOutUser: handleSignOut,
    deleteAccount: handleDeleteAccount,
    handleSaveProfile,
    saveFullProviderCard,
    updateOwnProviderDetails,
  };
}
