import React from 'react';
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
  Calendar,
  FileText,
} from 'lucide-react';
import {
  calculateEscrowSplit,
  formatMadCurrency,
  buildWhatsAppUrl,
  canTransitionBookingStatus,
  type BookingRecord,
  type BookingStatus,
  type ChatMessageRecord,
  type LanguageCode,
  type PaymentStatus,
  type UserRole,
  type VettedProvider,
} from '../utils/marketplace';
import type { Translations } from '../i18n/translations';

interface BookingsDashboardProps {
  lang: LanguageCode;
  t: Translations;
  dashboardTab: 'client' | 'provider';
  onChangeDashboardTab: (tab: 'client' | 'provider') => void;
  allProviders: VettedProvider[];
  activeMaalemProvider: VettedProvider | undefined;
  onSelectActiveMaalemId: (id: string) => void;
  onToggleProviderAvailability: (provider: VettedProvider) => void;
  bookings: BookingRecord[];
  chatThreads: Record<string, ChatMessageRecord[]>;
  onOpenChat: (booking: BookingRecord) => void;
  onOpenBookingDetail: (booking: BookingRecord) => void;
  onOpenReschedule: (booking: BookingRecord) => void;
  onOpenCancel: (booking: BookingRecord) => void;
  onConfirmAndReleaseEscrow: (bookingId: string) => void;
  onUpdateBookingStatus: (
    bookingId: string,
    nextStatus: BookingStatus,
    actorRole: UserRole
  ) => void;
  onOpenReview: (booking: BookingRecord) => void;
}

