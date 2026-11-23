import { uiText } from '../../i18n/uiCopy';
import React, { useMemo, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  FileText,
  MapPin,
  MessageCircle,
  MessageSquare,
  Play,
  Star,
  XCircle,
} from 'lucide-react';
import {
  buildWhatsAppUrl,
  canTransitionBookingStatus,
  formatMadCurrency,
  type BookingRecord,
  type BookingStatus,
  type LanguageCode,
  type PaymentStatus,
  type UserRole,
  type VettedProvider,
} from '../../utils/marketplace';
import type { Translations } from '../../i18n/translations';

type MissionFilter = 'all' | 'pending' | 'active' | 'completed' | 'cancelled';

interface ProviderMissionsTabProps {
  lang: LanguageCode;
  t: Translations;
  ownProvider: VettedProvider;
  providerBookings: BookingRecord[];
  pendingCount: number;
  activeCount: number;
  completedCount: number;
  cashCollectedDirectlyMad: number;
  onGoToJobs: () => void;
  onOpenBookingDetail: (booking: BookingRecord) => void;
  onOpenChat: (booking: BookingRecord) => void;
  onOpenCancel: (booking: BookingRecord) => void;
  onUpdateBookingStatus: (
    bookingId: string,
    nextStatus: BookingStatus,
    actorRole: UserRole
  ) => void;
}

export const ProviderMissionsTab: React.FC<ProviderMissionsTabProps> = ({
  lang,
  t,
  ownProvider,
  providerBookings,
  pendingCount,
  activeCount,
  completedCount,
  cashCollectedDirectlyMad,
  onGoToJobs,
  onOpenBookingDetail,
  onOpenChat,
  onOpenCancel,
  onUpdateBookingStatus,
}) => {
  const isAr = lang === 'ar';
  const [missionFilter, setMissionFilter] = useState<MissionFilter>('all');

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
    if (status === 'paid') return uiText(isAr).provider.regle;
    if (status === 'refunded') return uiText(isAr).provider.rembourseClient;
    if (status === 'disputed_split') return uiText(isAr).provider.arbitrage5050;
    if (status === 'escrow_held') return uiText(isAr).provider.sequestreCmi;
    return uiText(isAr).provider.paiementSurPlace;
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
          <div className="text-xs font-medium text-slate-500">
            {uiText(isAr).provider.enAttente}
          </div>
          <div className="text-2xl font-bold tabular-nums text-amber-700">{pendingCount}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
          <div className="text-xs font-medium text-slate-500">
            {uiText(isAr).provider.enCours}
          </div>
          <div className="text-2xl font-bold tabular-nums text-blue-700">{activeCount}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
          <div className="text-xs font-medium text-slate-500">
            {uiText(isAr).provider.noteClients}
          </div>
          <div className="text-2xl font-bold tabular-nums text-slate-900 flex items-center gap-1.5">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            <span>{ownProvider.ratingAvg.toFixed(1)}</span>
            <span className="text-xs font-normal text-slate-500">({ownProvider.reviewCount})</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
          <div className="text-xs font-medium text-slate-500">
            {uiText(isAr).provider.encaisseEnEspecesCod}
          </div>
          <div className="text-2xl font-bold tabular-nums text-emerald-700">
            {formatMadCurrency(cashCollectedDirectlyMad, lang)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            {
              id: 'all',
              fr: `Toutes (${providerBookings.length})`,
              ar: `الكل (${providerBookings.length})`,
            },
            {
              id: 'pending',
              fr: `En attente (${pendingCount})`,
              ar: `في الانتظار (${pendingCount})`,
            },
            { id: 'active', fr: `En cours (${activeCount})`, ar: `قيد الإنجاز (${activeCount})` },
            {
              id: 'completed',
              fr: `Terminées (${completedCount})`,
              ar: `مكتملة (${completedCount})`,
            },
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
            {uiText(isAr).provider.aucuneMissionDansCetteCategorieConsultez}
          </p>
          <button
            type="button"
            onClick={onGoToJobs}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
          >
            {uiText(isAr).provider.voirLesOffresClients}
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
                      <span className="font-bold text-slate-900 text-sm">{booking.clientName}</span>
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
                      <span className="font-medium text-slate-900">{booking.serviceType}</span> ·{' '}
                      {t.cities[booking.city]} ({booking.neighborhood})
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

                  <p className="text-xs text-slate-700 leading-relaxed">{booking.description}</p>
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
                    {canTransitionBookingStatus(booking.status, 'cancelled', 'provider') && (
                      <button
                        type="button"
                        onClick={() => onOpenCancel(booking)}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 cursor-pointer"
                      >
                        {booking.status === 'pending' ? t.providerDeclineBtn : t.cancelRequestBtn}
                      </button>
                    )}
                    {canTransitionBookingStatus(booking.status, 'accepted', 'provider') && (
                      <button
                        type="button"
                        onClick={() => onUpdateBookingStatus(booking.id, 'accepted', 'provider')}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
                      >
                        {t.providerAcceptBtn}
                      </button>
                    )}
                    {canTransitionBookingStatus(booking.status, 'in_progress', 'provider') && (
                      <button
                        type="button"
                        onClick={() => onUpdateBookingStatus(booking.id, 'in_progress', 'provider')}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>{t.providerStartJobBtn}</span>
                      </button>
                    )}
                    {canTransitionBookingStatus(booking.status, 'completed', 'provider') && (
                      <button
                        type="button"
                        onClick={() => onUpdateBookingStatus(booking.id, 'completed', 'provider')}
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
  );
};
