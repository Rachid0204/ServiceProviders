import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { VETTED_PROVIDERS } from '../data/providers';
import {
  CITY_COORDINATES,
  type MoroccanCity,
  type ServiceCategory,
  type UserProfileRecord,
  type VettedProvider,
} from '../utils/marketplace';
import type { Translations } from '../i18n/translations';

export type ProviderOverride = Partial<
  Pick<
    VettedProvider,
    | 'isAvailableNow'
    | 'ratingAvg'
    | 'reviewCount'
    | 'reviews'
    | 'verifiedBadge'
    | 'cinVerified'
    | 'cinNumberMasked'
  >
> & {
  removedReviewIds?: string[];
};

function formatFirestoreDate(ts: unknown): string {
  if (ts && typeof ts === 'object' && 'toDate' in ts) {
    try {
      return (ts as Timestamp).toDate().toISOString().slice(0, 10);
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }
  return new Date().toISOString().slice(0, 10);
}

export function useProviders(
  firebaseUser: User | null,
  userProfile: UserProfileRecord | null,
  t: Translations
) {
  const [firestoreProviders, setFirestoreProviders] = useState<VettedProvider[]>([]);
  const [providerOverrides, setProviderOverrides] = useState<Record<string, ProviderOverride>>({});

  // Listen to public providers in Firestore `providers` collection
  useEffect(() => {
    const providersPath = 'providers';
    const q = query(collection(db, providersPath));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: VettedProvider[] = snapshot.docs.map((d) => {
          const data = d.data();
          const loc = data.location || {
            lat: 33.5883,
            lng: -7.6325,
            city: 'Casablanca',
            quartier: 'Maârif',
          };
          const isVerified = Boolean(data.verifiedBadge);
          return {
            uid: d.id,
            id: d.id,
            fullNameFr: String(data.fullNameFr || 'Maâlem'),
            fullNameAr: String(data.fullNameAr || 'معلم'),
            category: (data.category as ServiceCategory) || 'Plomberie',
            bioFr: String(data.bioFr || ''),
            bioAr: String(data.bioAr || ''),
            hourlyRateMAD: Number(data.hourlyRateMAD || 150),
            fixedVisitFeeMAD: Number(data.fixedVisitFeeMAD ?? 70),
            experienceYears: Number(data.experienceYears ?? 5),
            skills: Array.isArray(data.skills) ? data.skills.map(String) : ['Service vérifié'],
            skillsAr: Array.isArray(data.skills) ? data.skills.map(String) : ['خدمة موثقة'],
            portfolioImages:
              Array.isArray(data.portfolioImages) && data.portfolioImages.length > 0
                ? data.portfolioImages.map(String)
                : ['/src/assets/images/hero_moroccan_craftsman_1794980476857.jpg'],
            ratingAvg: Number(data.ratingAvg ?? 5.0),
            reviewCount: Number(data.reviewCount ?? 0),
            isAvailableNow: Boolean(data.isAvailableNow),
            verifiedBadge: isVerified,
            cinVerified: isVerified,
            cinNumberMasked: isVerified ? 'CIN Vérifiée' : 'En attente',
            diplomaFr: isVerified
              ? 'Qualification Professionnelle Vérifiée — Maroc'
              : 'Profil prestataire inscrit sur Moul L’Khedma',
            diplomaAr: isVerified
              ? 'تأهيل مهني موثق — المغرب'
              : 'مقدم خدمة مسجل على منصة مول الخدمة',
            completedJobs: typeof data.completedJobs === 'number' ? data.completedJobs : 0,
            responseMinutes: 20,
            phone: typeof data.phone === 'string' && data.phone ? data.phone : '+212661000000',
            location: {
              lat: Number(loc.lat || 33.5883),
              lng: Number(loc.lng || -7.6325),
              city: (loc.city as MoroccanCity) || 'Casablanca',
              quartier: String(loc.quartier || 'Centre'),
              quartierAr: String(loc.quartier || 'المركز'),
            },
            reviews: [],
          };
        });
        setFirestoreProviders(loaded);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, providersPath);
      }
    );
    return () => unsubscribe();
  }, []);

  // Listen to public reviews in Firestore `reviews` collection
  useEffect(() => {
    const reviewsPath = 'reviews';
    const q = query(collection(db, reviewsPath));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) return;
        const grouped: Record<string, VettedProvider['reviews']> = {};
        snapshot.docs.forEach((d) => {
          const data = d.data();
          const pid = String(data.providerId || '');
          if (!pid) return;
          if (!grouped[pid]) grouped[pid] = [];
          grouped[pid].push({
            id: d.id,
            authorName: String(data.authorName || 'Client'),
            quartier: String(data.quartier || ''),
            rating: Number(data.rating || 5),
            date: formatFirestoreDate(data.createdAt),
            commentFr: String(data.comment || ''),
            commentAr: String(data.comment || ''),
          });
        });

        setProviderOverrides((prev) => {
          const next = { ...prev };
          for (const [pid, revs] of Object.entries(grouped)) {
            next[pid] = {
              ...next[pid],
              reviews: revs,
            };
          }
          return next;
        });
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, reviewsPath);
      }
    );
    return () => unsubscribe();
  }, []);

  // Merge seeded 8 providers + live Firestore providers + local unsynced provider preview + overrides
  const allProviders = useMemo(() => {
    const mergedMap = new Map<string, VettedProvider>();
    VETTED_PROVIDERS.forEach((p) => mergedMap.set(p.id, p));
    firestoreProviders.forEach((p) => mergedMap.set(p.id, p));

    if (
      userProfile &&
      (userProfile.role === 'provider' || userProfile.role === 'both') &&
      !mergedMap.has(userProfile.uid)
    ) {
      const cat: ServiceCategory =
        userProfile.specialty && userProfile.specialty !== 'none'
          ? userProfile.specialty
          : 'Plomberie';
      const coords = CITY_COORDINATES[userProfile.city] || CITY_COORDINATES.Casablanca;
      const customProvider: VettedProvider = {
        uid: userProfile.uid,
        id: userProfile.uid,
        fullNameFr: userProfile.fullName,
        fullNameAr: userProfile.fullName,
        category: cat,
        bioFr:
          userProfile.bio ||
          'Prestataire professionnel inscrit sur Moul L’Khedma — Intervention rapide dans votre quartier.',
        bioAr:
          userProfile.bio ||
          'معلم ومقدم خدمة مسجل في منصة مول الخدمة — تدخل سريع وموثوق في حيك السكني.',
        hourlyRateMAD: userProfile.hourlyRateMad || 150,
        fixedVisitFeeMAD: 70,
        experienceYears: 5,
        skills: [cat],
        skillsAr: [t.categories[cat]],
        portfolioImages: ['/src/assets/images/hero_moroccan_craftsman_1794980476857.jpg'],
        ratingAvg: 5.0,
        reviewCount: 0,
        isAvailableNow: true,
        verifiedBadge: userProfile.verifiedBadge,
        cinVerified: userProfile.verifiedBadge,
        cinNumberMasked: userProfile.verifiedBadge ? 'CIN Vérifiée' : 'En attente',
        diplomaFr: 'Qualification Professionnelle Moul L’Khedma',
        diplomaAr: 'تأهيل مهني — مول الخدمة',
        completedJobs: 0,
        responseMinutes: 20,
        phone: userProfile.phone,
        location: {
          lat: coords.lat,
          lng: coords.lng,
          city: userProfile.city,
          quartier: userProfile.neighborhood,
          quartierAr: userProfile.neighborhood,
        },
        reviews: [],
      };
      mergedMap.set(customProvider.id, customProvider);
    }

    return Array.from(mergedMap.values()).map((p) => {
      const ov = providerOverrides[p.id];
      if (!ov) return p;
      const removedSet = new Set(ov.removedReviewIds || []);
      const combinedReviews =
        ov.reviews && ov.reviews.length > 0
          ? [
              ...ov.reviews,
              ...p.reviews.filter((r) => !ov.reviews!.some((nr) => nr.id === r.id)),
            ]
          : p.reviews;
      const filteredReviews =
        removedSet.size > 0
          ? combinedReviews.filter((r) => !removedSet.has(r.id))
          : combinedReviews;
      const { removedReviewIds: _ignored, ...cleanOverride } = ov;
      return {
        ...p,
        ...cleanOverride,
        reviews: filteredReviews,
        reviewCount:
          removedSet.size > 0
            ? Math.max(0, (cleanOverride.reviewCount ?? p.reviewCount) - removedSet.size)
            : cleanOverride.reviewCount ?? p.reviewCount,
      };
    });
  }, [firestoreProviders, userProfile, providerOverrides, t]);

  const toggleProviderAvailability = async (provider: VettedProvider) => {
    const nextVal = !provider.isAvailableNow;
    setProviderOverrides((prev) => ({
      ...prev,
      [provider.id]: {
        ...prev[provider.id],
        isAvailableNow: nextVal,
      },
    }));

    if (firebaseUser && provider.uid === firebaseUser.uid) {
      const path = `providers/${firebaseUser.uid}`;
      try {
        await updateDoc(doc(db, 'providers', firebaseUser.uid), {
          isAvailableNow: nextVal,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }
  };

  const applyLocalReviewOverride = (
    providerId: string,
    update: {
      ratingAvg: number;
      reviewCount: number;
      review: VettedProvider['reviews'][number];
    }
  ) => {
    setProviderOverrides((prev) => {
      const existingReviews = prev[providerId]?.reviews || [];
      return {
        ...prev,
        [providerId]: {
          ...prev[providerId],
          ratingAvg: update.ratingAvg,
          reviewCount: update.reviewCount,
          reviews: [update.review, ...existingReviews],
        },
      };
    });
  };

  const applyAdminProviderOverride = (providerId: string, patch: ProviderOverride) => {
    setProviderOverrides((prev) => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        ...patch,
      },
    }));
  };

  const removeProviderReview = (providerId: string, reviewId: string) => {
    setProviderOverrides((prev) => {
      const current = prev[providerId] || {};
      const existingRemoved = current.removedReviewIds || [];
      if (existingRemoved.includes(reviewId)) return prev;
      return {
        ...prev,
        [providerId]: {
          ...current,
          removedReviewIds: [...existingRemoved, reviewId],
        },
      };
    });
  };

  return {
    allProviders,
    toggleProviderAvailability,
    applyLocalReviewOverride,
    applyAdminProviderOverride,
    removeProviderReview,
  };
}