export const BookingsDashboard: React.FC<BookingsDashboardProps> = ({
  lang,
  t,
  dashboardTab,
  onChangeDashboardTab,
  allProviders,
  activeMaalemProvider,
  onSelectActiveMaalemId,
  onToggleProviderAvailability,
  bookings,
  chatThreads,
  onOpenChat,
  onOpenBookingDetail,
  onOpenReschedule,
  onOpenCancel,
  onConfirmAndReleaseEscrow,
  onUpdateBookingStatus,
  onOpenReview,
}) => {
  const isAr = lang === 'ar';

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
    if (status === 'paid') {
      return isAr ? 'مدفوع (90% معلم / 10% عمولة)' : 'Payé (90% Maâlem / 10% Frais)';
    }
    if (status === 'refunded') {
      return isAr ? 'مسترجع 100% للزبون' : 'Remboursé 100% Client';
    }
    if (status === 'disputed_split') {
      return isAr ? 'تسوية نزاع (50% / 50%)' : 'Arbitrage Litige (50/50)';
    }
    if (status === 'escrow_held') {
      return isAr ? 'ضمان CMI محجوز' : 'Séquestre CMI bloqué';
    }
    return isAr ? 'الدفع عند الإنجاز' : 'À régler à la fin';
  };

  return (
    <div className="space-y-6">
      {/* Header + Dual Dashboard Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.myRequestsSectionTitle}</h2>
          <p className="text-xs text-slate-600 mt-1">{t.myRequestsSectionSubtitle}</p>
        </div>

        <div
          role="tablist"
          aria-label="Dashboard Role View"
          className="inline-flex items-center gap-1 p-1 bg-slate-200/80 rounded-xl self-start"
        >
          <button
            type="button"
            role="tab"
            aria-selected={dashboardTab === 'client'}
            onClick={() => onChangeDashboardTab('client')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              dashboardTab === 'client'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.clientDashboardTab}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={dashboardTab === 'provider'}
            onClick={() => onChangeDashboardTab('provider')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              dashboardTab === 'provider'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.providerDashboardTab}
          </button>
        </div>
      </div>

      {/* Provider Dashboard Bar: Active Maâlem Selector & Availability Toggle */}
      {dashboardTab === 'provider' && activeMaalemProvider && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
          <div className="flex flex-wrap items-center gap-3">
            <Wrench className="w-5 h-5 text-emerald-700 shrink-0" />
            <div>
              <label
                htmlFor="active-maalem-select"
                className="block text-[11px] text-slate-500 font-medium"
              >
                {isAr
                  ? 'حساب المعلم النشط في اللوحة'
                  : 'Profil Maâlem actif dans le tableau de bord'}
              </label>
              <select
                id="active-maalem-select"
                value={activeMaalemProvider.id}
                onChange={(e) => onSelectActiveMaalemId(e.target.value)}
                className="mt-0.5 text-sm font-bold text-slate-900 bg-transparent border-b border-slate-300 focus:outline-none focus:border-emerald-600"
              >
                {allProviders.map((p) => (
                  <option key={p.id} value={p.id}>
                    {isAr ? p.fullNameAr : p.fullNameFr} ({t.categories[p.category]})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-700">
              {t.providerAvailabilityLabel}:
            </span>
            <button
              type="button"
              onClick={() => onToggleProviderAvailability(activeMaalemProvider)}
              aria-pressed={activeMaalemProvider.isAvailableNow}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                activeMaalemProvider.isAvailableNow
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {activeMaalemProvider.isAvailableNow
                ? t.availableNowText
                : t.busyScheduledText}
            </button>
          </div>
        </div>
      )}

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-xs text-slate-600">
          {t.noRequestsYet}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {bookings.map((booking) => {
            const whatsappUrl = buildWhatsAppUrl({
              phone:
                dashboardTab === 'client' ? booking.providerPhone : booking.clientPhone,
              lang,
              providerName: booking.providerName,
              category: t.categories[booking.category],
              bookingRef: booking.bookingRef,
              serviceType: booking.serviceType,
            });
            const threadCount = (chatThreads[booking.id] || []).length;
            const split = calculateEscrowSplit(booking.estimatedMad, 10, 100);
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
                        {dashboardTab === 'provider'
                          ? `${booking.clientName} → ${booking.providerName}`
                          : booking.providerName}
                      </span>
                      <span className="font-mono-tabular text-slate-500">
                        #{booking.bookingRef}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        booking.status === 'cancelled'
                          ? 'text-rose-700'
                          : booking.status === 'completed' || booking.status === 'reviewed'
                          ? 'text-emerald-700'
                          : booking.status === 'in_progress'
                          ? 'text-blue-700'
                          : 'text-amber-700'
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
                        <span>
                          {booking.paymentMethod === 'cmi_escrow'
                            ? t.paymentCmiLabel
                            : t.paymentCashLabel}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span
                          className={`font-semibold ${
                            booking.paymentStatus === 'paid'
                              ? 'text-emerald-700'
                              : booking.paymentStatus === 'refunded'
                              ? 'text-rose-700'
                              : booking.paymentStatus === 'disputed_split'
                              ? 'text-blue-700'
                              : booking.paymentStatus === 'escrow_held'
                              ? 'text-amber-700'
                              : 'text-slate-600'
                          }`}
                        >
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

                  {/* 90/10 Escrow Settlement or Auto-Refund Pill Banner */}
                  {booking.paymentMethod === 'cmi_escrow' &&
                    booking.paymentStatus === 'paid' && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 flex items-center justify-between gap-2">
                        <span className="font-semibold">
                          {isAr
                            ? 'تم صرف ضمان CMI (90% / 10%)'
                            : 'Séquestre CMI libéré (90% / 10%)'}
                        </span>
                        <span className="font-mono-tabular font-bold">
                          {formatMadCurrency(providerPayout, lang)} Maâlem ·{' '}
                          {formatMadCurrency(platformFee, lang)} Frais
                        </span>
                      </div>
                    )}

                  {booking.paymentStatus === 'refunded' && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-900 flex items-center justify-between gap-2">
                      <span className="font-semibold">
                        {isAr ? 'تم استرجاع ضمان CMI للزبون' : 'Séquestre CMI remboursé au client'}
                      </span>
                      <span className="font-mono-tabular font-bold">
                        {formatMadCurrency(
                          booking.refundedClientMad ?? booking.estimatedMad,
                          lang
                        )}
                      </span>
                    </div>
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

                {/* Action Bar: Price + Detail + Chat + WhatsApp + Strict Role Lifecycle Controls */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="tabular-nums font-bold text-sm text-slate-900">
                      {formatMadCurrency(booking.estimatedMad, lang)}
                    </span>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenBookingDetail(booking)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-600" />
                        <span>{isAr ? 'التفاصيل' : 'Détails'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenChat(booking)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                        <span>
                          {t.openChatBtn} ({threadCount})
                        </span>
                      </button>

                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>

                  {dashboardTab === 'provider' ? (
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
                  ) : (
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      {booking.paymentMethod === 'cmi_escrow' &&
                        booking.paymentStatus === 'escrow_held' &&
                        (booking.status === 'completed' || booking.status === 'reviewed') && (
                          <button
                            type="button"
                            onClick={() => onConfirmAndReleaseEscrow(booking.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>
                              {isAr
                                ? 'تأكيد وصرف ضمان CMI (90%/10%)'
                                : 'Confirmer & Libérer CMI (90%/10%)'}
                            </span>
                          </button>
                        )}

                      {canTransitionBookingStatus(booking.status, 'reviewed', 'client') && (
                        <button
                          type="button"
                          onClick={() => onOpenReview(booking)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-lg transition-colors cursor-pointer"
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
                          <span>{isAr ? 'جدولة' : 'Reprogrammer'}</span>
                        </button>
                      )}

                      {canTransitionBookingStatus(booking.status, 'cancelled', 'client') && (
                        <button
                          type="button"
                          onClick={() => onOpenCancel(booking)}
                          className="text-xs text-rose-700 hover:underline font-medium cursor-pointer"
                        >
                          {t.cancelRequestBtn}
                        </button>
                      )}
                    </div>
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
