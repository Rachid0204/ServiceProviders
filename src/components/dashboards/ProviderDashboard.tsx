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
  Image as ImageIcon,
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
  calculateEscrowSplit,
  formatMadCurrency,
  buildWhatsAppUrl,
  canTransitionBookingStatus,
  type BookingRecord,
  type BookingStatus,
  type LanguageCode,
  type PaymentStatus,
  type UserProfileRecord,
  type UserRole,
  type VettedProvider,
} from '../../utils/marketplace';
import type { Translations } from '../../i18n/translations';
import type { SystemSettingsRecord } from '../../utils/adminMetrics';
import type { UpdateProviderDetailsInput } from '../../hooks/useMarketplaceAuth';
import { uploadMarketplacePhoto } from '../../utils/storageUpload';
import { isVerifiedAuthUser, mapProfileSaveError } from '../../utils/authHelpers';

interface ProviderWithdrawalItem {
  id: string;
  bankName: string;
  ribMasked: string;
  amountMad: number;
  status: 'pending' | 'approved' | 'frozen' | 'rejected';
  adminNote?: string;
  createdAtIso: string;
}

interface ProviderDashboardProps {
  lang: LanguageCode;
  t: Translations;
  firebaseUser: User | null;
  userProfile: UserProfileRecord | null;
  ownProvider: VettedProvider | null;
  systemSettings: SystemSettingsRecord;
  bookingActionError: string | null;
  onDismissError: () => void;
  bookings: BookingRecord[];
  onToggleProviderAvailability: (provider: VettedProvider) => void;
  onUpdateProviderDetails: (patch: UpdateProviderDetailsInput) => Promise<void>;
  onOpenAuth: () => void;
  onGoToProfile: () => void;
  onExploreProviders: () => void;
  onOpenChat: (booking: BookingRecord) => void;
  onOpenBookingDetail: (booking: BookingRecord) => void;
  onOpenCancel: (booking: BookingRecord) => void;
  onUpdateBookingStatus: (
    bookingId: string,
    nextStatus: BookingStatus,
    actorRole: UserRole
  ) => void;
}

