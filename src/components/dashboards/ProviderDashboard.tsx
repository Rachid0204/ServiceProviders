import React, { useMemo, useState, useEffect } from 'react';
import {
  Wrench,
  CheckCircle2,
  XCircle,
  CreditCard,
  Banknote,
  MapPin,
  Star,
  MessageSquare,
  MessageCircle,
  Play,
  ShieldCheck,
  FileText,
  AlertCircle,
  Clock,
  Camera,
  Trash2,
  Plus,
  Wallet,
  Building2,
  LogIn,
  Sparkles,
  Briefcase,
  Search,
  Zap,
  Send,
  Navigation,
  Award,
  IdCard,
  Filter,
  Calendar,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  limit,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, reportFirestoreError, OperationType } from '../../firebase';
import {
  CATEGORY_SUGGESTED_SKILLS,
  CITY_COORDINATES,
  DEFAULT_CATEGORY_IMAGE,
  MOROCCAN_CITIES,
  SERVICE_CATEGORIES,
  calculateEscrowSplit,
  computeProviderEarningsBreakdown,
  computeQuotationTotals,
  formatMadCurrency,
  getDefaultQuoteValidUntilIso,
  getTodayIsoDate,
  buildWhatsAppUrl,
  canTransitionBookingStatus,
  filterJobPosts,
  validateJobProposalInput,
  validateUserProfileInput,
  type BookingRecord,
  type BookingStatus,
  type JobPostRecord,
  type JobProposalRecord,
  type JobUrgency,
  type LanguageCode,
  type MoroccanCity,
  type PaymentStatus,
  type ServiceCategory,
  type UserProfileRecord,
  type UserRole,
  type VettedProvider,
} from '../../utils/marketplace';
import type { Translations } from '../../i18n/translations';
import type { SystemSettingsRecord } from '../../utils/adminMetrics';
import type { SaveFullProviderCardInput } from '../../hooks/useMarketplaceAuth';
import type { SubmitProposalPayload } from '../../hooks/useJobPosts';
import { uploadMarketplacePhoto } from '../../utils/storageUpload';
import {
  computeProviderProfileCompleteness,
  isVerifiedAuthUser,
  mapProfileSaveError,
} from '../../utils/authHelpers';
import { ProviderCard } from '../ProviderCard';
import { ProviderServicesManager } from './ProviderServicesManager';
import { ProviderVerificationPanel } from './ProviderVerificationPanel';
import { ProviderAvailabilityCalendar } from './ProviderAvailabilityCalendar';

interface ProviderWithdrawalItem {
  id: string;
  bankName: string;
  ribMasked: string;
  amountMad: number;
  status: 'pending' | 'approved' | 'frozen' | 'rejected';
  adminNote?: string;
  createdAtIso: string;
}

export type ProviderTab =
  | 'jobs'
  | 'missions'
  | 'card'
  | 'services'
  | 'calendar'
  | 'verification'
  | 'earnings';

interface ProviderDashboardProps {
  lang: LanguageCode;
  t: Translations;
  firebaseUser: User | null;
  userProfile: UserProfileRecord | null;
  signupRoleIntent: UserRole | null;
  ownProvider: VettedProvider | null;
  systemSettings: SystemSettingsRecord;
  activeTab?: ProviderTab;
  onChangeTab?: (tab: ProviderTab) => void;
  bookingActionError: string | null;
  onDismissError: () => void;
  bookings: BookingRecord[];
  openJobPosts: JobPostRecord[];
  myProposalsByJobId: Record<string, JobProposalRecord>;
  jobActionError: string | null;
  onDismissJobError: () => void;
  onSubmitJobProposal: (job: JobPostRecord, payload: SubmitProposalPayload) => Promise<void>;
  onWithdrawJobProposal: (jobId: string) => Promise<void>;
  onToggleProviderAvailability: (provider: VettedProvider) => void;
  onSaveFullProviderCard: (input: SaveFullProviderCardInput) => Promise<void>;
  onOpenAuth: () => void;
  onOpenChat: (booking: BookingRecord) => void;
  onOpenBookingDetail: (booking: BookingRecord) => void;
  onOpenCancel: (booking: BookingRecord) => void;
  onUpdateBookingStatus: (
    bookingId: string,
    nextStatus: BookingStatus,
    actorRole: UserRole
  ) => void;
}

type MissionFilter = 'all' | 'pending' | 'active' | 'completed' | 'cancelled';

const MOROCCAN_BANKS = [
  'CIH Bank',
  'Attijariwafa Bank',
  'Banque Populaire',
  'Bank of Africa (BMCE)',
  'Société Générale Maroc',
  'Crédit Agricole du Maroc',
  'Al Barid Bank',
  'CFG Bank',
];

function formatWithdrawalDate(ts: unknown): string {
  if (ts && typeof ts === 'object' && 'toDate' in ts) {
    try {
      return (ts as Timestamp).toDate().toISOString().slice(0, 10);
    } catch {
      // fallback
    }
  }
  return new Date().toISOString().slice(0, 10);
}

