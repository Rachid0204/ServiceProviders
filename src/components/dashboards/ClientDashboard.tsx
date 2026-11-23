import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  CreditCard,
  Banknote,
  MapPin,
  Star,
  MessageSquare,
  MessageCircle,
  ShieldCheck,
  Calendar,
  FileText,
  AlertCircle,
  Clock,
  Compass,
  LogIn,
  Plus,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  MOROCCAN_CITIES,
  calculateEscrowSplit,
  formatMadCurrency,
  buildWhatsAppUrl,
  canTransitionBookingStatus,
  validateUserProfileInput,
  type BookingRecord,
  type BookingStatus,
  type JobPostRecord,
  type JobProposalRecord,
  type LanguageCode,
  type MoroccanCity,
  type PaymentStatus,
  type UserProfileRecord,
} from '../../utils/marketplace';
import type { Translations } from '../../i18n/translations';
import type { SaveProfileInput } from '../../hooks/useMarketplaceAuth';
import { useJobProposalsForClient } from '../../hooks/useJobPosts';
import { mapProfileSaveError } from '../../utils/authHelpers';
import { isQuotationExpired } from '../../utils/marketplace';
import { JobLifecycleStepper } from '../BookingTimeline';

interface ClientDashboardProps {
  lang: LanguageCode;
  t: Translations;
  firebaseUser: User | null;
  userProfile: UserProfileRecord | null;
  platformFeePct: number;
  bookingActionError: string | null;
  onDismissError: () => void;
  bookings: BookingRecord[];
  myClientJobPosts: JobPostRecord[];
  jobActionError: string | null;
  onDismissJobError: () => void;
  onOpenPostJob: () => void;
  onCancelJobPost: (jobId: string) => Promise<void>;
  onRejectProposal?: (jobId: string, providerId: string) => Promise<void>;
  onAcceptProposal: (job: JobPostRecord, proposal: JobProposalRecord) => Promise<string>;
  onQuickSaveClientProfile: (input: SaveProfileInput) => Promise<void>;
  onExploreProviders: () => void;
  onOpenAuth: () => void;
  onOpenChat: (booking: BookingRecord) => void;
  onOpenBookingDetail: (booking: BookingRecord) => void;
  onOpenReschedule: (booking: BookingRecord) => void;
  onOpenCancel: (booking: BookingRecord) => void;
  onConfirmAndReleaseEscrow: (bookingId: string) => void;
  onOpenReview: (booking: BookingRecord) => void;
}

type ClientTab = 'jobs' | 'bookings';
type StatusFilter = 'all' | 'active' | 'completed' | 'cancelled';

interface JobProposalsPanelProps {
  job: JobPostRecord;
  lang: LanguageCode;
  t: Translations;
  expanded: boolean;
  onRejectProposal?: (jobId: string, providerId: string) => Promise<void>;
  onAcceptProposal: (job: JobPostRecord, proposal: JobProposalRecord) => Promise<string>;
  onAcceptedBooking: (bookingRef: string) => void;
}