type ProviderTab = 'overview' | 'bookings' | 'portfolio' | 'earnings';
type JobFilter = 'all' | 'pending' | 'active' | 'completed' | 'cancelled';

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
  ownProvider,
  systemSettings,
  bookingActionError,
  onDismissError,
  bookings,
  onToggleProviderAvailability,
  onUpdateProviderDetails,
  onOpenAuth,
  onGoToProfile,
  onExploreProviders,
  onOpenChat,
  onOpenBookingDetail,
  onOpenCancel,
  onUpdateBookingStatus,
}) => {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<ProviderTab>('overview');
  const [jobFilter, setJobFilter] = useState<JobFilter>('all');

  // Portfolio & Details editor state
  const [bioInput, setBioInput] = useState('');
  const [hourlyRateInput, setHourlyRateInput] = useState(150);
  const [visitFeeInput, setVisitFeeInput] = useState(70);
  const [expYearsInput, setExpYearsInput] = useState(5);
  const [skillsList, setSkillsList] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [portfolioMessage, setPortfolioMessage] = useState<{
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

  // Sync editor inputs with live ownProvider document
  useEffect(() => {
    if (!ownProvider) return;
    setBioInput(isAr ? ownProvider.bioAr : ownProvider.bioFr);
    setHourlyRateInput(ownProvider.hourlyRateMAD);
    setVisitFeeInput(ownProvider.fixedVisitFeeMAD);
    setExpYearsInput(ownProvider.experienceYears);
    setSkillsList(ownProvider.skills);
  }, [ownProvider?.uid, ownProvider?.hourlyRateMAD, ownProvider?.fixedVisitFeeMAD, isAr]);

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

  const metrics = useMemo(() => {
    let pendingCount = 0;
    let activeCount = 0;
    let completedCount = 0;
    let settledEarningsMad = 0;
    let escrowHeldMad = 0;

    for (const b of providerBookings) {
      if (b.status === 'pending') pendingCount++;
      if (b.status === 'accepted' || b.status === 'in_progress') activeCount++;
      if (b.status === 'completed' || b.status === 'reviewed') completedCount++;

      if (b.paymentStatus === 'paid') {
        const split = calculateEscrowSplit(b.estimatedMad, systemSettings.platformFeePct, 100);
        settledEarningsMad +=
          b.paymentMethod === 'cmi_escrow'
            ? b.providerPayoutMad ?? split.providerPayoutMad
            : b.estimatedMad;
      } else if (b.paymentMethod === 'cmi_escrow' && b.paymentStatus === 'escrow_held') {
        const split = calculateEscrowSplit(b.estimatedMad, systemSettings.platformFeePct, 100);
        escrowHeldMad += split.providerPayoutMad;
      }
    }
    return {
      pendingCount,
      activeCount,
      completedCount,
      settledEarningsMad,
      escrowHeldMad,
    };
  }, [providerBookings, systemSettings.platformFeePct]);

  const withdrawnTotalMad = useMemo(
    () =>
      withdrawals
        .filter((w) => w.status === 'pending' || w.status === 'approved')
        .reduce((sum, w) => sum + w.amountMad, 0),
    [withdrawals]
  );

  const filteredBookings = useMemo(() => {
    if (jobFilter === 'all') return providerBookings;
    if (jobFilter === 'pending') return providerBookings.filter((b) => b.status === 'pending');
    if (jobFilter === 'active') {
      return providerBookings.filter(
        (b) => b.status === 'accepted' || b.status === 'in_progress'
      );
    }
    if (jobFilter === 'completed') {
      return providerBookings.filter(
        (b) => b.status === 'completed' || b.status === 'reviewed'
      );
    }
    return providerBookings.filter((b) => b.status === 'cancelled');
  }, [providerBookings, jobFilter]);

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

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownProvider) return;
    setPortfolioMessage(null);

    const trimmedBio = bioInput.trim();
    if (trimmedBio.length < 10) {
      setPortfolioMessage({
        type: 'error',
        text: isAr
          ? 'يرجى كتابة نبذة مهنية لا تقل عن 10 أحرف.'
          : 'Veuillez saisir une présentation d’au moins 10 caractères.',
      });
      return;
    }

    setIsSavingProfile(true);
    try {
      await onUpdateProviderDetails({
        ...(isAr ? { bioAr: trimmedBio } : { bioFr: trimmedBio }),
        hourlyRateMAD: hourlyRateInput,
        fixedVisitFeeMAD: visitFeeInput,
        experienceYears: expYearsInput,
        skills: skillsList.length > 0 ? skillsList : [ownProvider.category],
      });
      setPortfolioMessage({
        type: 'success',
        text: isAr
          ? 'تم تحديث ملفك المهني بنجاح!'
          : 'Votre profil Maâlem a été mis à jour avec succès.',
      });
    } catch (err) {
      setPortfolioMessage({
        type: 'error',
        text: mapProfileSaveError(err, lang),
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddSkill = () => {
    const cleaned = newSkillInput.trim().slice(0, 64);
    if (!cleaned || skillsList.length >= 10) return;
    if (!skillsList.includes(cleaned)) {
      setSkillsList((prev) => [...prev, cleaned]);
    }
    setNewSkillInput('');
  };

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser || !ownProvider) return;
    setPortfolioMessage(null);

    if (ownProvider.portfolioImages.length >= 6) {
      setPortfolioMessage({
        type: 'error',
        text: isAr
          ? 'يمكنك إضافة 6 صور كحد أقصى في معرض الأعمال.'
          : 'Maximum 6 photos autorisées dans votre galerie de réalisations.',
      });
      e.target.value = '';
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const result = await uploadMarketplacePhoto({
        file,
        scope: 'providers',
        entityId: firebaseUser.uid,
        userId: firebaseUser.uid,
        lang,
      });
      const updatedImages = [...ownProvider.portfolioImages, result.url].slice(0, 6);
      await onUpdateProviderDetails({ portfolioImages: updatedImages });
      setPortfolioMessage({
        type: 'success',
        text: isAr ? 'تمت إضافة الصورة إلى معرض أعمالك.' : 'Photo ajoutée à votre portfolio.',
      });
    } catch (err) {
      setPortfolioMessage({
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

  const handleRemovePhoto = async (urlToRemove: string) => {
    if (!ownProvider || ownProvider.portfolioImages.length <= 1) return;
    setPortfolioMessage(null);
    const remaining = ownProvider.portfolioImages.filter((u) => u !== urlToRemove);
    if (remaining.length === 0) return;
    try {
      await onUpdateProviderDetails({ portfolioImages: remaining });
    } catch (err) {
      setPortfolioMessage({
        type: 'error',
        text: mapProfileSaveError(err, lang),
      });
    }
  };

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !ownProvider) return;
    setWithdrawalNotice(null);

    if (!isVerifiedAuthUser(firebaseUser)) {
      setWithdrawalNotice({
        type: 'error',
        text: isAr
          ? 'يرجى تأكيد بريدك الإلكتروني أولاً.'
          : 'Veuillez confirmer votre adresse e-mail avant de demander un retrait.',
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

    const withdrawalId = `wd-${firebaseUser.uid.slice(0, 8)}-${Date.now()}`;
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
                ? 'سجّل الدخول إلى حسابك المهني لإدارة طلبات الزبناء، تحديث معرض أعمالك، وطلب التحويلات البنكية.'
                : 'Connectez-vous à votre compte Maâlem pour gérer vos missions, votre disponibilité, votre portfolio et vos retraits RIB.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={onOpenAuth}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{isAr ? 'تسجيل الدخول / إنشاء حساب معلم' : 'Connexion / Devenir Maâlem'}</span>
            </button>
            <button
              type="button"
              onClick={onExploreProviders}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              {isAr ? 'العودة للرئيسية' : 'Retour à l’accueil'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Gate 2: Signed-in Client who has not yet activated a Maâlem / Provider profile
  const isProviderCapable =
    Boolean(ownProvider) &&
    (userProfile?.role === 'provider' || userProfile?.role === 'both');

  if (!isProviderCapable || !ownProvider) {
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
                ? 'حسابك الحالي مسجل كزبون فقط. يمكنك إضافة دور «معلم / مقدم خدمة» من ملفك الشخصي لنشر خدماتك واستقبال الطلبات في مدينتك.'
                : 'Votre compte est actuellement configuré en tant que Client. Activez le rôle « Maâlem » ou « Client & Maâlem » dans votre profil pour publier vos services et recevoir des missions.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={onGoToProfile}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors cursor-pointer"
            >
              <Wrench className="w-4 h-4" />
              <span>{isAr ? 'تفعيل ملفي كمعلم' : 'Activer mon profil Maâlem'}</span>
            </button>
            <button
              type="button"
              onClick={onExploreProviders}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              {isAr ? 'تصفح المعلمين' : 'Explorer les Maâlems'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-7">
      {/* Provider Header + Availability Toggle (Strictly Own Profile — ZERO Switcher) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-start gap-4">
          <img
            src={ownProvider.portfolioImages[0]}
            alt={isAr ? ownProvider.fullNameAr : ownProvider.fullNameFr}
            className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                {isAr ? ownProvider.fullNameAr : ownProvider.fullNameFr}
              </h1>
              {ownProvider.verifiedBadge ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{t.verifiedCinLabel}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{isAr ? 'توثيق CIN قيد المراجعة' : 'Vérification CIN en attente'}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {t.categories[ownProvider.category]} · {t.cities[ownProvider.location.city]} (
              {ownProvider.location.quartier}) ·{' '}
              <span className="font-semibold text-slate-900 tabular-nums">
                {formatMadCurrency(ownProvider.hourlyRateMAD, lang)}/h
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
      </div>

      {/* Workspace Sub-Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Provider Workspace Tabs"
        className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3"
      >
        {(
          [
            {
              id: 'overview',
              icon: Briefcase,
              labelFr: 'Vue d’ensemble',
              labelAr: 'نظرة عامة',
            },
            {
              id: 'bookings',
              icon: Clock,
              labelFr: `Missions & Demandes (${providerBookings.length})`,
              labelAr: `الطلبات والمهام (${providerBookings.length})`,
            },
            {
              id: 'portfolio',
              icon: ImageIcon,
              labelFr: 'Mon Profil & Portfolio',
              labelAr: 'ملفي ومعرض الأعمال',
            },
            {
              id: 'earnings',
              icon: Wallet,
              labelFr: 'Revenus & Retraits (RIB)',
              labelAr: 'الأرباح والسحب البنكي',
            },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{isAr ? tab.labelAr : tab.labelFr}</span>
            </button>
          );
        })}
      </div>

      {bookingActionError && (
        <div
          role="alert"
          className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-900"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
            <span>{bookingActionError}</span>
          </div>
          <button
            type="button"
            onClick={onDismissError}
            className="text-rose-700 font-semibold hover:underline cursor-pointer shrink-0"
          >
            {t.closeBtn}
          </button>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Pro KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
              <div className="text-xs font-medium text-slate-500">
                {isAr ? 'طلبات جديدة بانتظارك' : 'Nouvelles demandes'}
              </div>
              <div className="text-2xl font-bold tabular-nums text-amber-700">
                {metrics.pendingCount}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
              <div className="text-xs font-medium text-slate-500">
                {isAr ? 'مهام قيد التنفيذ' : 'Missions en cours'}
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
                {isAr ? 'الأرباح المحصلة' : 'Revenus encaissés'}
              </div>
              <div className="text-2xl font-bold tabular-nums text-emerald-700">
                {formatMadCurrency(metrics.settledEarningsMad, lang)}
              </div>
            </div>
          </div>

          {!ownProvider.verifiedBadge && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold">
                    {isAr
                      ? 'ملفك في انتظار توثيق البطاقة الوطنية (CIN)'
                      : 'Votre dossier est en attente de vérification CIN'}
                  </div>
                  <p className="text-amber-900">
                    {isAr
                      ? 'بمجرد مصادقة فريق مول الخدمة على هويتك، ستحصل على شارة الثقة الخضراء وترتفع فرص قبولك لدى الزبناء.'
                      : 'Dès validation de votre CIN par l’équipe Moul L’Khedma, votre badge de confiance sera affiché et les virements RIB seront débloqués.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onGoToProfile}
                className="px-3.5 py-2 bg-white border border-amber-300 rounded-lg font-semibold text-amber-900 hover:bg-amber-100 whitespace-nowrap cursor-pointer"
              >
                {isAr ? 'تحديث بياناتي' : 'Vérifier mes infos'}
              </button>
            </div>
          )}

          {/* Incoming Pending Requests Quick List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900">
                {isAr ? 'أحدث الطلبات الواردة' : 'Demandes en attente de réponse'}
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab('bookings')}
                className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
              >
                {isAr ? 'عرض جميع المهام' : 'Voir toutes les missions'}
              </button>
            </div>

            {providerBookings.filter((b) => b.status === 'pending').length === 0 ? (
              <p className="text-xs text-slate-600 py-4">
                {isAr
                  ? 'لا توجد طلبات جديدة في الانتظار حالياً. تأكد من تفعيل حالة «متاح الآن» لتلقي الطلبات.'
                  : 'Aucune nouvelle demande en attente. Gardez votre statut « Disponible maintenant » actif pour apparaître en tête des recherches.'}
              </p>
            ) : (
              <div className="space-y-3">
                {providerBookings
                  .filter((b) => b.status === 'pending')
                  .slice(0, 4)
                  .map((b) => (
                    <div
                      key={b.id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-slate-900">
                          {b.clientName} · {b.serviceType}{' '}
                          <span className="font-mono-tabular text-slate-500">
                            #{b.bookingRef}
                          </span>
                        </div>
                        <div className="text-slate-600">
                          {t.cities[b.city]} ({b.neighborhood}) · {b.preferredDate} (
                          {b.preferredTimeSlot}) ·{' '}
                          <span className="font-bold text-emerald-700">
                            {formatMadCurrency(b.estimatedMad, lang)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenCancel(b)}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 cursor-pointer"
                        >
                          {t.providerDeclineBtn}
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateBookingStatus(b.id, 'accepted', 'provider')}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
                        >
                          {t.providerAcceptBtn}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BOOKINGS & JOBS */}
      {activeTab === 'bookings' && (
        <div className="space-y-5">
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
                onClick={() => setJobFilter(f.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  jobFilter === f.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {isAr ? f.ar : f.fr}
              </button>
            ))}
          </div>

          {filteredBookings.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-600">
              {isAr
                ? 'لا توجد مهام في هذه الفئة حالياً.'
                : 'Aucune mission trouvée dans cette catégorie.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredBookings.map((booking) => {
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

      {/* TAB 3: PROFILE & PORTFOLIO GALLERY */}
      {activeTab === 'portfolio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Edit Rates, Bio & Skills */}
          <form
            onSubmit={handleSaveDetails}
            className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-5"
          >
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isAr ? 'التعريفات والمهارات المهنية' : 'Tarifs, Présentation & Compétences'}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {isAr
                  ? 'تظهر هذه المعلومات مباشرة للزبناء في بطاقتك المهنية.'
                  : 'Ces informations sont affichées publiquement sur votre fiche Maâlem.'}
              </p>
            </div>

            {portfolioMessage && (
              <div
                role={portfolioMessage.type === 'error' ? 'alert' : 'status'}
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  portfolioMessage.type === 'error'
                    ? 'bg-rose-50 border border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                }`}
              >
                {portfolioMessage.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
                <span>{portfolioMessage.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.hourlyRateLabel} (DH)
                </label>
                <input
                  type="number"
                  min={50}
                  max={50000}
                  value={hourlyRateInput}
                  onChange={(e) => setHourlyRateInput(Number(e.target.value))}
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
                  value={visitFeeInput}
                  onChange={(e) => setVisitFeeInput(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isAr ? 'سنوات الخبرة' : 'Années d’expérience'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={expYearsInput}
                  onChange={(e) => setExpYearsInput(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.bioLabel}
              </label>
              <textarea
                rows={4}
                maxLength={600}
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                placeholder={t.bioPlaceholder}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                {isAr ? 'الخدمات والمهارات (حتى 10)' : 'Prestations & Compétences (max 10)'}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {skillsList.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-800 text-xs font-medium rounded-lg"
                  >
                    <span>{skill}</span>
                    {skillsList.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setSkillsList((prev) => prev.filter((s) => s !== skill))
                        }
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        aria-label={`Remove ${skill}`}
                      >
                        ×
                      </button>
                    )}
                  </span>
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
                  placeholder={
                    isAr ? 'أضف مهارة (مثال: إصلاح التسربات)' : 'Ajouter une compétence...'
                  }
                  className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAr ? 'إضافة' : 'Ajouter'}</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 disabled:opacity-60 cursor-pointer"
              >
                {isSavingProfile ? t.savingProfileBtn : t.saveProfileBtn}
              </button>
            </div>
          </form>

          {/* Portfolio Photo Gallery Upload */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {t.detailModalPortfolioTitle}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {ownProvider.portfolioImages.length}/6{' '}
                  {isAr ? 'صور (بحد أقصى 5 ميغابايت)' : 'photos (max 5 Mo)'}
                </p>
              </div>
              <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer">
                <Camera className="w-3.5 h-3.5" />
                <span>
                  {isUploadingPhoto
                    ? isAr
                      ? 'جاري الرفع...'
                      : 'Upload...'
                    : isAr
                    ? 'إضافة صورة'
                    : 'Ajouter photo'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={isUploadingPhoto || ownProvider.portfolioImages.length >= 6}
                  onChange={handlePortfolioUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {ownProvider.portfolioImages.map((imgUrl, idx) => (
                <div
                  key={`${imgUrl}-${idx}`}
                  className="relative group aspect-4/3 rounded-xl overflow-hidden border border-slate-200 bg-slate-100"
                >
                  <img
                    src={imgUrl}
                    alt={`Portfolio ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {ownProvider.portfolioImages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        void handleRemovePhoto(imgUrl);
                      }}
                      aria-label={t.removePhotoBtn}
                      className="absolute top-2 end-2 p-1.5 rounded-lg bg-slate-900/75 text-white hover:bg-rose-700 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EARNINGS & RIB WITHDRAWALS */}
      {activeTab === 'earnings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Withdrawal Request Form */}
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
                <div className="text-emerald-800">{isAr ? 'الأرباح المحصلة' : 'Encaissé'}</div>
                <div className="text-base font-bold tabular-nums text-emerald-900 mt-0.5">
                  {formatMadCurrency(metrics.settledEarningsMad, lang)}
                </div>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="text-amber-800">
                  {isAr ? 'في ضمان CMI' : 'En séquestre CMI'}
                </div>
                <div className="text-base font-bold tabular-nums text-amber-900 mt-0.5">
                  {formatMadCurrency(metrics.escrowHeldMad, lang)}
                </div>
              </div>
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
                disabled={isSubmittingWithdrawal}
                className="w-full py-2.5 text-xs font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 disabled:opacity-60 cursor-pointer"
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

          {/* Withdrawal History */}
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
                      {w.adminNote && (
                        <div className="text-slate-600 italic">{w.adminNote}</div>
                      )}
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
    </div>
  );
};