export const ProviderDashboard: React.FC<ProviderDashboardProps> = ({
  lang,
  t,
  firebaseUser,
  userProfile,
  signupRoleIntent,
  ownProvider,
  systemSettings,
  activeTab: controlledTab,
  onChangeTab,
  bookingActionError,
  onDismissError,
  bookings,
  openJobPosts,
  myProposalsByJobId,
  jobActionError,
  onDismissJobError,
  onSubmitJobProposal,
  onWithdrawJobProposal,
  onToggleProviderAvailability,
  onSaveFullProviderCard,
  onOpenAuth,
  onOpenChat,
  onOpenBookingDetail,
  onOpenCancel,
  onUpdateBookingStatus,
}) => {
  const isAr = lang === 'ar';
  const [internalTab, setInternalTab] = useState<ProviderTab>(ownProvider ? 'jobs' : 'card');
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = (next: ProviderTab) => {
    setInternalTab(next);
    onChangeTab?.(next);
  };

  // Switch automatically to Card Studio if new Maâlem has no published provider card yet
  const [upgradingFromClient, setUpgradingFromClient] = useState(false);

  // Job Board filters
  const [jobSearch, setJobSearch] = useState('');
  const [jobCategoryFilter, setJobCategoryFilter] = useState<ServiceCategory | 'ALL'>('ALL');
  const [jobCityFilter, setJobCityFilter] = useState<MoroccanCity | 'ALL'>('ALL');
  const [jobQuartierFilter, setJobQuartierFilter] = useState('');
  const [jobUrgencyFilter, setJobUrgencyFilter] = useState<JobUrgency | 'ALL'>('ALL');
  const [jobMinBudget, setJobMinBudget] = useState<number>(0);

  // Inline itemized quotation composer state
  const [quotingJobId, setQuotingJobId] = useState<string | null>(null);
  const [quoteLaborMad, setQuoteLaborMad] = useState<number>(200);
  const [quoteMaterialsMad, setQuoteMaterialsMad] = useState<number>(0);
  const [quoteValidUntil, setQuoteValidUntil] = useState<string>(() =>
    getDefaultQuoteValidUntilIso(7)
  );
  const [quoteWarranty, setQuoteWarranty] = useState('');
  const [quoteDuration, setQuoteDuration] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [quoteErrors, setQuoteErrors] = useState<Record<string, string>>({});
  const [quoteSubmitError, setQuoteSubmitError] = useState<string | null>(null);
  const [isSendingQuote, setIsSendingQuote] = useState(false);

  // Missions filter
  const [missionFilter, setMissionFilter] = useState<MissionFilter>('all');

  // Unified Maâlem Card Studio state (complete card setup: name, phone, location+GPS, category, experience, diploma, rates, bio, skills, photo upload)
  const [cardFullName, setCardFullName] = useState(
    ownProvider
      ? isAr
        ? ownProvider.fullNameAr
        : ownProvider.fullNameFr
      : userProfile?.fullName || firebaseUser?.displayName || ''
  );
  const [cardPhone, setCardPhone] = useState(
    ownProvider?.phone || userProfile?.phone || '+2126'
  );
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

  // Withdrawals state (live Firestore scoped strictly to providerId === firebaseUser.uid)
  const [withdrawals, setWithdrawals] = useState<ProviderWithdrawalItem[]>([]);
  const [bankName, setBankName] = useState(MOROCCAN_BANKS[0]);
  const [ribInput, setRibInput] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState<number>(
    Math.max(100, systemSettings.minWithdrawalMad)
  );
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  const [withdrawalNotice, setWithdrawalNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Sync Card Studio form when ownProvider or userProfile hydrates
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

  // Real-time listener on authenticated provider's own withdrawal requests
  useEffect(() => {
    if (!firebaseUser || !ownProvider || !isVerifiedAuthUser(firebaseUser)) {
      setWithdrawals([]);
      return;
    }
    const q = query(
      collection(db, 'withdrawals'),
      where('providerId', '==', firebaseUser.uid),
      limit(50)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: ProviderWithdrawalItem[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              bankName: String(data.bankName || ''),
              ribMasked: String(data.ribMasked || ''),
              amountMad: Number(data.amountMad || 0),
              status: (data.status as ProviderWithdrawalItem['status']) || 'pending',
              adminNote: data.adminNote ? String(data.adminNote) : undefined,
              createdAtIso: formatWithdrawalDate(data.createdAt),
            };
          })
          .sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
        setWithdrawals(items);
      },
      (err) => {
        reportFirestoreError(err, OperationType.LIST, 'withdrawals');
      }
    );
    return () => unsub();
  }, [firebaseUser, ownProvider?.uid]);

  // Strictly scope bookings to providerId === firebaseUser.uid
  const providerBookings = useMemo(() => {
    if (!firebaseUser) return [];
    return bookings.filter((b) => b.providerId === firebaseUser.uid);
  }, [firebaseUser, bookings]);

  // Open client jobs excluding any posted by this user themselves (relevant for double accounts)
  const availableClientJobs = useMemo(() => {
    if (!firebaseUser) return [];
    const othersJobs = openJobPosts.filter((j) => j.clientId !== firebaseUser.uid);
    return filterJobPosts(othersJobs, {
      category: jobCategoryFilter,
      city: jobCityFilter,
      quartier: jobQuartierFilter,
      urgency: jobUrgencyFilter,
      minBudgetMad: jobMinBudget > 0 ? jobMinBudget : undefined,
      searchQuery: jobSearch,
    });
  }, [
    firebaseUser,
    openJobPosts,
    jobCategoryFilter,
    jobCityFilter,
    jobQuartierFilter,
    jobUrgencyFilter,
    jobMinBudget,
    jobSearch,
  ]);

  const metrics = useMemo(() => {
    let pendingCount = 0;
    let activeCount = 0;
    let completedCount = 0;

    for (const b of providerBookings) {
      if (b.status === 'pending') pendingCount++;
      if (b.status === 'accepted' || b.status === 'in_progress') activeCount++;
      if (b.status === 'completed' || b.status === 'reviewed') completedCount++;
    }

    const earnings = computeProviderEarningsBreakdown({
      bookings: providerBookings,
      withdrawals,
      platformFeePct: systemSettings.platformFeePct,
      minWithdrawalMad: systemSettings.minWithdrawalMad,
      cmiEscrowEnabled: false,
    });

    return {
      pendingCount,
      activeCount,
      completedCount,
      ...earnings,
    };
  }, [providerBookings, withdrawals, systemSettings.platformFeePct, systemSettings.minWithdrawalMad]);

  const withdrawnTotalMad = useMemo(
    () =>
      withdrawals
        .filter((w) => w.status === 'pending' || w.status === 'approved')
        .reduce((sum, w) => sum + w.amountMad, 0),
    [withdrawals]
  );

  const filteredMissions = useMemo(() => {
    if (missionFilter === 'all') return providerBookings;
    if (missionFilter === 'pending') return providerBookings.filter((b) => b.status === 'pending');
    if (missionFilter === 'active') {
      return providerBookings.filter(
        (b) => b.status === 'accepted' || b.status === 'in_progress'
      );
    }
    if (missionFilter === 'completed') {
      return providerBookings.filter(
        (b) => b.status === 'completed' || b.status === 'reviewed'
      );
    }
    return providerBookings.filter((b) => b.status === 'cancelled');
  }, [providerBookings, missionFilter]);

  // Live preview VettedProvider object synced with Card Studio inputs
  const livePreviewProvider: VettedProvider = useMemo(() => {
    const cityRef = CITY_COORDINATES[cardCity] || CITY_COORDINATES.Casablanca;
    const safeName =
      cardFullName.trim() ||
      (isAr ? 'الاسم الكامل للمعلم' : 'Votre Nom Maâlem');
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
      responseMinutes: ownProvider?.responseMinutes ?? 20,
      phone: cardPhone || '+212661000000',
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

  const getStatusLabel = (status: BookingStatus): string => {
    switch (status) {
      case 'pending':
        return t.statusPending;
      case 'accepted':
        return t.statusAccepted;
      case 'in_progress':
        return t.statusInProgress;
      case 'completed':
        return t.statusCompleted;
      case 'reviewed':
        return t.statusReviewed;
      case 'cancelled':
        return t.statusCancelled;
    }
  };

  const getPaymentStatusLabel = (status?: PaymentStatus): string => {
    if (status === 'paid') return isAr ? 'مدفوع' : 'Réglé';
    if (status === 'refunded') return isAr ? 'مسترجع للزبون' : 'Remboursé client';
    if (status === 'disputed_split') return isAr ? 'تسوية 50/50' : 'Arbitrage 50/50';
    if (status === 'escrow_held') return isAr ? 'ضمان CMI محجوز' : 'Séquestre CMI';
    return isAr ? 'الدفع عند الإنجاز' : 'Paiement sur place';
  };

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
      // Replace default placeholder automatically when uploading first real photo
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
      setUpgradingFromClient(false);
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

  const handleOpenQuoteComposer = (job: JobPostRecord) => {
    setQuotingJobId(job.id);
    setQuoteLaborMad(job.budgetMad);
    setQuoteMaterialsMad(0);
    setQuoteValidUntil(getDefaultQuoteValidUntilIso(7));
    setQuoteWarranty(isAr ? 'ضمان 30 يوماً على اليد العاملة' : 'Garantie 30 jours main-d’œuvre');
    setQuoteDuration(isAr ? 'متاح خلال 24 ساعة · ساعتين عمل' : 'Disponible sous 24h · ~2h');
    setQuoteMessage('');
    setQuoteErrors({});
    setQuoteSubmitError(null);
  };

  const handleSendQuote = async (e: React.FormEvent, job: JobPostRecord) => {
    e.preventDefault();
    setQuoteSubmitError(null);
    const totals = computeQuotationTotals(quoteLaborMad, quoteMaterialsMad);
    const check = validateJobProposalInput(
      {
        proposedPriceMad: totals.totalMad,
        estimatedDuration: quoteDuration,
        message: quoteMessage,
      },
      lang
    );
    if (!check.valid) {
      setQuoteErrors(check.errors as Record<string, string>);
      return;
    }
    setQuoteErrors({});
    setIsSendingQuote(true);
    try {
      await onSubmitJobProposal(job, {
        proposedPriceMad: totals.totalMad,
        laborCostMad: totals.laborCostMad,
        materialsCostMad: totals.materialsCostMad,
        validUntilIso: quoteValidUntil || getDefaultQuoteValidUntilIso(7),
        warrantyNote: quoteWarranty.trim() || undefined,
        estimatedDuration: quoteDuration.trim(),
        message: quoteMessage.trim(),
      });
      setQuotingJobId(null);
      setQuoteMessage('');
    } catch (err) {
      setQuoteSubmitError(mapProfileSaveError(err, lang));
    } finally {
      setIsSendingQuote(false);
    }
  };

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !ownProvider) return;
    setWithdrawalNotice(null);

    if (metrics.hasPendingWithdrawal) {
      setWithdrawalNotice({
        type: 'error',
        text: isAr
          ? 'لديك طلب سحب بنكي قيد المعالجة بالفعل. يرجى انتظار معالجته قبل إرسال طلب جديد.'
          : 'Une demande de virement est déjà en cours de traitement.',
      });
      return;
    }

    if (systemSettings.requireKycForEscrowPayout && !ownProvider.verifiedBadge) {
      setWithdrawalNotice({
        type: 'error',
        text: isAr
          ? 'تتطلب طلبات السحب البنكي توثيق البطاقة الوطنية (CIN) أولاً من طرف الإدارة.'
          : 'La vérification CIN de votre profil est requise avant de demander un virement RIB.',
      });
      return;
    }

    const minAllowed = Math.max(100, systemSettings.minWithdrawalMad);
    const roundedAmount = Math.round(withdrawAmount);

    if (
      !metrics.canRequestWithdrawal ||
      metrics.platformHeldWithdrawableMad < minAllowed ||
      roundedAmount > metrics.platformHeldWithdrawableMad
    ) {
      setWithdrawalNotice({
        type: 'error',
        text: isAr
          ? 'الأرباح النقدية (الدفع عند انتهاء الخدمة) تُحصّل مباشرة من الزبون ولا تمر عبر حساب المنصة. رصيدك المحتفظ به لدى المنصة والقابل للسحب البنكي هو 0 د.م.'
          : 'Les paiements en espèces (COD) sont encaissés directement auprès du client. Votre solde détenu par la plateforme disponible pour virement est de 0 DH.',
      });
      return;
    }

    if (Number.isNaN(roundedAmount) || roundedAmount < minAllowed || roundedAmount > 100000) {
      setWithdrawalNotice({
        type: 'error',
        text: isAr
          ? `يجب أن يكون مبلغ السحب بين ${minAllowed} و 100000 د.م.`
          : `Le montant du retrait doit être compris entre ${minAllowed} DH et 100 000 DH.`,
      });
      return;
    }

    const cleanRib = ribInput.replace(/\s+/g, '');
    if (cleanRib.length < 6) {
      setWithdrawalNotice({
        type: 'error',
        text: isAr
          ? 'يرجى إدخال رقم RIB بنكي صالح (على الأقل آخر 6 أرقام).'
          : 'Veuillez saisir un RIB bancaire valide (ou les 6+ derniers chiffres).',
      });
      return;
    }

    const maskedRib =
      cleanRib.length > 10
        ? `${cleanRib.slice(0, 4)} •••• •••• ${cleanRib.slice(-4)}`
        : `•••• ${cleanRib.slice(-6)}`;

    const withdrawalId = `wd_${firebaseUser.uid}`;
    setIsSubmittingWithdrawal(true);
    try {
      await setDoc(doc(db, 'withdrawals', withdrawalId), {
        providerId: firebaseUser.uid,
        providerName: isAr ? ownProvider.fullNameAr : ownProvider.fullNameFr,
        city: ownProvider.location.city,
        bankName,
        ribMasked: maskedRib.slice(0, 40),
        amountMad: roundedAmount,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setRibInput('');
      setWithdrawalNotice({
        type: 'success',
        text: isAr
          ? 'تم إرسال طلب السحب البنكي بنجاح وسيتم معالجته من طرف الإدارة.'
          : 'Demande de retrait RIB envoyée avec succès. Elle sera validée sous 24–48h.',
      });
    } catch (err) {
      setWithdrawalNotice({
        type: 'error',
        text: mapProfileSaveError(err, lang),
      });
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  // Gate 1: Unauthenticated visitor
  if (!firebaseUser) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-5 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
            <Wrench className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-slate-900">
              {isAr ? 'فضاء المعلمين ومقدمي الخدمات' : 'Espace Maâlem & Prestataires'}
            </h1>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              {isAr
                ? 'سجّل الدخول لتصفح طلبات الزبناء المنشورة، إعداد بطاقتك المهنية، وإدارة مهامك وأرباحك.'
                : 'Connectez-vous pour consulter les offres publiées par les clients, configurer votre Fiche Maâlem et gérer vos missions.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAuth}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>{isAr ? 'تسجيل الدخول / إنشاء حساب معلم' : 'Connexion / Devenir Maâlem'}</span>
          </button>
        </div>
      </div>
    );
  }

  // Gate 2: Existing Client-only user who hasn't clicked "Activer" yet
  const isExistingClientOnly =
    userProfile?.role === 'client' && !ownProvider && !upgradingFromClient;

  if (isExistingClientOnly) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-5 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-900">
              {isAr ? 'فعّل فضاء المعلم الخاص بك' : 'Activez votre Espace Maâlem'}
            </h1>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              {isAr
                ? 'حسابك الحالي مسجل كزبون فقط. يمكنك إنشاء بطاقتك كمعلم الآن لتلقي طلبات الزبناء والاحتفاظ أيضاً بفضاء الزبون (حساب مزدوج).'
                : 'Votre compte est actuellement configuré en tant que Client. Créez votre Fiche Maâlem en 2 minutes pour accéder aux offres clients.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setUpgradingFromClient(true);
              setActiveTab('card');
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors cursor-pointer"
          >
            <Wrench className="w-4 h-4" />
            <span>{isAr ? 'إعداد بطاقتي كمعلم الآن' : 'Créer ma Fiche Maâlem maintenant'}</span>
          </button>
        </div>
      </div>
    );
  }

  const effectiveTab: ProviderTab =
    !ownProvider &&
    activeTab !== 'services' &&
    activeTab !== 'calendar' &&
    activeTab !== 'verification'
      ? 'card'
      : activeTab;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 lg:py-9 space-y-6">
      {/* Compact Maâlem Workspace Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-start gap-4">
          <img
            src={
              ownProvider?.portfolioImages[0] ||
              cardPhotos[0] ||
              DEFAULT_CATEGORY_IMAGE[cardCategory]
            }
            alt={cardFullName || 'Maâlem'}
            className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                {ownProvider
                  ? isAr
                    ? ownProvider.fullNameAr
                    : ownProvider.fullNameFr
                  : isAr
                  ? 'إعداد بطاقة المعلم الجديدة'
                  : 'Configuration de votre Fiche Maâlem'}
              </h1>
              {ownProvider?.verifiedBadge ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{t.verifiedCinLabel}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {ownProvider
                      ? isAr
                        ? 'توثيق CIN قيد المراجعة'
                        : 'CIN en cours de vérification'
                      : isAr
                      ? 'الخطوة الأخيرة قبل النشر'
                      : 'Complétez votre fiche pour commencer'}
                  </span>
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-700 tabular-nums">
                {isAr ? `اكتمال البطاقة: ${completeness.percent}%` : `Fiche à ${completeness.percent}%`}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {ownProvider ? (
                <>
                  {t.categories[ownProvider.category]} · {t.cities[ownProvider.location.city]} (
                  {ownProvider.location.quartier}) ·{' '}
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {formatMadCurrency(ownProvider.hourlyRateMAD, lang)}/h
                  </span>
                </>
              ) : isAr ? (
                'أكمل معلوماتك (الاسم، المدينة، الخبرة، والصورة) لتظهر بطاقتك للزبناء وتبدأ بتقديم العروض.'
              ) : (
                'Renseignez votre nom, localisation, expérience et photo pour publier votre carte et répondre aux offres clients.'
              )}
            </p>
          </div>
        </div>

        {ownProvider && (
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2">
              <span className="text-xs font-medium text-slate-700">
                {t.providerAvailabilityLabel}:
              </span>
              <button
                type="button"
                onClick={() => onToggleProviderAvailability(ownProvider)}
                aria-pressed={ownProvider.isAvailableNow}
                className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  ownProvider.isAvailableNow
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                {ownProvider.isAvailableNow ? t.availableNowText : t.busyScheduledText}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Maâlem Navigation Tabs (No Explore Other Maâlems!) */}
      <div
        role="tablist"
        aria-label="Maâlem Dashboard Tabs"
        className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3"
      >
        {(
          [
            {
              id: 'jobs' as const,
              icon: Briefcase,
              disabled: !ownProvider,
              badge: openJobPosts.filter((j) => j.clientId !== firebaseUser.uid).length,
              labelFr: 'Offres Clients',
              labelAr: 'طلبات الزبناء المنشورة',
            },
            {
              id: 'missions' as const,
              icon: Clock,
              disabled: !ownProvider,
              badge: metrics.pendingCount,
              labelFr: `Mes Missions (${providerBookings.length})`,
              labelAr: `مهامي (${providerBookings.length})`,
            },
            {
              id: 'card' as const,
              icon: IdCard,
              disabled: false,
              badge: completeness.percent < 100 ? 1 : 0,
              labelFr: 'Ma Fiche Maâlem',
              labelAr: 'بطاقتي المهنية',
            },
            {
              id: 'services' as const,
              icon: Wrench,
              disabled: false,
              badge: 0,
              labelFr: 'Mes Services',
              labelAr: 'خدماتي',
            },
            {
              id: 'calendar' as const,
              icon: Calendar,
              disabled: false,
              badge: 0,
              labelFr: 'Mon Agenda',
              labelAr: 'جدول المواعيد',
            },
            {
              id: 'verification' as const,
              icon: ShieldCheck,
              disabled: false,
              badge: ownProvider?.verifiedBadge ? 0 : 1,
              labelFr: 'Vérification CIN',
              labelAr: 'توثيق البطاقة الوطنية',
            },
            {
              id: 'earnings' as const,
              icon: Wallet,
              disabled: !ownProvider,
              badge: 0,
              labelFr: 'Revenus & Retraits',
              labelAr: 'الأرباح والسحب',
            },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = effectiveTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              disabled={tab.disabled}
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
                tab.disabled
                  ? 'opacity-45 cursor-not-allowed bg-slate-100 text-slate-500'
                  : active
                  ? 'bg-emerald-700 text-white shadow-2xs cursor-pointer'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{isAr ? tab.labelAr : tab.labelFr}</span>
              {tab.id === 'jobs' && tab.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full tabular-nums ${
                    active ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
              {tab.id === 'missions' && tab.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full tabular-nums ${
                    active ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Errors */}
      {(bookingActionError || jobActionError) && (
        <div
          role="alert"
          className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-900"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
            <span>{bookingActionError || jobActionError}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onDismissError();
              onDismissJobError();
            }}
            className="text-rose-700 font-semibold hover:underline cursor-pointer shrink-0"
          >
            {t.closeBtn}
          </button>
        </div>
      )}

      {/* TAB 1: OPEN CLIENT JOB BOARD WITH FILTERS */}
      {effectiveTab === 'jobs' && ownProvider && (
        <div className="space-y-5">
          {/* Job Board Filter Panel */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Filter className="w-4 h-4 text-emerald-700" />
                <span>
                  {isAr
                    ? 'تصفية طلبات الزبناء المنشورة'
                    : 'Filtrer les besoins publiés par les clients'}
                </span>
              </div>

              {/* Quick 1-click presets for the Maâlem's own trade & city */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setJobCategoryFilter((prev) =>
                      prev === ownProvider.category ? 'ALL' : ownProvider.category
                    )
                  }
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border cursor-pointer transition-colors ${
                    jobCategoryFilter === ownProvider.category
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  {isAr
                    ? `تخصصي (${t.categories[ownProvider.category]})`
                    : `Mon métier (${t.categories[ownProvider.category]})`}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setJobCityFilter((prev) =>
                      prev === ownProvider.location.city ? 'ALL' : ownProvider.location.city
                    )
                  }
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border cursor-pointer transition-colors ${
                    jobCityFilter === ownProvider.location.city
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {isAr
                    ? `مدينتي (${t.cities[ownProvider.location.city]})`
                    : `Ma ville (${t.cities[ownProvider.location.city]})`}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setJobUrgencyFilter((prev) => (prev === 'urgent' ? 'ALL' : 'urgent'))
                  }
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg border cursor-pointer transition-colors ${
                    jobUrgencyFilter === 'urgent'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  <span>{isAr ? 'مستعجل' : 'Urgent 24h'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-3 relative">
                <Search className="w-4 h-4 text-slate-400 absolute top-2.5 start-3 pointer-events-none" />
                <input
                  type="search"
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                  placeholder={isAr ? 'بحث في الطلبات...' : 'Mot-clé, titre, réf...'}
                  className="w-full ps-9 pe-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="lg:col-span-2">
                <select
                  aria-label={t.filterAllCategories}
                  value={jobCategoryFilter}
                  onChange={(e) =>
                    setJobCategoryFilter(e.target.value as ServiceCategory | 'ALL')
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="ALL">{t.filterAllCategories}</option>
                  {SERVICE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t.categories[c]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <select
                  aria-label={t.filterAllCities}
                  value={jobCityFilter}
                  onChange={(e) => setJobCityFilter(e.target.value as MoroccanCity | 'ALL')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="ALL">{t.filterAllCities}</option>
                  {MOROCCAN_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {t.cities[c]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <input
                  type="text"
                  value={jobQuartierFilter}
                  onChange={(e) => setJobQuartierFilter(e.target.value)}
                  placeholder={t.quartierFilterPlaceholder}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="lg:col-span-2">
                <select
                  aria-label={isAr ? 'الاستعجال' : 'Urgence'}
                  value={jobUrgencyFilter}
                  onChange={(e) => setJobUrgencyFilter(e.target.value as JobUrgency | 'ALL')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="ALL">
                    {isAr ? 'جميع الأولويات' : 'Toutes urgences'}
                  </option>
                  <option value="urgent">{isAr ? 'مستعجل (24 ساعة)' : 'Urgent (24h)'}</option>
                  <option value="this_week">{isAr ? 'هذا الأسبوع' : 'Cette semaine'}</option>
                  <option value="flexible">{isAr ? 'مرن' : 'Flexible'}</option>
                </select>
              </div>

              <div className="lg:col-span-1">
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={jobMinBudget || ''}
                  onChange={(e) => setJobMinBudget(Number(e.target.value) || 0)}
                  placeholder={isAr ? 'أدنى د.م' : 'Min DH'}
                  aria-label={isAr ? 'الحد الأدنى للميزانية' : 'Budget minimum DH'}
                  className="w-full px-2.5 py-2 text-xs font-mono-tabular bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
              <span>
                <strong className="text-slate-900 tabular-nums">
                  {availableClientJobs.length}
                </strong>{' '}
                {isAr ? 'طلب زبون مفتوح للعروض' : 'offre(s) client ouverte(s) aux devis'}
              </span>
              {(jobSearch ||
                jobCategoryFilter !== 'ALL' ||
                jobCityFilter !== 'ALL' ||
                jobQuartierFilter ||
                jobUrgencyFilter !== 'ALL' ||
                jobMinBudget > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setJobSearch('');
                    setJobCategoryFilter('ALL');
                    setJobCityFilter('ALL');
                    setJobQuartierFilter('');
                    setJobUrgencyFilter('ALL');
                    setJobMinBudget(0);
                  }}
                  className="text-emerald-700 font-semibold hover:underline cursor-pointer"
                >
                  {t.resetFilters}
                </button>
              )}
            </div>
          </div>

          {/* Open Job Cards List */}
          {availableClientJobs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-2.5">
              <Briefcase className="w-8 h-8 text-slate-400 mx-auto" />
              <h2 className="text-base font-bold text-slate-900">
                {isAr
                  ? 'لا توجد طلبات زبناء مطابقة لهذه الفلاتر حالياً'
                  : 'Aucune offre client ne correspond à vos filtres'}
              </h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                {isAr
                  ? 'جرّب إزالة بعض الفلاتر أو توسيع البحث لمدن أخرى. تظهر الطلبات الجديدة هنا فور نشرها من طرف الزبناء.'
                  : 'Essayez d’élargir vos filtres (toutes villes / métiers). Les nouveaux besoins publiés par les clients apparaissent ici en temps réel.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {availableClientJobs.map((job) => {
                const existingProposal = myProposalsByJobId[job.id];
                const isQuoting = quotingJobId === job.id;

                return (
                  <div
                    key={job.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-2xs"
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            {t.categories[job.category]}
                          </span>
                          {job.urgency === 'urgent' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <Zap className="w-3 h-3" />
                              <span>{isAr ? 'مستعجل' : 'Urgent 24h'}</span>
                            </span>
                          )}
                          <span className="font-mono-tabular text-slate-400">#{job.jobRef}</span>
                        </div>
                        <span className="text-base font-bold tabular-nums text-emerald-700">
                          {formatMadCurrency(job.budgetMad, lang)}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900">{job.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-amber-600" />
                            <span>
                              {t.cities[job.city]} · {job.neighborhood}
                            </span>
                          </span>
                          <span>·</span>
                          <span className="font-mono-tabular">
                            {job.preferredDate} ({job.preferredTimeSlot})
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed">{job.description}</p>

                      {job.problemPhotoUrl && (
                        <img
                          src={job.problemPhotoUrl}
                          alt={job.title}
                          className="w-full h-40 object-cover rounded-xl border border-slate-200"
                        />
                      )}
                    </div>

                    {/* Footer: Client name + Proposal Action or Inline Quote Form */}
                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-slate-600">
                          {isAr ? 'الزبون:' : 'Client :'}{' '}
                          <strong className="text-slate-900">
                            {job.clientName.split(' ')[0]}
                          </strong>{' '}
                          · {job.proposalCount}{' '}
                          {isAr ? 'عروض مقدمة' : 'devis déjà envoyés'}
                        </span>

                        {existingProposal && existingProposal.status !== 'withdrawn' ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>
                                {isAr
                                  ? `تم إرسال عرضك (${formatMadCurrency(existingProposal.proposedPriceMad, lang)})`
                                  : `Devis envoyé (${formatMadCurrency(existingProposal.proposedPriceMad, lang)})`}
                              </span>
                            </span>
                            {existingProposal.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => {
                                  void onWithdrawJobProposal(job.id);
                                }}
                                className="text-rose-700 hover:underline font-medium cursor-pointer"
                              >
                                {isAr ? 'سحب' : 'Retirer'}
                              </button>
                            )}
                          </div>
                        ) : !isQuoting ? (
                          <button
                            type="button"
                            onClick={() => handleOpenQuoteComposer(job)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{isAr ? 'تقديم عرض / سعر' : 'Proposer un devis'}</span>
                          </button>
                        ) : null}
                      </div>

                      {isQuoting && (
                        <form
                          onSubmit={(e) => {
                            void handleSendQuote(e, job);
                          }}
                          className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                {t.laborCostLabel}
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={100000}
                                value={quoteLaborMad}
                                onChange={(e) => setQuoteLaborMad(Number(e.target.value))}
                                className="w-full px-3 py-1.5 text-xs font-mono-tabular bg-white border border-slate-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                {t.materialsCostLabel}
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={100000}
                                value={quoteMaterialsMad}
                                onChange={(e) => setQuoteMaterialsMad(Number(e.target.value))}
                                className="w-full px-3 py-1.5 text-xs font-mono-tabular bg-white border border-slate-300 rounded-lg"
                              />
                            </div>
                            <div className="flex flex-col justify-center bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                              <span className="text-[10px] font-semibold text-emerald-800">
                                {isAr ? 'الإجمالي المقترح' : 'Total devis'}
                              </span>
                              <span className="text-sm font-bold tabular-nums text-emerald-900">
                                {formatMadCurrency(
                                  computeQuotationTotals(quoteLaborMad, quoteMaterialsMad).totalMad,
                                  lang
                                )}
                              </span>
                            </div>
                          </div>
                          {quoteErrors.proposedPriceMad && (
                            <p className="text-[11px] text-rose-600">
                              {quoteErrors.proposedPriceMad}
                            </p>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                {isAr ? 'التوفر / مدة الإنجاز' : 'Disponibilité / Durée'}
                              </label>
                              <input
                                type="text"
                                maxLength={64}
                                value={quoteDuration}
                                onChange={(e) => setQuoteDuration(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                              />
                              {quoteErrors.estimatedDuration && (
                                <p className="text-[11px] text-rose-600 mt-0.5">
                                  {quoteErrors.estimatedDuration}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                {t.quoteValidUntilLabel}
                              </label>
                              <input
                                type="date"
                                min={getTodayIsoDate()}
                                value={quoteValidUntil}
                                onChange={(e) => setQuoteValidUntil(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                {isAr ? 'الضمان (اختياري)' : 'Garantie (optionnel)'}
                              </label>
                              <input
                                type="text"
                                maxLength={160}
                                value={quoteWarranty}
                                onChange={(e) => setQuoteWarranty(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              {isAr ? 'رسالة للزبون' : 'Message au client'}
                            </label>
                            <textarea
                              rows={2}
                              maxLength={500}
                              value={quoteMessage}
                              onChange={(e) => setQuoteMessage(e.target.value)}
                              placeholder={
                                isAr
                                  ? 'اذكر خبرتك في هذا النوع من الأعطال والأدوات التي ستجلبها معك...'
                                  : 'Présentez votre expérience sur ce type d’intervention et ce qui est inclus...'
                              }
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                            />
                            {quoteErrors.message && (
                              <p className="text-[11px] text-rose-600 mt-0.5">
                                {quoteErrors.message}
                              </p>
                            )}
                          </div>

                          {quoteSubmitError && (
                            <p className="text-xs text-rose-700">{quoteSubmitError}</p>
                          )}

                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setQuotingJobId(null)}
                              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg cursor-pointer"
                            >
                              {isAr ? 'إلغاء' : 'Annuler'}
                            </button>
                            <button
                              type="submit"
                              disabled={isSendingQuote}
                              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-60 cursor-pointer"
                            >
                              {isSendingQuote
                                ? isAr
                                  ? 'جاري الإرسال...'
                                  : 'Envoi...'
                                : isAr
                                ? 'إرسال العرض'
                                : 'Envoyer mon devis'}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DIRECT MISSIONS & ACCEPTED BOOKINGS */}
      {effectiveTab === 'missions' && ownProvider && (
        <div className="space-y-5">
          {/* Pro KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
              <div className="text-xs font-medium text-slate-500">
                {isAr ? 'طلبات جديدة' : 'En attente'}
              </div>
              <div className="text-2xl font-bold tabular-nums text-amber-700">
                {metrics.pendingCount}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
              <div className="text-xs font-medium text-slate-500">
                {isAr ? 'مهام قيد التنفيذ' : 'En cours'}
              </div>
              <div className="text-2xl font-bold tabular-nums text-blue-700">
                {metrics.activeCount}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
              <div className="text-xs font-medium text-slate-500">
                {isAr ? 'التقييم العام' : 'Note clients'}
              </div>
              <div className="text-2xl font-bold tabular-nums text-slate-900 flex items-center gap-1.5">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                <span>{ownProvider.ratingAvg.toFixed(1)}</span>
                <span className="text-xs font-normal text-slate-500">
                  ({ownProvider.reviewCount})
                </span>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
              <div className="text-xs font-medium text-slate-500">
                {isAr ? 'المحصل نقداً (COD)' : 'Encaissé en espèces (COD)'}
              </div>
              <div className="text-2xl font-bold tabular-nums text-emerald-700">
                {formatMadCurrency(metrics.cashCollectedDirectlyMad, lang)}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'all', fr: `Toutes (${providerBookings.length})`, ar: `الكل (${providerBookings.length})` },
                { id: 'pending', fr: `En attente (${metrics.pendingCount})`, ar: `في الانتظار (${metrics.pendingCount})` },
                { id: 'active', fr: `En cours (${metrics.activeCount})`, ar: `قيد الإنجاز (${metrics.activeCount})` },
                { id: 'completed', fr: `Terminées (${metrics.completedCount})`, ar: `مكتملة (${metrics.completedCount})` },
                {
                  id: 'cancelled',
                  fr: `Annulées (${providerBookings.filter((b) => b.status === 'cancelled').length})`,
                  ar: `ملغاة (${providerBookings.filter((b) => b.status === 'cancelled').length})`,
                },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setMissionFilter(f.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  missionFilter === f.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {isAr ? f.ar : f.fr}
              </button>
            ))}
          </div>

          {filteredMissions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2.5">
              <p className="text-xs text-slate-600">
                {isAr
                  ? 'لا توجد مهام مباشرة في هذه الفئة حالياً. تصفح «طلبات الزبناء المنشورة» لتقديم عروضك.'
                  : 'Aucune mission dans cette catégorie. Consultez l’onglet « Offres Clients » pour envoyer des devis.'}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('jobs')}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
              >
                {isAr ? 'تصفح طلبات الزبناء' : 'Voir les Offres Clients'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredMissions.map((booking) => {
                const whatsappUrl = buildWhatsAppUrl({
                  phone: booking.clientPhone,
                  lang,
                  providerName: booking.clientName,
                  category: t.categories[booking.category],
                  bookingRef: booking.bookingRef,
                  serviceType: booking.serviceType,
                });

                return (
                  <div
                    key={booking.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4 shadow-2xs"
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {booking.clientName}
                          </span>
                          <span className="font-mono-tabular text-slate-500">
                            #{booking.bookingRef}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            booking.status === 'cancelled'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : booking.status === 'completed' || booking.status === 'reviewed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : booking.status === 'in_progress'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {booking.status === 'cancelled' ? (
                            <XCircle className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>{getStatusLabel(booking.status)}</span>
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1">
                        <div>
                          <span className="font-medium text-slate-900">{booking.serviceType}</span>{' '}
                          · {t.cities[booking.city]} ({booking.neighborhood})
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-slate-500">
                          <span className="font-mono-tabular">
                            {booking.preferredDate} ({booking.preferredTimeSlot})
                          </span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            {booking.paymentMethod === 'cmi_escrow' ? (
                              <CreditCard className="w-3.5 h-3.5 text-amber-700" />
                            ) : (
                              <Banknote className="w-3.5 h-3.5 text-emerald-700" />
                            )}
                            <span className="font-semibold text-slate-700">
                              {getPaymentStatusLabel(booking.paymentStatus)}
                            </span>
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{booking.addressPin}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed">
                        {booking.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="tabular-nums font-bold text-sm text-slate-900">
                          {formatMadCurrency(booking.estimatedMad, lang)}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenBookingDetail(booking)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{isAr ? 'التفاصيل' : 'Détails'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenChat(booking)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                            <span>{t.openChatBtn}</span>
                          </button>
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                        {canTransitionBookingStatus(booking.status, 'cancelled', 'provider') && (
                          <button
                            type="button"
                            onClick={() => onOpenCancel(booking)}
                            className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 cursor-pointer"
                          >
                            {booking.status === 'pending'
                              ? t.providerDeclineBtn
                              : t.cancelRequestBtn}
                          </button>
                        )}
                        {canTransitionBookingStatus(booking.status, 'accepted', 'provider') && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateBookingStatus(booking.id, 'accepted', 'provider')
                            }
                            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
                          >
                            {t.providerAcceptBtn}
                          </button>
                        )}
                        {canTransitionBookingStatus(booking.status, 'in_progress', 'provider') && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateBookingStatus(booking.id, 'in_progress', 'provider')
                            }
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>{t.providerStartJobBtn}</span>
                          </button>
                        )}
                        {canTransitionBookingStatus(booking.status, 'completed', 'provider') && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateBookingStatus(booking.id, 'completed', 'provider')
                            }
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{t.providerCompleteJobBtn}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: UNIFIED MAÂLEM CARD STUDIO + LIVE PREVIEW */}
      {effectiveTab === 'card' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Complete Maâlem Card Editor */}
          <form
            onSubmit={handleSaveCardSubmit}
            noValidate
            className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-6 shadow-2xs"
          >
            {/* Completeness Meter */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">
                  {isAr ? 'جاهزية بطاقتك المهنية للزبناء' : 'Complétude de votre Fiche Maâlem'}
                </span>
                <span className="font-bold text-emerald-700 tabular-nums">
                  {completeness.percent}%
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                  style={{ width: `${completeness.percent}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {(
                  [
                    { ok: completeness.checks.hasIdentity, fr: 'Nom & Tél', ar: 'الاسم والهاتف' },
                    { ok: completeness.checks.hasLocation, fr: 'Ville & Quartier', ar: 'المدينة والحي' },
                    { ok: completeness.checks.hasExperienceAndBio, fr: 'Expérience & Bio', ar: 'الخبرة والنبذة' },
                    { ok: completeness.checks.hasCustomPhoto, fr: 'Photo réelle', ar: 'صورة حقيقية' },
                    { ok: completeness.checks.hasSkills, fr: 'Compétences (2+)', ar: 'المهارات (+2)' },
                  ] as const
                ).map((item) => (
                  <span
                    key={item.fr}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium ${
                      item.ok
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-white border border-slate-200 text-slate-500'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{isAr ? item.ar : item.fr}</span>
                  </span>
                ))}
              </div>
            </div>

            {cardNotice && (
              <div
                role={cardNotice.type === 'error' ? 'alert' : 'status'}
                className={`p-3.5 rounded-xl text-xs flex items-start gap-2 ${
                  cardNotice.type === 'error'
                    ? 'bg-rose-50 border border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                }`}
              >
                {cardNotice.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{cardNotice.text}</span>
              </div>
            )}

            {/* Section A: Cover & Portfolio Photo Upload */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {isAr ? 'صورك ومعرض أعمالك (الواجهة)' : 'Photo de couverture & Galerie travaux'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isAr
                      ? 'الصورة الأولى تظهر كصورة رئيسية في بطاقتك (حتى 6 صور، 5 ميغابايت).'
                      : 'La 1ère photo apparaît en couverture de votre carte Maâlem (max 6 photos, 5 Mo).'}
                  </p>
                </div>
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl cursor-pointer">
                  <Camera className="w-4 h-4" />
                  <span>
                    {isUploadingPhoto
                      ? isAr
                        ? 'جاري الرفع...'
                        : 'Upload...'
                      : isAr
                      ? 'رفع صورة جديدة'
                      : 'Téléverser une photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingPhoto || cardPhotos.length >= 6}
                    onChange={handleCardPhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {cardPhotos.map((imgUrl, idx) => (
                  <div
                    key={`${imgUrl}-${idx}`}
                    className={`relative aspect-4/3 rounded-xl overflow-hidden border-2 bg-slate-100 ${
                      idx === 0 ? 'border-emerald-600' : 'border-slate-200'
                    }`}
                  >
                    <img src={imgUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    {idx === 0 ? (
                      <span className="absolute bottom-1.5 start-1.5 px-2 py-0.5 text-[10px] font-bold bg-emerald-700 text-white rounded-md">
                        {isAr ? 'رئيسية' : 'Couverture'}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setCardPhotos((prev) => [
                            imgUrl,
                            ...prev.filter((u) => u !== imgUrl),
                          ])
                        }
                        className="absolute bottom-1.5 start-1.5 px-2 py-0.5 text-[10px] font-semibold bg-slate-900/80 text-white hover:bg-emerald-700 rounded-md cursor-pointer"
                      >
                        {isAr ? 'تعيين كرئيسية' : 'Mettre en une'}
                      </button>
                    )}
                    {cardPhotos.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setCardPhotos((prev) => prev.filter((u) => u !== imgUrl))
                        }
                        aria-label={t.removePhotoBtn}
                        className="absolute top-1.5 end-1.5 p-1 rounded-md bg-slate-900/75 text-white hover:bg-rose-700 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Section B: Identity & Trade */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.fullNameLabel} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={cardFullName}
                  onChange={(e) => setCardFullName(e.target.value)}
                  placeholder={isAr ? 'مثال: المعلم رشيد العلمي' : 'Ex: Maâlem Rachid El Alami'}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                {cardFieldErrors.fullName && (
                  <p className="text-xs text-rose-600 mt-1">{cardFieldErrors.fullName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.phoneLabel} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  value={cardPhone}
                  onChange={(e) => setCardPhone(e.target.value)}
                  placeholder="+212661234567"
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                {cardFieldErrors.phone && (
                  <p className="text-xs text-rose-600 mt-1">{cardFieldErrors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.specialtyLabel} <span className="text-rose-600">*</span>
                </label>
                <select
                  value={cardCategory}
                  onChange={(e) => {
                    const nextCat = e.target.value as ServiceCategory;
                    setCardCategory(nextCat);
                    setCardPhotos((prev) =>
                      prev.length === 1 && Object.values(DEFAULT_CATEGORY_IMAGE).includes(prev[0])
                        ? [DEFAULT_CATEGORY_IMAGE[nextCat]]
                        : prev
                    );
                  }}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {SERVICE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {t.categories[cat]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isAr ? 'سنوات الخبرة' : 'Années d’expérience'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={cardExpYears}
                  onChange={(e) => setCardExpYears(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            {/* Section C: Location & GPS */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  {isAr ? 'الموقع الجغرافي ومنطقة التدخل' : 'Localisation & Secteur d’intervention'}
                </span>
                <button
                  type="button"
                  disabled={isLocatingCard}
                  onClick={handleUseGpsForCard}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>
                    {isLocatingCard
                      ? t.nearMeLocating
                      : isAr
                      ? 'تحديد موقعي عبر GPS'
                      : 'Utiliser ma position GPS'}
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.cityLabel} <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={cardCity}
                    onChange={(e) => setCardCity(e.target.value as MoroccanCity)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    {MOROCCAN_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {t.cities[c]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.neighborhoodLabel} <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={cardQuartier}
                    onChange={(e) => setCardQuartier(e.target.value)}
                    placeholder={t.neighborhoodPlaceholder}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  {cardFieldErrors.neighborhood && (
                    <p className="text-xs text-rose-600 mt-1">{cardFieldErrors.neighborhood}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section D: Diploma & Rates */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    {isAr
                      ? 'الدبلوم أو الشهادة المهنية (اختياري)'
                      : 'Diplôme / Qualification professionnelle (optionnel)'}
                  </span>
                </label>
                <input
                  type="text"
                  maxLength={160}
                  value={cardDiploma}
                  onChange={(e) => setCardDiploma(e.target.value)}
                  placeholder={
                    isAr
                      ? 'مثال: دبلوم تقني في الترصيص الصحي — مكتب التكوين المهني OFPPT'
                      : 'Ex: Diplôme Technicien ISTA / OFPPT — 10 ans sur chantier'
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.hourlyRateLabel} (DH) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  min={50}
                  max={50000}
                  value={cardHourlyRate}
                  onChange={(e) => setCardHourlyRate(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.calloutFeeLabel} (DH)
                </label>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={cardVisitFee}
                  onChange={(e) => setCardVisitFee(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="flex items-end">
                <label className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cardAvailableNow}
                    onChange={(e) => setCardAvailableNow(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-700"
                  />
                  <span>{t.availableNowText}</span>
                </label>
              </div>
            </div>

            {/* Section E: Bio & Skills */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.bioLabel} <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  maxLength={600}
                  value={cardBio}
                  onChange={(e) => setCardBio(e.target.value)}
                  placeholder={t.bioPlaceholder}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                {cardFieldErrors.bio && (
                  <p className="text-xs text-rose-600 mt-1">{cardFieldErrors.bio}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  {isAr ? 'المهارات والخدمات المقدمة' : 'Prestations & Compétences (max 10)'}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {cardSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium rounded-lg"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setCardSkills((prev) => prev.filter((s) => s !== skill))
                        }
                        className="text-emerald-700 hover:text-rose-600 cursor-pointer"
                        aria-label={`Remove ${skill}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                {/* Quick suggested skills for the selected trade */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-500">
                    {isAr ? 'اقتراحات سريعة:' : 'Suggestions :'}
                  </span>
                  {CATEGORY_SUGGESTED_SKILLS[cardCategory]
                    .filter((s) => !cardSkills.includes(s))
                    .map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => handleAddSkill(sug)}
                        className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md cursor-pointer"
                      >
                        + {sug}
                      </button>
                    ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={64}
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    placeholder={isAr ? 'أضف مهارة أخرى...' : 'Ajouter une compétence...'}
                    className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSkill()}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAr ? 'إضافة' : 'Ajouter'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={isSavingCard}
                className="px-6 py-3 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 disabled:opacity-60 transition-colors cursor-pointer"
              >
                {isSavingCard
                  ? t.savingProfileBtn
                  : ownProvider
                  ? isAr
                    ? 'حفظ تحديثات بطاقتي المهنية'
                    : 'Enregistrer ma Fiche Maâlem'
                  : isAr
                  ? 'نشر بطاقتي المهنية والدخول للعروض'
                  : 'Publier ma Fiche Maâlem'}
              </button>
            </div>
          </form>

          {/* Right Column: Sticky Live Preview of how Clients see the Maâlem Card */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                {isAr
                  ? 'معاينة مباشرة لبطاقتك كما يراها الزبناء'
                  : 'Aperçu en direct de votre carte Maâlem'}
              </span>
              <span className="text-[11px] text-emerald-700 font-semibold">
                {isAr ? 'تحديث فوري' : 'Temps réel'}
              </span>
            </div>
            <div className="pointer-events-none select-none opacity-95">
              <ProviderCard
                provider={livePreviewProvider}
                lang={lang}
                t={t}
                onViewDetails={() => {}}
                onBookProvider={() => {}}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EARNINGS & RIB WITHDRAWALS */}
      {effectiveTab === 'earnings' && ownProvider && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-700" />
                <span>{isAr ? 'طلب سحب بنكي (RIB)' : 'Demander un virement RIB'}</span>
              </h2>
              <p className="text-xs text-slate-600">
                {isAr
                  ? `الحد الأدنى للسحب: ${formatMadCurrency(Math.max(100, systemSettings.minWithdrawalMad), lang)}`
                  : `Montant minimum de retrait : ${formatMadCurrency(Math.max(100, systemSettings.minWithdrawalMad), lang)}`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="text-emerald-800">
                  {isAr ? 'محصل نقداً مباشرة (COD)' : 'Encaissé direct (Espèces COD)'}
                </div>
                <div className="text-base font-bold tabular-nums text-emerald-900 mt-0.5">
                  {formatMadCurrency(metrics.cashCollectedDirectlyMad, lang)}
                </div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-slate-700">
                  {isAr ? 'رصيد المنصة القابل للسحب' : 'Solde plateforme retirable'}
                </div>
                <div className="text-base font-bold tabular-nums text-slate-900 mt-0.5">
                  {formatMadCurrency(metrics.platformHeldWithdrawableMad, lang)}
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
              {isAr
                ? 'ملاحظة: مداخيل الدفع نقداً عند انتهاء الخدمة (COD) يستلمها المعلم مباشرة من الزبون (0% عمولة)، وبالتالي لا تُحتسب ضمن رصيد التحويل البنكي للمنصة.'
                : 'Note : Les revenus payés en espèces en fin de chantier (COD) sont perçus directement auprès du client (0% commission) et ne constituent pas un solde détenu par la plateforme.'}
            </div>

            {withdrawalNotice && (
              <div
                role={withdrawalNotice.type === 'error' ? 'alert' : 'status'}
                className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                  withdrawalNotice.type === 'error'
                    ? 'bg-rose-50 border border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                }`}
              >
                {withdrawalNotice.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{withdrawalNotice.text}</span>
              </div>
            )}

            <form onSubmit={handleRequestWithdrawal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isAr ? 'البنك المغربي' : 'Banque marocaine'}
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {MOROCCAN_BANKS.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isAr ? 'رقم الحساب البنكي (RIB - 24 رقماً)' : 'Numéro RIB (24 chiffres)'}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={ribInput}
                  onChange={(e) => setRibInput(e.target.value)}
                  placeholder="230 780 00000000000000 99"
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isAr ? 'المبلغ المطلوب (بالدرهم)' : 'Montant souhaité (DH)'}
                </label>
                <input
                  type="number"
                  min={Math.max(100, systemSettings.minWithdrawalMad)}
                  max={100000}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingWithdrawal || !metrics.canRequestWithdrawal}
                className="w-full py-2.5 text-xs font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmittingWithdrawal
                  ? isAr
                    ? 'جاري الإرسال...'
                    : 'Envoi en cours...'
                  : isAr
                  ? 'إرسال طلب التحويل البنكي'
                  : 'Soumettre la demande de virement'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                {isAr ? 'سجل طلبات السحب البنكي' : 'Historique de mes retraits'}
              </h2>
              <span className="text-xs font-semibold text-slate-600 tabular-nums">
                {isAr ? 'المجموع:' : 'Total demandé :'} {formatMadCurrency(withdrawnTotalMad, lang)}
              </span>
            </div>

            {withdrawals.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">
                {isAr
                  ? 'لم تقم بأي طلب سحب بنكي بعد.'
                  : 'Aucune demande de virement enregistrée pour le moment.'}
              </div>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900">
                        {w.bankName}{' '}
                        <span className="font-mono-tabular font-normal text-slate-500" dir="ltr">
                          ({w.ribMasked})
                        </span>
                      </div>
                      <div className="text-slate-500 font-mono-tabular">{w.createdAtIso}</div>
                      {w.adminNote && <div className="text-slate-600 italic">{w.adminNote}</div>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold tabular-nums text-slate-900">
                        {formatMadCurrency(w.amountMad, lang)}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          w.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : w.status === 'rejected' || w.status === 'frozen'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {w.status === 'approved'
                          ? isAr
                            ? 'تم التحويل'
                            : 'Validé'
                          : w.status === 'rejected'
                          ? isAr
                            ? 'مرفوض'
                            : 'Refusé'
                          : w.status === 'frozen'
                          ? isAr
                            ? 'مجمد'
                            : 'Bloqué'
                          : isAr
                          ? 'قيد المعالجة'
                          : 'En attente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {effectiveTab === 'services' && (
        <ProviderServicesManager
          providerId={firebaseUser.uid}
          defaultCategory={ownProvider?.category || 'Plomberie'}
          hasProviderProfile={Boolean(ownProvider)}
          lang={lang}
          t={t}
          onGoToCardSetup={() => setActiveTab('card')}
        />
      )}

      {effectiveTab === 'calendar' && (
        <ProviderAvailabilityCalendar uid={firebaseUser.uid} lang={lang} t={t} />
      )}

      {effectiveTab === 'verification' && (
        <ProviderVerificationPanel
          uid={firebaseUser.uid}
          isVerifiedBadge={Boolean(ownProvider?.verifiedBadge || userProfile?.verifiedBadge)}
          lang={lang}
        />
      )}
    </div>
  );
};
