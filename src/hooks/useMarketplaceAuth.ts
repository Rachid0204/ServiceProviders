import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
  auth,
  db,
  signInWithGoogle,
  signOutUser,
  handleFirestoreError,
  reportFirestoreError,
  OperationType,
} from '../firebase';
import {
  CITY_COORDINATES,
  type LanguageCode,
  type MoroccanCity,
  type ServiceCategory,
  type UserProfileRecord,
  type UserRole,
} from '../utils/marketplace';

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

export function useMarketplaceAuth(onLanguageSync: (lang: LanguageCode) => void) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfileRecord | null>(() => {
    try {
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!saved) return null;
      const parsed = JSON.parse(saved) as UserProfileRecord;
      // Only restore local-preview profiles until Firebase Auth confirms the signed-in UID
      return parsed.uid === 'local-user-preview' ? parsed : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;
      setFirebaseUser(user);
      setAuthReady(true);

      if (!user) {
        // Prevent PII bleed across sessions when signing out
        setUserProfile((prev) => (prev?.uid === 'local-user-preview' ? prev : null));
        try {
          const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved) as UserProfileRecord;
            if (parsed.uid !== 'local-user-preview') {
              localStorage.removeItem(PROFILE_STORAGE_KEY);
            }
          }
        } catch {
          localStorage.removeItem(PROFILE_STORAGE_KEY);
        }
        return;
      }

      const userDocPath = `users/${user.uid}`;
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!active) return;
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
        reportFirestoreError(err, OperationType.GET, userDocPath);
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [onLanguageSync]);

  const handleSignOut = async () => {
    setUserProfile(null);
    try {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
    return signOutUser();
  };

  const handleSaveProfile = async (profileInput: SaveProfileInput) => {
    const uid = firebaseUser?.uid ?? 'local-user-preview';
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

    if (firebaseUser) {
      const userPath = `users/${firebaseUser.uid}`;
      try {
        const existingSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
        let createdAtVal: unknown = serverTimestamp();

        if (existingSnap.exists()) {
          const existingData = existingSnap.data();
          verifiedBadgeVal = Boolean(existingData.verifiedBadge);
          createdAtVal = existingData.createdAt;
        }

        record.verifiedBadge = verifiedBadgeVal;

        await setDoc(
          doc(db, 'users', firebaseUser.uid),
          {
            ...record,
            verifiedBadge: verifiedBadgeVal,
            createdAt: createdAtVal,
            updatedAt: serverTimestamp(),
          },
          { merge: false }
        );

        const providerPath = `providers/${firebaseUser.uid}`;
        const providerRef = doc(db, 'providers', firebaseUser.uid);
        const providerSnap = await getDoc(providerRef);
        const existingProvider = providerSnap.exists() ? providerSnap.data() : null;

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
              : ['/src/assets/images/hero_moroccan_craftsman_1794980476857.jpg'];

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

          try {
            await setDoc(providerRef, providerPayload, { merge: false });
          } catch (providerErr) {
            handleFirestoreError(providerErr, OperationType.WRITE, providerPath);
          }
        } else if (existingProvider && existingProvider.isAvailableNow) {
          // User switched role back to 'client': mark public provider listing unavailable
          try {
            await updateDoc(providerRef, {
              isAvailableNow: false,
              updatedAt: serverTimestamp(),
            });
          } catch (providerErr) {
            reportFirestoreError(providerErr, OperationType.UPDATE, providerPath);
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, userPath);
      }
    }

    setUserProfile(record);
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(record));
    } catch {
      // ignore quota errors
    }
    onLanguageSync(profileInput.languagePref);
  };

  return {
    firebaseUser,
    authReady,
    userProfile,
    signInWithGoogle,
    signOutUser: handleSignOut,
    handleSaveProfile,
  };
}
