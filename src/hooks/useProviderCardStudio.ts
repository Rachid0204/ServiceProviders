import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  CITY_COORDINATES,
  DEFAULT_CATEGORY_IMAGE,
  validateUserProfileInput,
  type LanguageCode,
  type MoroccanCity,
  type ServiceCategory,
  type UserProfileRecord,
  type UserRole,
  type VettedProvider,
} from '../utils/marketplace';
import type { Translations } from '../i18n/translations';
import type { SaveFullProviderCardInput } from './useMarketplaceAuth';
import { uploadMarketplacePhoto } from '../utils/storageUpload';
import {
  computeProviderProfileCompleteness,
  mapProfileSaveError,
} from '../utils/authHelpers';

export function useProviderCardStudio(params: {
  lang: LanguageCode;
  t: Translations;
  firebaseUser: User | null;
  userProfile: UserProfileRecord | null;
  signupRoleIntent: UserRole | null;
  ownProvider: VettedProvider | null;
  onSaveFullProviderCard: (input: SaveFullProviderCardInput) => Promise<void>;
  onPublished?: () => void;
}) {
  const {
    lang,
    t,
    firebaseUser,
    userProfile,
    signupRoleIntent,
    ownProvider,
    onSaveFullProviderCard,
    onPublished,
  } = params;
  const isAr = lang === 'ar';

  const [cardFullName, setCardFullName] = useState(
    ownProvider
      ? isAr
        ? ownProvider.fullNameAr
        : ownProvider.fullNameFr
      : userProfile?.fullName || firebaseUser?.displayName || ''
  );
  const [cardPhone, setCardPhone] = useState(ownProvider?.phone || userProfile?.phone || '+2126');
  const [cardCategory, setCardCategory] = useState<ServiceCategory>(
    ownProvider?.category ||
      (userProfile?.specialty && userProfile.specialty !== 'none'
        ? userProfile.specialty
        : 'Plomberie')
  );
  const [cardCity, setCardCity] = useState<MoroccanCity>(
    ownProvider?.location.city || userProfile?.city || 'Casablanca'
  );
  const [cardQuartier, setCardQuartier] = useState(
    ownProvider?.location.quartier || userProfile?.neighborhood || ''
  );
  const [cardCoords, setCardCoords] = useState<{ lat: number; lng: number } | null>(
    ownProvider ? { lat: ownProvider.location.lat, lng: ownProvider.location.lng } : null
  );
  const [isLocatingCard, setIsLocatingCard] = useState(false);
  const [cardExpYears, setCardExpYears] = useState<number>(ownProvider?.experienceYears ?? 5);
  const [cardDiploma, setCardDiploma] = useState(
    ownProvider ? (isAr ? ownProvider.diplomaAr : ownProvider.diplomaFr) : ''
  );
  const [cardHourlyRate, setCardHourlyRate] = useState<number>(
    ownProvider?.hourlyRateMAD ?? userProfile?.hourlyRateMad ?? 150
  );
  const [cardVisitFee, setCardVisitFee] = useState<number>(ownProvider?.fixedVisitFeeMAD ?? 70);
  const [cardAvailableNow, setCardAvailableNow] = useState<boolean>(
    ownProvider?.isAvailableNow ?? true
  );
  const [cardBio, setCardBio] = useState(
    ownProvider ? (isAr ? ownProvider.bioAr : ownProvider.bioFr) : userProfile?.bio || ''
  );
  const [cardSkills, setCardSkills] = useState<string[]>(
    ownProvider?.skills?.length ? ownProvider.skills : []
  );
  const [newSkillInput, setNewSkillInput] = useState('');
  const [cardPhotos, setCardPhotos] = useState<string[]>(
    ownProvider?.portfolioImages?.length
      ? ownProvider.portfolioImages
      : [DEFAULT_CATEGORY_IMAGE[cardCategory]]
  );
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [cardFieldErrors, setCardFieldErrors] = useState<Record<string, string>>({});
  const [cardNotice, setCardNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (ownProvider) {
      setCardFullName(isAr ? ownProvider.fullNameAr : ownProvider.fullNameFr);
      setCardPhone(ownProvider.phone);
      setCardCategory(ownProvider.category);
      setCardCity(ownProvider.location.city);
      setCardQuartier(ownProvider.location.quartier);
      setCardCoords({ lat: ownProvider.location.lat, lng: ownProvider.location.lng });
      setCardExpYears(ownProvider.experienceYears);
      setCardDiploma(isAr ? ownProvider.diplomaAr : ownProvider.diplomaFr);
      setCardHourlyRate(ownProvider.hourlyRateMAD);
      setCardVisitFee(ownProvider.fixedVisitFeeMAD);
      setCardAvailableNow(ownProvider.isAvailableNow);
      setCardBio(isAr ? ownProvider.bioAr : ownProvider.bioFr);
      setCardSkills(ownProvider.skills);
      setCardPhotos(ownProvider.portfolioImages);
    } else if (userProfile) {
      setCardFullName((prev) => prev || userProfile.fullName);
      setCardPhone((prev) => (prev === '+2126' || !prev ? userProfile.phone : prev));
      setCardCity(userProfile.city);
      setCardQuartier((prev) => prev || userProfile.neighborhood);
    }
  }, [ownProvider?.uid, userProfile?.uid, isAr]);

  const livePreviewProvider: VettedProvider = useMemo(() => {
    const cityRef = CITY_COORDINATES[cardCity] || CITY_COORDINATES.Casablanca;
    const safeName =
      cardFullName.trim() || (isAr ? 'الاسم الكامل للمعلم' : 'Votre Nom Maâlem');
    const safeBio =
      cardBio.trim() ||
      (isAr
        ? 'أضف نبذة عن خبرتك ومهاراتك لتظهر للزبناء...'
        : 'Présentez votre savoir-faire, vos outils et votre expérience...');
    return {
      uid: firebaseUser?.uid || 'preview',
      id: firebaseUser?.uid || 'preview',
      fullNameFr: safeName,
      fullNameAr: safeName,
      category: cardCategory,
      bioFr: safeBio,
      bioAr: safeBio,
      hourlyRateMAD: Math.max(50, Math.round(cardHourlyRate || 150)),
      fixedVisitFeeMAD: Math.max(0, Math.round(cardVisitFee || 0)),
      experienceYears: Math.max(0, Math.round(cardExpYears || 0)),
      skills: cardSkills.length > 0 ? cardSkills : [cardCategory],
      skillsAr: cardSkills.length > 0 ? cardSkills : [t.categories[cardCategory]],
      portfolioImages:
        cardPhotos.length > 0 ? cardPhotos : [DEFAULT_CATEGORY_IMAGE[cardCategory]],
      ratingAvg: ownProvider?.ratingAvg ?? 5.0,
      reviewCount: ownProvider?.reviewCount ?? 0,
      isAvailableNow: cardAvailableNow,
      verifiedBadge: ownProvider?.verifiedBadge ?? false,
      cinVerified: ownProvider?.cinVerified ?? false,
      cinNumberMasked: ownProvider?.cinNumberMasked ?? 'En attente',
      diplomaFr: cardDiploma.trim() || 'Qualification Professionnelle — Maroc',
      diplomaAr: cardDiploma.trim() || 'تأهيل مهني — المغرب',
      completedJobs: ownProvider?.completedJobs ?? 0,
      responseMinutes: ownProvider?.responseMinutes,
      phone: cardPhone || '',
      location: {
        lat: cardCoords?.lat ?? cityRef.lat,
        lng: cardCoords?.lng ?? cityRef.lng,
        city: cardCity,
        quartier: cardQuartier.trim() || (isAr ? 'الحي السكني' : 'Votre quartier'),
        quartierAr: cardQuartier.trim() || 'الحي السكني',
      },
      reviews: ownProvider?.reviews ?? [],
    };
  }, [
    firebaseUser?.uid,
    ownProvider,
    cardFullName,
    cardBio,
    cardCategory,
    cardHourlyRate,
    cardVisitFee,
    cardExpYears,
    cardSkills,
    cardPhotos,
    cardAvailableNow,
    cardDiploma,
    cardPhone,
    cardCoords,
    cardCity,
    cardQuartier,
    isAr,
    t.categories,
  ]);

  const completeness = useMemo(
    () => computeProviderProfileCompleteness(livePreviewProvider),
    [livePreviewProvider]
  );

  const handleUseGpsForCard = () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return;
    setIsLocatingCard(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingCard(false);
        setCardCoords({
          lat: Number(pos.coords.latitude.toFixed(4)),
          lng: Number(pos.coords.longitude.toFixed(4)),
        });
      },
      () => {
        setIsLocatingCard(false);
        const ref = CITY_COORDINATES[cardCity] || CITY_COORDINATES.Casablanca;
        setCardCoords({ lat: ref.lat, lng: ref.lng });
      },
      { timeout: 4000 }
    );
  };

  const handleAddSkill = (skillText?: string) => {
    const cleaned = (skillText ?? newSkillInput).trim().slice(0, 64);
    if (!cleaned || cardSkills.length >= 10) return;
    if (!cardSkills.includes(cleaned)) {
      setCardSkills((prev) => [...prev, cleaned]);
    }
    if (!skillText) setNewSkillInput('');
  };

  const handleCardPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser) return;
    setCardNotice(null);
    if (cardPhotos.length >= 6) {
      setCardNotice({
        type: 'error',
        text: isAr
          ? 'يمكنك إضافة 6 صور كحد أقصى.'
          : 'Maximum 6 photos autorisées sur votre fiche Maâlem.',
      });
      e.target.value = '';
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const res = await uploadMarketplacePhoto({
        file,
        scope: 'providers',
        entityId: firebaseUser.uid,
        userId: firebaseUser.uid,
        lang,
      });
      setCardPhotos((prev) => {
        const withoutDefaults = prev.filter(
          (url) => !Object.values(DEFAULT_CATEGORY_IMAGE).includes(url)
        );
        return [res.url, ...withoutDefaults].slice(0, 6);
      });
      setCardNotice({
        type: 'success',
        text: isAr
          ? 'تم رفع الصورة! اضغط «حفظ ونشر بطاقتي» لتثبيتها.'
          : 'Photo téléversée ! Cliquez sur « Enregistrer ma Fiche Maâlem » pour publier.',
      });
    } catch (err) {
      setCardNotice({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : isAr
            ? 'تعذر رفع الصورة.'
            : 'Impossible de téléverser la photo.',
      });
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSaveCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCardNotice(null);
    const effectiveRole: 'provider' | 'both' =
      userProfile?.role === 'both' || signupRoleIntent === 'both' ? 'both' : 'provider';

    const check = validateUserProfileInput({
      role: effectiveRole,
      fullName: cardFullName,
      phone: cardPhone,
      city: cardCity,
      neighborhood: cardQuartier,
      languagePref: lang,
      specialty: cardCategory,
      hourlyRateMad: cardHourlyRate,
      bio: cardBio,
    });

    const nextErrors: Record<string, string> = { ...(check.errors as Record<string, string>) };
    if (cardBio.trim().length < 10) {
      nextErrors.bio = isAr
        ? 'يرجى كتابة نبذة مهنية لا تقل عن 10 أحرف.'
        : 'Rédigez une présentation d’au moins 10 caractères.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setCardFieldErrors(nextErrors);
      return;
    }

    setCardFieldErrors({});
    setIsSavingCard(true);
    try {
      await onSaveFullProviderCard({
        role: effectiveRole,
        fullName: cardFullName.trim(),
        phone: check.normalizedPhone,
        city: cardCity,
        neighborhood: cardQuartier.trim(),
        lat: cardCoords?.lat,
        lng: cardCoords?.lng,
        category: cardCategory,
        experienceYears: cardExpYears,
        diploma: cardDiploma.trim(),
        hourlyRateMAD: cardHourlyRate,
        fixedVisitFeeMAD: cardVisitFee,
        isAvailableNow: cardAvailableNow,
        bio: cardBio.trim(),
        skills: cardSkills.length > 0 ? cardSkills : [cardCategory],
        portfolioImages:
          cardPhotos.length > 0 ? cardPhotos : [DEFAULT_CATEGORY_IMAGE[cardCategory]],
        languagePref: lang,
      });
      setCardPhone(check.normalizedPhone);
      onPublished?.();
      setCardNotice({
        type: 'success',
        text: isAr
          ? 'تم حفظ ونشر بطاقة المعلم الخاصة بك بنجاح! يمكنك الآن تقديم عروضك على طلبات الزبناء.'
          : 'Votre Fiche Maâlem est publiée ! Vous pouvez maintenant répondre aux offres clients.',
      });
    } catch (err) {
      setCardNotice({
        type: 'error',
        text: mapProfileSaveError(err, lang),
      });
    } finally {
      setIsSavingCard(false);
    }
  };

  return {
    cardFullName,
    setCardFullName,
    cardPhone,
    setCardPhone,
    cardCategory,
    setCardCategory,
    cardCity,
    setCardCity,
    cardQuartier,
    setCardQuartier,
    isLocatingCard,
    cardExpYears,
    setCardExpYears,
    cardDiploma,
    setCardDiploma,
    cardHourlyRate,
    setCardHourlyRate,
    cardVisitFee,
    setCardVisitFee,
    cardAvailableNow,
    setCardAvailableNow,
    cardBio,
    setCardBio,
    cardSkills,
    setCardSkills,
    newSkillInput,
    setNewSkillInput,
    cardPhotos,
    setCardPhotos,
    isUploadingPhoto,
    isSavingCard,
    cardFieldErrors,
    cardNotice,
    livePreviewProvider,
    completeness,
    handleUseGpsForCard,
    handleAddSkill,
    handleCardPhotoUpload,
    handleSaveCardSubmit,
  };
}
