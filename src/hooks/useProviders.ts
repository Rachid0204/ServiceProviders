import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection,
  query,
  limit,
  startAfter,
  getDoc,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, reportFirestoreError, OperationType } from '../firebase';
import { VETTED_PROVIDERS } from '../data/providers';
import { isDemoFixturesEnabled } from '../utils/featureFlags';
import {
  CITY_COORDINATES,
  DEFAULT_CATEGORY_IMAGE,
  isSafeImageUrl,
  type MoroccanCity,
  type ServiceCategory,
  type UserProfileRecord,
  type VettedProvider,
} from '../utils/marketplace';
import type { Translations } from '../i18n/translations';

export const PROVIDERS_PAGE_SIZE = 24;

export type ProviderOverride = Partial<
  Pick<
    VettedProvider,
    | 'isAvailableNow'
    | 'ratingAvg'
    | 'reviewCount'
    | 'completedJobs'
    | 'reviews'
    | 'verifiedBadge'
    | 'cinVerified'
    | 'cinNumberMasked'
  >
> & {
  removedReviewIds?: string[];
};

const DEMO_FIXTURES_ACTIVE = isDemoFixturesEnabled();
const SEEDED_BY_ID = DEMO_FIXTURES_ACTIVE
  ? new Map(VETTED_PROVIDERS.map((p) => [p.id, p]))
  : new Map<string, VettedProvider>();

export function mapFirestoreProviderDoc(id: string, data: DocumentData): VettedProvider {
  const seeded = SEEDED_BY_ID.get(id);
  const loc = data.location || {
    lat: 33.5883,
    lng: -7.6325,
    city: 'Casablanca',
    quartier: 'Maârif',
  };
  const isVerified = Boolean(data.verifiedBadge);
  const resolvedCategory =
    (data.category as ServiceCategory) || seeded?.category || 'Plomberie';
  const rawImages = Array.isArray(data.portfolioImages)
    ? data.portfolioImages.map(String).filter((u) => isSafeImageUrl(u))
    : [];
  const hasOnlyGenericHero =
    rawImages.length === 1 &&
    rawImages[0] === '/src/assets/images/hero_moroccan_craftsman_1794980476857.jpg';

  const measuredResponseMinutes =
    typeof data.responseMinutes === 'number' && data.responseMinutes > 0
      ? Math.round(data.responseMinutes)
      : seeded?.responseMinutes;

  return {
    uid: id,
    id,
    fullNameFr: String(data.fullNameFr || seeded?.fullNameFr || 'Maâlem'),
    fullNameAr: String(data.fullNameAr || seeded?.fullNameAr || 'معلم'),
    category: resolvedCategory,
    bioFr: String(data.bioFr || seeded?.bioFr || ''),
    bioAr: String(data.bioAr || seeded?.bioAr || ''),
    hourlyRateMAD: Number(data.hourlyRateMAD || seeded?.hourlyRateMAD || 150),
    fixedVisitFeeMAD: Number(data.fixedVisitFeeMAD ?? seeded?.fixedVisitFeeMAD ?? 70),
    experienceYears: Number(data.experienceYears ?? seeded?.experienceYears ?? 5),
    skills: Array.isArray(data.skills)
      ? data.skills.map(String)
      : seeded?.skills || ['Service vérifié'],
    skillsAr:
      seeded?.skillsAr ||
      (Array.isArray(data.skills) ? data.skills.map(String) : ['خدمة موثقة']),
    portfolioImages:
      rawImages.length > 0 && !hasOnlyGenericHero
        ? rawImages
        : seeded?.portfolioImages || [DEFAULT_CATEGORY_IMAGE[resolvedCategory]],
    ratingAvg: Number(data.ratingAvg ?? 5.0),
    reviewCount: Number(data.reviewCount ?? 0),
    isAvailableNow: Boolean(data.isAvailableNow),
    verifiedBadge: isVerified,
    cinVerified: isVerified,
    cinNumberMasked: isVerified
      ? seeded?.cinNumberMasked || 'CIN Vérifiée'
      : 'En attente',
    diplomaFr:
      (typeof data.diplomaFr === 'string' && data.diplomaFr) ||
      seeded?.diplomaFr ||
      (isVerified
        ? 'Qualification Professionnelle Vérifiée — Maroc'
        : 'Profil prestataire inscrit sur Moul L’Khedma'),
    diplomaAr:
      (typeof data.diplomaAr === 'string' && data.diplomaAr) ||
      seeded?.diplomaAr ||
      (isVerified
        ? 'تأهيل مهني موثق — المغرب'
        : 'مقدم خدمة مسجل على منصة مول الخدمة'),
    completedJobs:
      typeof data.completedJobs === 'number'
        ? data.completedJobs
        : seeded?.completedJobs ?? 0,
    ...(measuredResponseMinutes !== undefined ? { responseMinutes: measuredResponseMinutes } : {}),
    phone:
      typeof data.phone === 'string' && data.phone
        ? data.phone
        : seeded?.phone || '',
    location: {
      lat: Number(loc.lat || 33.5883),
      lng: Number(loc.lng || -7.6325),
      city: (loc.city as MoroccanCity) || 'Casablanca',
      quartier: String(loc.quartier || 'Centre'),
      quartierAr: seeded?.location.quartierAr || String(loc.quartier || 'المركز'),
    },
    reviews: seeded?.reviews || [],
  };
}

