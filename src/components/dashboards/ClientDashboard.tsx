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
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  calculateEscrowSplit,
  formatMadCurrency,
  buildWhatsAppUrl,
  canTransitionBookingStatus,
  type BookingRecord,
  type BookingStatus,
  type LanguageCode,
  type PaymentStatus,
} from '../../utils/marketplace';
import type { Translations } from '../../i18n/translations';

interface ClientDashboardProps {
  lang: LanguageCode;
  t: Translations;
  firebaseUser: User | null;
  platformFeePct: number;
  bookingActionError: string | null;
  onDismissError: () => void;
  bookings: BookingRecord[];
  onExploreProviders: () => void;
  onOpenAuth: () => void;
  onOpenChat: (booking: BookingRecord) => void;
  onOpenBookingDetail: (booking: BookingRecord) => void;
  onOpenReschedule: (booking: BookingRecord) => void;
  onOpenCancel: (booking: BookingRecord) => void;
  onConfirmAndReleaseEscrow: (bookingId: string) => void;
  onOpenReview: (booking: BookingRecord) => void;
}

type StatusFilter = 'all' | 'active' | 'completed' | 'cancelled';

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  lang,
  t,
  firebaseUser,
  platformFeePct,
  bookingActionError,
  onDismissError,
  bookings,
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const providerSharePct = Math.max(0, 100 - platformFeePct);

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
      return isAr ? 'مدفوع ومؤكد' : 'Payé & validé';
    }
    if (status === 'refunded') {
      return isAr ? 'مسترجع 100%' : 'Remboursé 100%';
    }
    if (status === 'disputed_split') {
      return isAr ? 'تسوية نزاع (50/50)' : 'Arbitrage (50/50)';
    }
    if (status === 'escrow_held') {
      return isAr ? 'ضمان CMI محجوز' : 'Séquestre CMI protégé';
    }
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
              {isAr ? 'سجّل الدخول لعرض طلباتك' : 'Connectez-vous pour accéder à vos réservations'}
            </h1>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              {isAr
                ? 'لضمان خصوصية بياناتك وحجوزاتك، يقتصر الوصول إلى لوحة الطلبات على حسابك الشخصي.'
                : 'Pour protéger la confidentialité de vos interventions, vos réservations et échanges sont accessibles uniquement depuis votre compte.'}
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
              {isAr ? 'العودة لتصفح المعلمين' : 'Explorer les Maâlems'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.myRequestsSectionTitle}</h1>
          <p className="text-sm text-slate-600 mt-1">{t.myRequestsSectionSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={onExploreProviders}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors self-start cursor-pointer"
        >
          <Compass className="w-4 h-4" />
          <span>{isAr ? 'حجز معلم جديد' : 'Trouver un Maâlem'}</span>
        </button>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>{isAr ? 'طلبات جارية' : 'Interventions actives'}</span>
          </div>
          <div className="text-2xl font-bold tabular-nums text-slate-900">
            {metrics.activeCount}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isAr ? 'خدمات مكتملة' : 'Interventions terminées'}</span>
          </div>
          <div className="text-2xl font-bold tabular-nums text-slate-900">
            {metrics.completedCount}
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
            <span>{isAr ? 'بانتظار تقييمك' : 'Avis à publier'}</span>
          </div>
          <div className="text-2xl font-bold tabular-nums text-amber-700">
            {metrics.pendingReviews}
          </div>
        </div>
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

      {/* Filter Bar */}
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

      {/* Bookings Grid or Empty State */}
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
          <button
            type="button"
            onClick={onExploreProviders}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>{isAr ? 'استكشف المعلمين المعتمدين' : 'Explorer les Maâlems vérifiés'}</span>
          </button>
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

                  {booking.paymentMethod === 'cmi_escrow' &&
                    booking.paymentStatus === 'paid' && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 flex items-center justify-between gap-2">
                        <span className="font-semibold">
                          {isAr
                            ? `تم صرف ضمان CMI (${providerSharePct}% / ${platformFeePct}%)`
                            : `Séquestre CMI libéré (${providerSharePct}% / ${platformFeePct}%)`}
                        </span>
                        <span className="font-mono-tabular font-bold">
                          {formatMadCurrency(providerPayout, lang)} ·{' '}
                          {formatMadCurrency(platformFee, lang)}
                        </span>
                      </div>
                    )}

                  {booking.paymentStatus === 'refunded' && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-900 flex items-center justify-between gap-2">
                      <span className="font-semibold">
                        {isAr ? 'تم استرجاع ضمان CMI بالكامل' : 'Séquestre CMI remboursé'}
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

                {/* Client Action Bar */}
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
                        <span>{t.openChatBtn}</span>
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
                              ? 'تأكيد وصرف ضمان CMI'
                              : 'Confirmer & Libérer CMI'}
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
  );
};
