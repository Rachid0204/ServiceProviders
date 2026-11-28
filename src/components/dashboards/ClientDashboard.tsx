import { uiText, interpolateCopy } from '../../i18n/uiCopy';
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
  RefreshCw,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  formatMadCurrency,
  buildWhatsAppUrl,
  canTransitionBookingStatus,
  type BookingRecord,
  type BookingStatus,
  type JobPostRecord,
  type JobProposalRecord,
  type LanguageCode,
  type PaymentStatus,
  type UserProfileRecord,
} from '../../utils/marketplace';
import type { Translations } from '../../i18n/translations';
import type { SaveProfileInput } from '../../hooks/useMarketplaceAuth';
import { ClientQuickProfileBar } from './ClientQuickProfileBar';
import { ClientJobsTab } from './ClientJobsTab';

interface ClientDashboardProps {
  lang: LanguageCode;
  t: Translations;
  firebaseUser: User | null;
  userProfile: UserProfileRecord | null;
  platformFeePct: number;
  cmiEscrowEnabled?: boolean;
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
  onRebookProvider?: (booking: BookingRecord) => void;
}

type ClientTab = 'jobs' | 'bookings';
type StatusFilter = 'all' | 'active' | 'completed' | 'cancelled';

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  lang,
  t,
  firebaseUser,
  userProfile,
  platformFeePct: _platformFeePct,
  cmiEscrowEnabled = false,
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
  onConfirmAndReleaseEscrow: _onConfirmAndReleaseEscrow,
  onOpenReview,
  onRebookProvider,
}) => {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<ClientTab>(
    myClientJobPosts.length > 0 ? 'jobs' : 'bookings'
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [acceptedBanner, setAcceptedBanner] = useState<string | null>(null);

  // Strict client isolation: only bookings where clientId === firebaseUser.uid
  const clientBookings = useMemo(() => {
    if (!firebaseUser) return [];
    return bookings.filter((b) => b.clientId === firebaseUser.uid);
  }, [firebaseUser, bookings]);

  const metrics = useMemo(() => {
    let activeCount = 0;
    let completedCount = 0;
    let escrowHeldMad = 0;
    let pendingQuotesCount = 0;

    for (const b of clientBookings) {
      if (b.status === 'pending' || b.status === 'accepted' || b.status === 'in_progress') {
        activeCount++;
      }
      if (b.status === 'completed' || b.status === 'reviewed') {
        completedCount++;
      }
      if (b.revisedQuote?.status === 'pending') {
        pendingQuotesCount++;
      }
      if (b.paymentMethod === 'cmi_escrow' && b.paymentStatus === 'escrow_held') {
        escrowHeldMad += b.estimatedMad;
      }
    }
    return { activeCount, completedCount, escrowHeldMad, pendingQuotesCount };
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
    if (status === 'paid') return uiText(isAr).client.payeValide;
    if (status === 'refunded') return uiText(isAr).common.rembourse100;
    if (status === 'disputed_split') return uiText(isAr).common.arbitrage5050;
    if (status === 'escrow_held') return uiText(isAr).client.sequestreCmiProtege;
    return uiText(isAr).client.aReglerALaFin;
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
              {uiText(isAr).client.connectezVousAVotreEspaceClient}
            </h1>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              {uiText(isAr).client.publiezVosBesoinsPourRecevoirDes}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={onOpenAuth}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{uiText(isAr).common.connexion}</span>
            </button>
            <button
              type="button"
              onClick={onExploreProviders}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              {uiText(isAr).client.explorerLesMaalems}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const showEscrowKpi = cmiEscrowEnabled || metrics.escrowHeldMad > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 lg:py-9 space-y-7">
      {/* Client Header + Prominent Post Job & Explore CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {interpolateCopy(uiText(isAr).client.bonjour, {
              v0: userProfile?.fullName ? `, ${userProfile.fullName.split(' ')[0]}` : '',
              v1: userProfile?.fullName?.split(' ')[0] || '',
            })}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {uiText(isAr).client.publiezUnBesoinPourRecevoirDes}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start">
          <button
            type="button"
            onClick={onOpenPostJob}
            className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{uiText(isAr).common.publierUnBesoin}</span>
          </button>
          <button
            type="button"
            onClick={onExploreProviders}
            className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Compass className="w-4 h-4 text-emerald-700" />
            <span>{uiText(isAr).common.explorerLesMaalems}</span>
          </button>
        </div>
      </div>

      {/* Guided 15-Second Welcome Setup for New Verified Clients */}
      {!userProfile && (
        <ClientQuickProfileBar
          lang={lang}
          t={t}
          initialDisplayName={firebaseUser.displayName || ''}
          onQuickSaveClientProfile={onQuickSaveClientProfile}
        />
      )}

      {/* KPI Summary Strip */}
      <div className={`grid grid-cols-2 ${showEscrowKpi ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-emerald-700" />
            <span>{uiText(isAr).client.besoinsPublies}</span>
          </div>
          <div className="text-2xl font-bold tabular-nums text-slate-900">
            {myClientJobPosts.filter((j) => j.status === 'open').length}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>{uiText(isAr).client.interventionsActives}</span>
          </div>
          <div className="text-2xl font-bold tabular-nums text-slate-900">
            {metrics.activeCount}
          </div>
        </div>

        {showEscrowKpi && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
            <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>{uiText(isAr).client.sequestreCmiProtege}</span>
            </div>
            <div className="text-2xl font-bold tabular-nums text-emerald-700">
              {formatMadCurrency(metrics.escrowHeldMad, lang)}
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span>{uiText(isAr).client.interventionsTerminees}</span>
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
      <div
        role="tablist"
        className="flex items-center gap-2 overflow-x-auto no-scrollbar sm:flex-wrap border-b border-slate-200 pb-3"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'jobs'}
          onClick={() => setActiveTab('jobs')}
          className={`inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
            activeTab === 'jobs'
              ? 'bg-emerald-700 text-white'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Briefcase className="w-4 h-4 shrink-0" />
          <span>
            {interpolateCopy(uiText(isAr).client.mesBesoinsPubliesDevis, {
              v0: myClientJobPosts.length,
            })}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'bookings'}
          onClick={() => setActiveTab('bookings')}
          className={`inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
            activeTab === 'bookings'
              ? 'bg-emerald-700 text-white'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4 shrink-0" />
          <span>
            {interpolateCopy(uiText(isAr).client.mesReservations, {
              v0: clientBookings.length,
            })}
          </span>
        </button>
      </div>

      {/* TAB 1: CLIENT'S POSTED JOBS & INCOMING MAÂLEM QUOTES */}
      {activeTab === 'jobs' && (
        <ClientJobsTab
          lang={lang}
          t={t}
          myClientJobPosts={myClientJobPosts}
          onOpenPostJob={onOpenPostJob}
          onCancelJobPost={onCancelJobPost}
          onRejectProposal={onRejectProposal}
          onAcceptProposal={onAcceptProposal}
          onAcceptedBooking={(ref) => {
            setAcceptedBanner(
              interpolateCopy(uiText(isAr).client.devisAccepteLaReservationEstCreee, { v0: ref })
            );
            setActiveTab('bookings');
          }}
        />
      )}

      {/* TAB 2: DIRECT & ASSIGNED BOOKINGS */}
      {activeTab === 'bookings' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                {
                  id: 'all',
                  labelFr: `Toutes (${clientBookings.length})`,
                  labelAr: `الكل (${clientBookings.length})`,
                },
                {
                  id: 'active',
                  labelFr: `Actives (${metrics.activeCount})`,
                  labelAr: `جارية (${metrics.activeCount})`,
                },
                {
                  id: 'completed',
                  labelFr: `Terminées (${metrics.completedCount})`,
                  labelAr: `مكتملة (${metrics.completedCount})`,
                },
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
                    ? uiText(isAr).client.aucuneReservationPourLeMoment
                    : uiText(isAr).client.aucuneReservationDansCetteCategorie}
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
                  <span>{uiText(isAr).client.publierUnBesoin}</span>
                </button>
                <button
                  type="button"
                  onClick={onExploreProviders}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
                >
                  <Compass className="w-4 h-4" />
                  <span>{uiText(isAr).common.explorerLesMaalems}</span>
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

                      {booking.revisedQuote?.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => onOpenBookingDetail(booking)}
                          className="w-full p-3 bg-amber-50 border border-amber-200 rounded-lg text-start text-xs text-amber-950 flex items-center justify-between gap-2 hover:bg-amber-100/70 transition-colors cursor-pointer"
                        >
                          <span className="font-semibold">
                            {uiText(isAr).booking.revisedQuotePendingClient}
                          </span>
                          <span className="font-mono-tabular font-bold shrink-0">
                            {formatMadCurrency(booking.revisedQuote.totalMad, lang)}
                          </span>
                        </button>
                      )}

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
                            <span>{uiText(isAr).common.details}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenChat(booking)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                            <span>{t.openChatBtn}</span>
                          </button>

                          {whatsappUrl && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                        {(booking.status === 'completed' || booking.status === 'reviewed') &&
                          onRebookProvider && (
                            <button
                              type="button"
                              onClick={() => onRebookProvider(booking)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>{uiText(isAr).booking.rebookProviderBtn}</span>
                            </button>
                          )}

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
                            <span>{uiText(isAr).client.reprogrammer}</span>
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
