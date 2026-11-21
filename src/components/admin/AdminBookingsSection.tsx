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
    if (b.paymentStatus === 'paid') return isAr ? 'مدفوع (90/10)' : 'Payé (90/10)';
    if (b.paymentStatus === 'refunded') return isAr ? 'مسترجع 100%' : 'Remboursé 100%';
    if (b.paymentStatus === 'disputed_split') {
      return isAr ? 'تسوية نزاع (50/50)' : 'Arbitrage (50/50)';
    }
    if (b.paymentStatus === 'escrow_held') {
      return isAr ? 'ضمان CMI محجوز' : 'Séquestre CMI bloqué';
    }
    return isAr ? 'عند الإنجاز' : 'À régler (COD)';
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
              aria-label={isAr ? 'بحث في الحجوزات...' : 'Rechercher une réservation...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAr ? 'المرجع #MK، الزبون أو المعلم...' : 'Réf #MK, client ou Maâlem...'}
              className="w-full ps-9 pe-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <select
            aria-label={isAr ? 'تصفية حسب الحالة' : 'Filtrer par statut'}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BookingStatus | 'ALL')}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="ALL">{isAr ? 'جميع الحالات' : 'Tous les statuts'}</option>
            {ALL_STATUSES.map((st) => (
              <option key={st} value={st}>
                {getStatusLabel(st)}
              </option>
            ))}
          </select>

          <select
            aria-label={isAr ? 'طريقة الدفع' : 'Mode de paiement'}
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as PaymentMethod | 'ALL')}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="ALL">{isAr ? 'كل طرق الدفع' : 'Tous paiements'}</option>
            <option value="cmi_escrow">{isAr ? 'ضمان CMI الإلكتروني' : 'Séquestre CMI'}</option>
            <option value="cash_on_completion">
              {isAr ? 'الدفع عند الخدمة (COD)' : 'Espèces fin de travaux (COD)'}
            </option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isAr ? 'تصدير CSV' : 'Exporter CSV'}</span>
        </button>
      </div>

      {/* High-Density Bookings & Escrow Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4 text-start">{isAr ? 'المرجع والتاريخ' : 'Réf & Créneau'}</th>
                <th className="py-3 px-4 text-start">{isAr ? 'الزبون ← المعلم' : 'Client → Maâlem'}</th>
                <th className="py-3 px-4 text-start">{isAr ? 'الخدمة والمدينة' : 'Service & Ville'}</th>
                <th className="py-3 px-4 text-end">{isAr ? 'المبلغ والتوزيع' : 'Montant & Ventilation'}</th>
                <th className="py-3 px-4 text-start">{isAr ? 'حالة الدفع / CMI' : 'Paiement / CMI'}</th>
                <th className="py-3 px-4 text-start">{isAr ? 'حالة الطلب (تحكم)' : 'Statut (Override)'}</th>
                <th className="py-3 px-4 text-end">{isAr ? 'إجراءات الضمان' : 'Actions Séquestre'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 px-4 text-center text-slate-500">
                    {isAr
                      ? 'لا توجد حجوزات تطابق معايير البحث الحالية.'
                      : 'Aucune réservation ne correspond à ce filtre.'}
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
                            ? `${isAr ? 'مسترجع:' : 'Remboursé:'} ${refundMad || b.estimatedMad} DH`
                            : `${payoutMad} DH (90%) / ${feeMad} DH (10%)`}
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
                          {b.paymentMethod === 'cmi_escrow' &&
                            b.paymentStatus === 'escrow_held' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onReleaseEscrow(b)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-lg transition-colors cursor-pointer"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>{isAr ? 'صرف (90/10)' : 'Libérer (90/10)'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onRefundEscrow(b)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>{isAr ? 'إرجاع 100%' : 'Rembourser'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDisputeSplitEscrow(b)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Scale className="w-3.5 h-3.5" />
                                  <span>{isAr ? 'نزاع 50/50' : 'Litige 50/50'}</span>
                                </button>
                              </>
                            )}
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
