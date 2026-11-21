import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  auth,
  db,
  signInWithGoogle,
  signOutUser,
  handleFirestoreError,
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
      const saved = localStorage.getItem('moul_lkhedma_profile');
      return saved ? (JSON.parse(saved) as UserProfileRecord) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthReady(true);

      if (user) {
        const userDocPath = `users/${user.uid}`;
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            const data = snap.data() as UserProfileRecord;
            setUserProfile(data);
            localStorage.setItem('moul_lkhedma_profile', JSON.stringify(data));
            if (data.languagePref === 'ar' || data.languagePref === 'fr') {
              onLanguageSync(data.languagePref);
            }
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, userDocPath);
        }
      }
    });
    return () => unsubscribe();
  }, [onLanguageSync]);

  const handleSaveProfile = async (profileInput: SaveProfileInput) => {
    const uid = firebaseUser?.uid ?? 'local-user-preview';
    let verifiedBadgeVal = userProfile?.verifiedBadge ?? false;

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
      hourlyRateMad: profileInput.hourlyRateMad,
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

        if (profileInput.role === 'provider' || profileInput.role === 'both') {
          const providerPath = `providers/${firebaseUser.uid}`;
          const providerSnap = await getDoc(doc(db, 'providers', firebaseUser.uid));
          const existingProvider = providerSnap.exists() ? providerSnap.data() : null;

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

          // Preserve existing provider fields (skills, portfolioImages, experienceYears, stats) on profile edit
          const preservedSkills =
            Array.isArray(existingProvider?.skills) && existingProvider.skills.length > 0
              ? existingProvider.skills
              : [cat];
          const preservedPortfolio =
            Array.isArray(existingProvider?.portfolioImages) &&
            existingProvider.portfolioImages.length > 0
              ? existingProvider.portfolioImages
              : ['/src/assets/images/hero_moroccan_craftsman_1794980476857.jpg'];

          const providerPayload: Record<string, unknown> = {
            uid: firebaseUser.uid,
            fullNameFr: profileInput.fullName,
            fullNameAr: profileInput.fullName,
            category: cat,
            bioFr: bioText,
            bioAr: bioText,
            hourlyRateMAD: Math.round(profileInput.hourlyRateMad || 150),
            fixedVisitFeeMAD:
              typeof existingProvider?.fixedVisitFeeMAD === 'number'
                ? existingProvider.fixedVisitFeeMAD
                : 70,
            experienceYears:
              typeof existingProvider?.experienceYears === 'number'
                ? existingProvider.experienceYears
                : 5,
            skills: preservedSkills,
            portfolioImages: preservedPortfolio,
            ratingAvg: existingProvider ? Number(existingProvider.ratingAvg ?? 5.0) : 5.0,
            reviewCount: existingProvider ? Number(existingProvider.reviewCount ?? 0) : 0,
            isAvailableNow: existingProvider ? Boolean(existingProvider.isAvailableNow) : true,
            verifiedBadge: existingProvider
              ? Boolean(existingProvider.verifiedBadge)
              : verifiedBadgeVal,
            phone: profileInput.phone,
            completedJobs:
              typeof existingProvider?.completedJobs === 'number'
                ? existingProvider.completedJobs
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

          if (typeof existingProvider?.lastReviewBookingId === 'string') {
            providerPayload.lastReviewBookingId = existingProvider.lastReviewBookingId;
          }

          try {
            await setDoc(doc(db, 'providers', firebaseUser.uid), providerPayload, {
              merge: false,
            });
          } catch (providerErr) {
            handleFirestoreError(providerErr, OperationType.WRITE, providerPath);
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, userPath);
      }
    }

    setUserProfile(record);
    localStorage.setItem('moul_lkhedma_profile', JSON.stringify(record));
    onLanguageSync(profileInput.languagePref);
  };

  return {
    firebaseUser,
    authReady,
    userProfile,
    signInWithGoogle,
    signOutUser,
    handleSaveProfile,
  };
}