const JobProposalsPanel: React.FC<JobProposalsPanelProps> = ({
  job,
  lang,
  t,
  expanded,
  onRejectProposal,
  onAcceptProposal,
  onAcceptedBooking,
}) => {
  const isAr = lang === 'ar';
  const { proposals, loading } = useJobProposalsForClient(job.id, expanded);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  if (!expanded) return null;

  const handleAccept = async (proposal: JobProposalRecord) => {
    setAcceptError(null);
    setAcceptingId(proposal.providerId);
    try {
      const bookingRef = await onAcceptProposal(job, proposal);
      onAcceptedBooking(bookingRef);
    } catch (err) {
      setAcceptError(mapProfileSaveError(err, lang));
    } finally {
      setAcceptingId(null);
    }
  };

  const handleReject = async (proposal: JobProposalRecord) => {
    if (!onRejectProposal) return;
    setAcceptError(null);
    setRejectingId(proposal.providerId);
    try {
      await onRejectProposal(job.id, proposal.providerId);
    } finally {
      setRejectingId(null);
    }
  };

  const activePendingQuotes = proposals.filter((p) => p.status === 'pending');
  const lowestPrice =
    activePendingQuotes.length > 1
      ? Math.min(...activePendingQuotes.map((p) => p.proposedPriceMad))
      : null;

  return (
    <div className="pt-3 border-t border-slate-100 space-y-3">
      {acceptError && (
        <div role="alert" className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
          {acceptError}
        </div>
      )}

      {loading ? (
        <p className="text-xs text-slate-500">
          {isAr ? 'جاري تحميل عروض المعلمين...' : 'Chargement des devis reçus...'}
        </p>
      ) : proposals.length === 0 ? (
        <p className="text-xs text-slate-500 py-2">
          {isAr
            ? 'لم يتقدم أي معلم بعرض بعد. طلبك ظاهر للمعلمين المعتمدين في مدينتك.'
            : 'Aucun devis reçu pour le moment. Votre annonce est visible par les Maâlems de votre ville.'}
        </p>
      ) : (
        <div className="space-y-3">
          {/* Side-by-Side Comparison Summary when 2+ quotations exist */}
          {proposals.length >= 2 && (
            <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2 text-[11px]">
              <div className="font-bold text-emerald-900">{t.quoteCompareTitle}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-start border-collapse">
                  <thead>
                    <tr className="border-b border-emerald-200 text-slate-600">
                      <th className="py-1 pe-2 text-start font-semibold">Maâlem</th>
                      <th className="py-1 px-2 text-start font-semibold">{t.laborCostLabel}</th>
                      <th className="py-1 px-2 text-start font-semibold">{t.materialsCostLabel}</th>
                      <th className="py-1 px-2 text-start font-semibold">Total</th>
                      <th className="py-1 ps-2 text-start font-semibold">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-100">
                    {proposals.map((p) => (
                      <tr key={`cmp-${p.id}`}>
                        <td className="py-1.5 pe-2 font-semibold text-slate-900">
                          {p.providerName}
                        </td>
                        <td className="py-1.5 px-2 tabular-nums text-slate-700">
                          {p.laborCostMad !== undefined
                            ? formatMadCurrency(p.laborCostMad, lang)
                            : '—'}
                        </td>
                        <td className="py-1.5 px-2 tabular-nums text-slate-700">
                          {p.materialsCostMad !== undefined
                            ? formatMadCurrency(p.materialsCostMad, lang)
                            : '—'}
                        </td>
                        <td className="py-1.5 px-2 font-bold tabular-nums text-emerald-800">
                          {formatMadCurrency(p.proposedPriceMad, lang)}
                        </td>
                        <td className="py-1.5 ps-2 tabular-nums text-amber-700 font-semibold">
                          ★ {p.providerRating.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {proposals.map((prop) => {
            const expired = isQuotationExpired(prop.validUntilIso);
            const isBestPrice = lowestPrice !== null && prop.proposedPriceMad === lowestPrice;
            const waUrl = buildWhatsAppUrl({
              phone: prop.providerPhone,
              lang,
              providerName: prop.providerName,
              category: t.categories[job.category],
              bookingRef: job.jobRef,
              serviceType: job.title,
            });
            return (
              <div
                key={prop.id}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900">{prop.providerName}</span>
                    {prop.providerVerified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <ShieldCheck className="w-3 h-3" />
                        <span>{t.verifiedCinLabel}</span>
                      </span>
                    )}
                    {isBestPrice && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-900">
                        {isAr ? 'أفضل سعر' : 'Meilleur tarif'}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-0.5 font-semibold text-amber-700 tabular-nums">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{prop.providerRating.toFixed(1)}</span>
                    </span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-emerald-700">
                    {formatMadCurrency(prop.proposedPriceMad, lang)}
                  </span>
                </div>

                {(prop.laborCostMad !== undefined || prop.materialsCostMad !== undefined) && (
                  <div className="flex flex-wrap items-center gap-3 text-[11px] bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700">
                    <span>
                      {t.laborCostLabel}:{' '}
                      <strong className="tabular-nums">
                        {formatMadCurrency(prop.laborCostMad ?? 0, lang)}
                      </strong>
                    </span>
                    <span>·</span>
                    <span>
                      {t.materialsCostLabel}:{' '}
                      <strong className="tabular-nums">
                        {formatMadCurrency(prop.materialsCostMad ?? 0, lang)}
                      </strong>
                    </span>
                    {prop.validUntilIso && (
                      <>
                        <span>·</span>
                        <span className={expired ? 'text-rose-700 font-semibold' : ''}>
                          {expired
                            ? t.quoteExpiredBadge
                            : `${t.quoteValidUntilLabel} ${prop.validUntilIso}`}
                        </span>
                      </>
                    )}
                  </div>
                )}

                <div className="text-[11px] text-slate-500">
                  {prop.estimatedDuration} · {t.cities[prop.providerCity]}
                  {prop.warrantyNote ? ` · ${prop.warrantyNote}` : ''}
                </div>
                <p className="text-slate-700 leading-relaxed">{prop.message}</p>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                  {job.status === 'open' && prop.status === 'pending' && onRejectProposal && (
                    <button
                      type="button"
                      disabled={rejectingId === prop.providerId}
                      onClick={() => {
                        void handleReject(prop);
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg disabled:opacity-50 cursor-pointer"
                    >
                      {t.rejectQuoteBtn}
                    </button>
                  )}
                  {job.status === 'open' && prop.status === 'pending' && !expired && (
                    <button
                      type="button"
                      disabled={acceptingId === prop.providerId}
                      onClick={() => {
                        void handleAccept(prop);
                      }}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-60 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {acceptingId === prop.providerId
                          ? isAr
                            ? 'جاري التأكيد...'
                            : 'Confirmation...'
                          : isAr
                          ? 'قبول هذا المعلم'
                          : 'Accepter ce devis'}
                      </span>
                    </button>
                  )}
                  {prop.status === 'accepted' && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-semibold">
                      {isAr ? 'تم اختياره ✓' : 'Devis accepté ✓'}
                    </span>
                  )}
                  {prop.status === 'rejected' && (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 font-semibold">
                      {isAr ? 'تم رفضه' : 'Refusé'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  lang,
  t,
  firebaseUser,
  userProfile,
  platformFeePct,
  bookingActionError,
  onDismissError,
  bookings,
  myClientJobPosts,
  jobActionError,
  onDismissJobError,
  onOpenPostJob,
  onCancelJobPost,
  onRejectProposal,
  onAcceptProposal,
  onQuickSaveClientProfile,
  onExploreProviders,
  onOpenAuth,
  onOpenChat,
  onOpenBookingDetail,
  onOpenReschedule,
  onOpenCancel,
  onConfirmAndReleaseEscrow,
  onOpenReview,
}) => {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<ClientTab>(
    myClientJobPosts.length > 0 ? 'jobs' : 'bookings'
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [acceptedBanner, setAcceptedBanner] = useState<string | null>(null);
  const providerSharePct = Math.max(0, 100 - platformFeePct);

  // Quick 15s Client Welcome Setup state (for newly verified clients without a profile yet)
  const [quickName, setQuickName] = useState(firebaseUser?.displayName || '');
  const [quickPhone, setQuickPhone] = useState('+2126');
  const [quickCity, setQuickCity] = useState<MoroccanCity>('Casablanca');
  const [quickQuartier, setQuickQuartier] = useState('');
  const [quickErrors, setQuickErrors] = useState<Record<string, string>>({});
  const [quickSaveError, setQuickSaveError] = useState<string | null>(null);
  const [isQuickSaving, setIsQuickSaving] = useState(false);

  // Strict client isolation: only bookings where clientId === firebaseUser.uid
  const clientBookings = useMemo(() => {
    if (!firebaseUser) return [];
    return bookings.filter((b) => b.clientId === firebaseUser.uid);
  }, [firebaseUser, bookings]);

  const metrics = useMemo(() => {
    let activeCount = 0;
    let completedCount = 0;
    let escrowHeldMad = 0;
    let pendingReviews = 0;

    for (const b of clientBookings) {
      if (b.status === 'pending' || b.status === 'accepted' || b.status === 'in_progress') {
        activeCount++;
      }
      if (b.status === 'completed' || b.status === 'reviewed') {
        completedCount++;
      }
      if (b.status === 'completed') {
        pendingReviews++;
      }
      if (b.paymentMethod === 'cmi_escrow' && b.paymentStatus === 'escrow_held') {
        escrowHeldMad += b.estimatedMad;
      }
    }
    return { activeCount, completedCount, escrowHeldMad, pendingReviews };
  }, [clientBookings]);

  const filteredBookings = useMemo(() => {
    if (statusFilter === 'all') return clientBookings;
    if (statusFilter === 'active') {
      return clientBookings.filter(
        (b) => b.status === 'pending' || b.status === 'accepted' || b.status === 'in_progress'
      );
    }
    if (statusFilter === 'completed') {
      return clientBookings.filter(
        (b) => b.status === 'completed' || b.status === 'reviewed'
      );
    }
    return clientBookings.filter((b) => b.status === 'cancelled');
  }, [clientBookings, statusFilter]);

  const handleQuickProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickSaveError(null);
    const check = validateUserProfileInput({
      role: 'client',
      fullName: quickName,
      phone: quickPhone,
      city: quickCity,
      neighborhood: quickQuartier,
      languagePref: lang,
    });
    if (!check.valid) {
      setQuickErrors(check.errors as Record<string, string>);
      return;
    }
    setQuickErrors({});
    setIsQuickSaving(true);
    try {
      await onQuickSaveClientProfile({
        role: 'client',
        fullName: quickName.trim(),
        phone: check.normalizedPhone,
        city: quickCity,
        neighborhood: quickQuartier.trim(),
        languagePref: lang,
        specialty: 'none',
        hourlyRateMad: 0,
        bio: '',
      });
    } catch (err) {
      setQuickSaveError(mapProfileSaveError(err, lang));
    } finally {
      setIsQuickSaving(false);
    }
  };

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
    if (status === 'paid') return isAr ? 'مدفوع ومؤكد' : 'Payé & validé';
    if (status === 'refunded') return isAr ? 'مسترجع 100%' : 'Remboursé 100%';
    if (status === 'disputed_split') return isAr ? 'تسوية نزاع (50/50)' : 'Arbitrage (50/50)';
    if (status === 'escrow_held') return isAr ? 'ضمان CMI محجوز' : 'Séquestre CMI protégé';
    return isAr ? 'الدفع عند الإنجاز' : 'À régler à la fin';
  };

  if (!firebaseUser) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-5 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-slate-900">
              {isAr ? 'سجّل الدخول لعرض فضاء الزبون' : 'Connectez-vous à votre Espace Client'}
            </h1>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              {isAr
                ? 'انشر طلباتك لتلقي عروض المعلمين وتابع حجوزاتك ومحادثاتك بأمان.'
                : 'Publiez vos besoins pour recevoir des devis et suivez vos réservations en toute sérénité.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={onOpenAuth}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{isAr ? 'تسجيل الدخول' : 'Connexion'}</span>
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 lg:py-9 space-y-7">
      {/* Client Header + Prominent Post Job & Explore CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isAr
              ? `مرحباً ${userProfile?.fullName?.split(' ')[0] || ''}`
              : `Bonjour${userProfile?.fullName ? `, ${userProfile.fullName.split(' ')[0]}` : ''}`}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {isAr
              ? 'انشر حاجتك ليتواصل معك المعلمون بعروضهم، أو تابع حجوزاتك المباشرة.'
              : 'Publiez un besoin pour recevoir des devis de Maâlems vérifiés, ou suivez vos réservations.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start">
          <button
            type="button"
            onClick={onOpenPostJob}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'نشر طلب خدمة جديد' : 'Publier un besoin'}</span>
          </button>
          <button
            type="button"
            onClick={onExploreProviders}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Compass className="w-4 h-4 text-emerald-700" />
            <span>{isAr ? 'استكشف المعلمين' : 'Explorer les Maâlems'}</span>
          </button>
        </div>
      </div>

      {/* Guided 15-Second Welcome Setup for New Verified Clients */}
      {!userProfile && (
        <form
          onSubmit={handleQuickProfileSubmit}
          noValidate
          className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-emerald-950">
                {isAr
                  ? 'أكمل ملفك في 15 ثانية لتسهيل حجوزاتك'
                  : 'Complétez vos coordonnées en 15 secondes'}
              </h2>
              <p className="text-xs text-emerald-800 mt-0.5">
                {isAr
                  ? 'ستُملأ بياناتك تلقائياً عند نشر الطلبات أو حجز أي معلم.'
                  : 'Vos informations seront pré-remplies automatiquement lors de vos demandes et réservations.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <input
                type="text"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                placeholder={t.fullNamePlaceholder}
                className="w-full px-3 py-2 text-xs bg-white border border-emerald-200 rounded-lg"
              />
              {quickErrors.fullName && (
                <p className="text-[11px] text-rose-600 mt-0.5">{quickErrors.fullName}</p>
              )}
            </div>
            <div>
              <input
                type="tel"
                dir="ltr"
                value={quickPhone}
                onChange={(e) => setQuickPhone(e.target.value)}
                placeholder="+212661234567"
                className="w-full px-3 py-2 text-xs font-mono-tabular bg-white border border-emerald-200 rounded-lg"
              />
              {quickErrors.phone && (
                <p className="text-[11px] text-rose-600 mt-0.5">{quickErrors.phone}</p>
              )}
            </div>
            <div>
              <select
                value={quickCity}
                onChange={(e) => setQuickCity(e.target.value as MoroccanCity)}
                className="w-full px-3 py-2 text-xs bg-white border border-emerald-200 rounded-lg"
              >
                {MOROCCAN_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {t.cities[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <input
                type="text"
                value={quickQuartier}
                onChange={(e) => setQuickQuartier(e.target.value)}
                placeholder={t.neighborhoodPlaceholder}
                className="w-full px-3 py-2 text-xs bg-white border border-emerald-200 rounded-lg"
              />
              {quickErrors.neighborhood && (
                <p className="text-[11px] text-rose-600 mt-0.5">{quickErrors.neighborhood}</p>
              )}
            </div>
          </div>

          {quickSaveError && <p className="text-xs text-rose-700">{quickSaveError}</p>}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isQuickSaving}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-60 cursor-pointer"
            >
              {isQuickSaving
                ? t.savingProfileBtn
                : isAr
                ? 'حفظ بياناتي'
                : 'Enregistrer mes coordonnées'}
            </button>
          </div>
        </form>
      )}

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-emerald-700" />
            <span>{isAr ? 'طلباتي المنشورة' : 'Besoins publiés'}</span>
          </div>
          <div className="text-2xl font-bold tabular-nums text-slate-900">
            {myClientJobPosts.filter((j) => j.status === 'open').length}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>{isAr ? 'حجوزات جارية' : 'Interventions actives'}</span>
          </div>
          <div className="text-2xl font-bold tabular-nums text-slate-900">
            {metrics.activeCount}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>{isAr ? 'ضمان CMI محجوز' : 'Séquestre CMI protégé'}</span>
          </div>
          <div className="text-2xl font-bold tabular-nums text-emerald-700">
            {formatMadCurrency(metrics.escrowHeldMad, lang)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span>{isAr ? 'خدمات مكتملة' : 'Interventions terminées'}</span>
          </div>
          <div className="text-2xl font-bold tabular-nums text-slate-900">
            {metrics.completedCount}
          </div>
        </div>
      </div>

      {acceptedBanner && (
        <div
          role="status"
          className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-950"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{acceptedBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setAcceptedBanner(null)}
            className="font-semibold text-emerald-800 hover:underline cursor-pointer"
          >
            {t.closeBtn}
          </button>
        </div>
      )}

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

      {/* Client Workspace Tabs */}
      <div role="tablist" className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'jobs'}
          onClick={() => setActiveTab('jobs')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
            activeTab === 'jobs'
              ? 'bg-emerald-700 text-white shadow-2xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>
            {isAr
              ? `طلباتي المنشورة والعروض (${myClientJobPosts.length})`
              : `Mes Besoins Publiés & Devis (${myClientJobPosts.length})`}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'bookings'}
          onClick={() => setActiveTab('bookings')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
            activeTab === 'bookings'
              ? 'bg-emerald-700 text-white shadow-2xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>
            {isAr
              ? `حجوزاتي المباشرة (${clientBookings.length})`
              : `Mes Réservations (${clientBookings.length})`}
          </span>
        </button>
      </div>

      {/* TAB 1: CLIENT'S POSTED JOBS & INCOMING MAÂLEM QUOTES */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          {myClientJobPosts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                <Briefcase className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-900">
                  {isAr
                    ? 'لم تنشر أي طلب خدمة بعد'
                    : 'Vous n’avez pas encore publié de besoin'}
                </h2>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  {isAr
                    ? 'انشر طلبك مجاناً مع الميزانية التقديرية، وسيقترح عليك المعلمون المعتمدون أفضل الأسعار.'
                    : 'Publiez votre besoin gratuitement avec votre budget estimé et comparez les devis des Maâlems vérifiés de votre ville.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenPostJob}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? 'نشر أول طلب خدمة' : 'Publier mon premier besoin'}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {myClientJobPosts.map((job) => {
                const isExpanded = expandedJobId === job.id;
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
                              <span>{isAr ? 'مستعجل' : 'Urgent'}</span>
                            </span>
                          )}
                          <span className="font-mono-tabular text-slate-400">#{job.jobRef}</span>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            job.status === 'open'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : job.status === 'assigned'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {job.status === 'open'
                            ? isAr
                              ? 'مفتوح للعروض'
                              : 'Ouvert aux devis'
                            : job.status === 'assigned'
                            ? isAr
                              ? `تم اختيار ${job.assignedProviderName || 'المعلم'}`
                              : `Attribué à ${job.assignedProviderName || 'un Maâlem'}`
                            : isAr
                            ? 'ملغى'
                            : 'Annulé'}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900">{job.title}</h3>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {t.cities[job.city]} ({job.neighborhood}) · {job.preferredDate} (
                          {job.preferredTimeSlot}) ·{' '}
                          <strong className="text-emerald-700 tabular-nums">
                            {formatMadCurrency(job.budgetMad, lang)}
                          </strong>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed">{job.description}</p>
                      <JobLifecycleStepper job={job} lang={lang} />
                    </div>

                    <div className="space-y-3">
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 cursor-pointer"
                        >
                          <span>
                            {isAr
                              ? `عرض عروض المعلمين (${job.proposalCount})`
                              : `Voir les devis reçus (${job.proposalCount})`}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {job.status === 'open' && (
                          <button
                            type="button"
                            onClick={() => {
                              void onCancelJobPost(job.id);
                            }}
                            className="text-xs font-medium text-rose-700 hover:underline cursor-pointer"
                          >
                            {isAr ? 'إلغاء الإعلان' : 'Annuler l’annonce'}
                          </button>
                        )}
                      </div>

                      <JobProposalsPanel
                        job={job}
                        lang={lang}
                        t={t}
                        expanded={isExpanded}
                        onRejectProposal={onRejectProposal}
                        onAcceptProposal={onAcceptProposal}
                        onAcceptedBooking={(ref) => {
                          setAcceptedBanner(
                            isAr
                              ? `تم قبول العرض وإنشاء الحجز رقم ${ref} بنجاح! يمكنك الآن بدء المحادثة في تبويب «حجوزاتي المباشرة».`
                              : `Devis accepté ! La réservation #${ref} est créée — retrouvez-la dans « Mes Réservations » pour discuter avec votre Maâlem.`
                          );
                          setActiveTab('bookings');
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DIRECT & ASSIGNED BOOKINGS */}
      {activeTab === 'bookings' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'all', labelFr: `Toutes (${clientBookings.length})`, labelAr: `الكل (${clientBookings.length})` },
                { id: 'active', labelFr: `Actives (${metrics.activeCount})`, labelAr: `جارية (${metrics.activeCount})` },
                { id: 'completed', labelFr: `Terminées (${metrics.completedCount})`, labelAr: `مكتملة (${metrics.completedCount})` },
                {
                  id: 'cancelled',
                  labelFr: `Annulées (${clientBookings.filter((b) => b.status === 'cancelled').length})`,
                  labelAr: `ملغاة (${clientBookings.filter((b) => b.status === 'cancelled').length})`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {isAr ? tab.labelAr : tab.labelFr}
              </button>
            ))}
          </div>

          {filteredBookings.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-900">
                  {statusFilter === 'all'
                    ? isAr
                      ? 'لا توجد حجوزات بعد'
                      : 'Aucune réservation pour le moment'
                    : isAr
                    ? 'لا توجد طلبات في هذه الفئة'
                    : 'Aucune réservation dans cette catégorie'}
                </h2>
                <p className="text-xs text-slate-600 max-w-md mx-auto">{t.noRequestsYet}</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={onOpenPostJob}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAr ? 'نشر طلب خدمة' : 'Publier un besoin'}</span>
                </button>
                <button
                  type="button"
                  onClick={onExploreProviders}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
                >
                  <Compass className="w-4 h-4" />
                  <span>{isAr ? 'استكشف المعلمين' : 'Explorer les Maâlems'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredBookings.map((booking) => {
                const whatsappUrl = buildWhatsAppUrl({
                  phone: booking.providerPhone,
                  lang,
                  providerName: booking.providerName,
                  category: t.categories[booking.category],
                  bookingRef: booking.bookingRef,
                  serviceType: booking.serviceType,
                });
                const split = calculateEscrowSplit(booking.estimatedMad, platformFeePct, 100);
                const providerPayout = booking.providerPayoutMad ?? split.providerPayoutMad;
                const platformFee = booking.platformFeeMad ?? split.platformFeeMad;

                return (
                  <div
                    key={booking.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4 shadow-2xs"
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {booking.providerName}
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
                          <span className="font-semibold text-amber-800">
                            {t.categories[booking.category]}
                          </span>{' '}
                          · <span className="font-medium text-slate-800">{booking.serviceType}</span>{' '}
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

                      {booking.status === 'reviewed' && booking.reviewRating && (
                        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-emerald-900">
                              {t.reviewSubmittedBadge}
                            </span>
                            <span className="inline-flex items-center gap-1 font-bold text-amber-600 tabular-nums">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span>{booking.reviewRating}/5</span>
                            </span>
                          </div>
                          {booking.reviewComment && (
                            <p className="text-slate-700">{booking.reviewComment}</p>
                          )}
                        </div>
                      )}
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
                            <FileText className="w-3.5 h-3.5 text-slate-600" />
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
                        {canTransitionBookingStatus(booking.status, 'reviewed', 'client') && (
                          <button
                            type="button"
                            onClick={() => onOpenReview(booking)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-lg cursor-pointer"
                          >
                            <Star className="w-3.5 h-3.5 fill-slate-900" />
                            <span>{t.leaveReviewBtn}</span>
                          </button>
                        )}

                        {(booking.status === 'pending' || booking.status === 'accepted') && (
                          <button
                            type="button"
                            onClick={() => onOpenReschedule(booking)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{isAr ? 'تعديل الموعد' : 'Reprogrammer'}</span>
                          </button>
                        )}

                        {canTransitionBookingStatus(booking.status, 'cancelled', 'client') && (
                          <button
                            type="button"
                            onClick={() => onOpenCancel(booking)}
                            className="text-xs text-rose-700 hover:underline font-medium cursor-pointer px-1.5"
                          >
                            {t.cancelRequestBtn}
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
    </div>
  );
};