export function useProviders(
  firebaseUser: User | null,
  userProfile: UserProfileRecord | null,
  t: Translations
) {
  const [firestoreProviders, setFirestoreProviders] = useState<VettedProvider[]>([]);
  const [ownFirestoreProvider, setOwnFirestoreProvider] = useState<VettedProvider | null>(null);
  const [lastVisibleDoc, setLastVisibleDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreProviders, setHasMoreProviders] = useState(false);
  const [isLoadingMoreProviders, setIsLoadingMoreProviders] = useState(false);
  const [providerOverrides, setProviderOverrides] = useState<Record<string, ProviderOverride>>({});

  // Paginated public directory read (limit 24 via getDocs) instead of unbounded 200-doc real-time stream (AUD-019)
  useEffect(() => {
    let active = true;
    const providersPath = 'providers';
    const q = query(collection(db, providersPath), limit(PROVIDERS_PAGE_SIZE));
    void getDocs(q)
      .then((snapshot) => {
        if (!active) return;
        const loaded = snapshot.docs.map((d) => mapFirestoreProviderDoc(d.id, d.data()));
        setFirestoreProviders(loaded);
        setLastVisibleDoc(snapshot.docs[snapshot.docs.length - 1] ?? null);
        setHasMoreProviders(snapshot.docs.length === PROVIDERS_PAGE_SIZE);
      })
      .catch((err) => {
        if (active) {
          reportFirestoreError(err, OperationType.LIST, providersPath);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // Targeted single-doc hydration for the signed-in provider so ownProvider is always available beyond page 1
  useEffect(() => {
    let active = true;
    if (!firebaseUser) {
      setOwnFirestoreProvider(null);
      return;
    }
    const uid = firebaseUser.uid;
    void getDoc(doc(db, 'providers', uid))
      .then((snap) => {
        if (!active) return;
        setOwnFirestoreProvider(snap.exists() ? mapFirestoreProviderDoc(snap.id, snap.data()) : null);
      })
      .catch(() => {
        if (active) setOwnFirestoreProvider(null);
      });
    return () => {
      active = false;
    };
  }, [firebaseUser?.uid, userProfile?.role]);

  const loadMoreProviders = useCallback(async () => {
    if (!hasMoreProviders || !lastVisibleDoc || isLoadingMoreProviders) return;
    const providersPath = 'providers';
    setIsLoadingMoreProviders(true);
    try {
      const nextQ = query(
        collection(db, providersPath),
        startAfter(lastVisibleDoc),
        limit(PROVIDERS_PAGE_SIZE)
      );
      const snapshot = await getDocs(nextQ);
      const nextBatch = snapshot.docs.map((d) => mapFirestoreProviderDoc(d.id, d.data()));
      setFirestoreProviders((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const uniqueNext = nextBatch.filter((p) => !seen.has(p.id));
        return [...prev, ...uniqueNext];
      });
      setLastVisibleDoc(snapshot.docs[snapshot.docs.length - 1] ?? lastVisibleDoc);
      setHasMoreProviders(snapshot.docs.length === PROVIDERS_PAGE_SIZE);
    } catch (err) {
      reportFirestoreError(err, OperationType.LIST, providersPath);
    } finally {
      setIsLoadingMoreProviders(false);
    }
  }, [hasMoreProviders, lastVisibleDoc, isLoadingMoreProviders]);

  // Merge paginated Firestore providers (+ optional dev-only fixtures) + own provider card + overrides
  const allProviders = useMemo(() => {
    const mergedMap = new Map<string, VettedProvider>();
    if (DEMO_FIXTURES_ACTIVE) {
      VETTED_PROVIDERS.forEach((p) => mergedMap.set(p.id, p));
    }
    firestoreProviders.forEach((p) => mergedMap.set(p.id, p));
    if (ownFirestoreProvider) {
      mergedMap.set(ownFirestoreProvider.id, ownFirestoreProvider);
    }

    if (
      firebaseUser &&
      userProfile &&
      userProfile.uid === firebaseUser.uid &&
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
        portfolioImages: [DEFAULT_CATEGORY_IMAGE[cat]],
        ratingAvg: 5.0,
        reviewCount: 0,
        isAvailableNow: true,
        verifiedBadge: userProfile.verifiedBadge,
        cinVerified: userProfile.verifiedBadge,
        cinNumberMasked: userProfile.verifiedBadge ? 'CIN Vérifiée' : 'En attente',
        diplomaFr: 'Qualification Professionnelle Moul L’Khedma',
        diplomaAr: 'تأهيل مهني — مول الخدمة',
        completedJobs: 0,
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
          cleanOverride.reviewCount !== undefined
            ? cleanOverride.reviewCount
            : removedSet.size > 0
            ? Math.max(0, p.reviewCount - removedSet.size)
            : p.reviewCount,
      };
    });
  }, [firebaseUser, firestoreProviders, ownFirestoreProvider, userProfile, providerOverrides, t]);

  const toggleProviderAvailability = async (provider: VettedProvider) => {
    const previousVal = provider.isAvailableNow;
    const nextVal = !previousVal;

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
        setProviderOverrides((prev) => ({
          ...prev,
          [provider.id]: {
            ...prev[provider.id],
            isAvailableNow: previousVal,
          },
        }));
        reportFirestoreError(err, OperationType.UPDATE, path);
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
    setProviderOverrides((prev) => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        ratingAvg: update.ratingAvg,
        reviewCount: update.reviewCount,
        reviews: [update.review, ...(prev[providerId]?.reviews || [])],
      },
    }));
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

  const removeProviderReview = (
    providerId: string,
    reviewId: string,
    nextRating?: { ratingAvg: number; reviewCount: number }
  ) => {
    setProviderOverrides((prev) => {
      const existing = prev[providerId] || {};
      const nextRemoved = Array.from(new Set([...(existing.removedReviewIds || []), reviewId]));
      return {
        ...prev,
        [providerId]: {
          ...existing,
          ...(nextRating ? { ratingAvg: nextRating.ratingAvg, reviewCount: nextRating.reviewCount } : {}),
          removedReviewIds: nextRemoved,
        },
      };
    });
  };

  return {
    allProviders,
    firestoreProviders,
    hasMoreProviders,
    isLoadingMoreProviders,
    loadMoreProviders,
    toggleProviderAvailability,
    applyLocalReviewOverride,
    applyAdminProviderOverride,
    removeProviderReview,
  };
}
