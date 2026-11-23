import { uiText } from '../../i18n/uiCopy';
import React, { useState, useMemo } from 'react';
import {
  Search,
  CreditCard,
  MessageSquare,
  Download,
  RotateCcw,
  Scale,
} from 'lucide-react';
import {
  calculateEscrowSplit,
  formatMadCurrency,
  type BookingRecord,
  type BookingStatus,
  type LanguageCode,
  type PaymentMethod,
} from '../../utils/marketplace';
import { generateBookingsCsv } from '../../utils/adminMetrics';
import type { Translations } from '../../i18n/translations';

interface AdminBookingsSectionProps {
  lang: LanguageCode;
  t: Translations;
  bookings: BookingRecord[];
  platformFeePct?: number;
  onReleaseEscrow: (booking: BookingRecord) => void;
  onRefundEscrow: (booking: BookingRecord) => void;
  onDisputeSplitEscrow: (booking: BookingRecord) => void;
  onOverrideStatus: (booking: BookingRecord, nextStatus: BookingStatus) => void;
  onOpenChat: (booking: BookingRecord) => void;
}

const ALL_STATUSES: BookingStatus[] = [
  'pending',
  'accepted',
  'in_progress',
  'completed',
  'reviewed',
  'cancelled',
];

export const AdminBookingsSection: React.FC<AdminBookingsSectionProps> = ({
  lang,
  t,
  bookings,
  platformFeePct = 10,
  onReleaseEscrow,
  onRefundEscrow,
  onDisputeSplitEscrow,
  onOverrideStatus,
  onOpenChat,
}) => {
  const isAr = lang === 'ar';
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'ALL'>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'ALL'>('ALL');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
      if (paymentFilter !== 'ALL' && b.paymentMethod !== paymentFilter) return false;
      if (q) {
        const hay = [
          b.bookingRef,
          b.clientName,
          b.providerName,
          b.city,
          b.neighborhood,
          b.serviceType,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [bookings, search, statusFilter, paymentFilter]);

  const handleExportCsv = () => {
    const csv = generateBookingsCsv(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moul-lkhedma-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getPaymentStatusLabel = (b: BookingRecord): string => {
    if (b.paymentStatus === 'paid') return uiText(isAr).admin.paye9010;
    if (b.paymentStatus === 'refunded') return uiText(isAr).common.rembourse100;
    if (b.paymentStatus === 'disputed_split') {
      return uiText(isAr).common.arbitrage5050;
    }
    if (b.paymentStatus === 'escrow_held') {
      return uiText(isAr).admin.sequestreCmiBloque2;
    }
    return uiText(isAr).admin.aReglerCod;
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

  return (
    <div className="space-y-5">
      {/* Filter & Export Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute top-2.5 start-3 pointer-events-none" />
            <input
              type="search"
              aria-label={uiText(isAr).admin.rechercherUneReservation}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={uiText(isAr).admin.refMkClientOuMaalem}
              className="w-full ps-9 pe-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <select
            aria-label={uiText(isAr).admin.filtrerParStatut}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BookingStatus | 'ALL')}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="ALL">{uiText(isAr).admin.tousLesStatuts}</option>
            {ALL_STATUSES.map((st) => (
              <option key={st} value={st}>
                {getStatusLabel(st)}
              </option>
            ))}
          </select>

          <select
            aria-label={uiText(isAr).admin.modeDePaiement}
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as PaymentMethod | 'ALL')}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="ALL">{uiText(isAr).admin.tousPaiements}</option>
            <option value="cmi_escrow">{uiText(isAr).admin.sequestreCmi}</option>
            <option value="cash_on_completion">
              {uiText(isAr).admin.especesFinDeTravauxCod}
            </option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{uiText(isAr).admin.exporterCsv}</span>
        </button>
      </div>

      {/* High-Density Bookings & Escrow Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4 text-start">{uiText(isAr).admin.refCreneau}</th>
                <th className="py-3 px-4 text-start">{uiText(isAr).admin.clientMaalem2}</th>
                <th className="py-3 px-4 text-start">{uiText(isAr).admin.serviceVille}</th>
                <th className="py-3 px-4 text-end">{uiText(isAr).admin.montantVentilation}</th>
                <th className="py-3 px-4 text-start">{uiText(isAr).admin.paiementCmi}</th>
                <th className="py-3 px-4 text-start">{uiText(isAr).admin.statutOverride}</th>
                <th className="py-3 px-4 text-end">{uiText(isAr).admin.actionsSequestre}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 px-4 text-center text-slate-500">
                    {uiText(isAr).admin.aucuneReservationNeCorrespondACe}
                  </td>
                </tr>
              ) : (
                filtered.map((b) => {
                  const split = calculateEscrowSplit(b.estimatedMad, platformFeePct, 100);
                  const payoutMad = b.providerPayoutMad ?? split.providerPayoutMad;
                  const feeMad = b.platformFeeMad ?? split.platformFeeMad;
                  const refundMad = b.refundedClientMad ?? 0;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono-tabular font-bold text-slate-900">
                          #{b.bookingRef}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono-tabular mt-0.5">
                          {b.preferredDate}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{b.clientName}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">→ {b.providerName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{b.serviceType}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {t.categories[b.category]} · {t.cities[b.city]} ({b.neighborhood})
                        </div>
                      </td>
                      <td className="py-3 px-4 text-end font-mono-tabular whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {formatMadCurrency(b.estimatedMad, lang)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {b.paymentStatus === 'refunded'
                            ? `${uiText(isAr).admin.rembourse} ${refundMad || b.estimatedMad} DH`
                            : `${payoutMad} DH (${Math.max(0, 100 - platformFeePct)}%) / ${feeMad} DH (${platformFeePct}%)`}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div
                          className={`font-semibold ${
                            b.paymentStatus === 'paid'
                              ? 'text-emerald-700'
                              : b.paymentStatus === 'refunded'
                              ? 'text-rose-700'
                              : b.paymentStatus === 'disputed_split'
                              ? 'text-blue-700'
                              : b.paymentStatus === 'escrow_held'
                              ? 'text-amber-700'
                              : 'text-slate-600'
                          }`}
                        >
                          {getPaymentStatusLabel(b)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {b.paymentMethod === 'cmi_escrow' ? 'CMI Escrow' : 'COD'}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <select
                          aria-label={`Statut #${b.bookingRef}`}
                          value={b.status}
                          onChange={(e) =>
                            onOverrideStatus(b, e.target.value as BookingStatus)
                          }
                          className="px-2.5 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                        >
                          {ALL_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {getStatusLabel(st)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4 text-end whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenChat(b)}
                            aria-label={`${t.openChatBtn} #${b.bookingRef}`}
                            className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
