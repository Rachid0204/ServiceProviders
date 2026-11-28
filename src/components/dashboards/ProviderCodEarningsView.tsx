import React, { useMemo } from 'react';
import { Banknote, Download } from 'lucide-react';
import { uiText } from '../../i18n/uiCopy';
import {
  formatMadCurrency,
  type BookingRecord,
  type LanguageCode,
} from '../../utils/marketplace';

interface ProviderCodEarningsViewProps {
  lang: LanguageCode;
  providerBookings: BookingRecord[];
  cashCollectedDirectlyMad: number;
}

export const ProviderCodEarningsView: React.FC<ProviderCodEarningsViewProps> = ({
  lang,
  providerBookings,
  cashCollectedDirectlyMad,
}) => {
  const isAr = lang === 'ar';

  const completedCodBookings = useMemo(
    () =>
      providerBookings.filter(
        (b) => b.status === 'completed' || b.status === 'reviewed'
      ),
    [providerBookings]
  );

  const handleDownloadEarningsCsv = () => {
    const header = [
      'bookingRef',
      'date',
      'clientName',
      'serviceType',
      'city',
      'paymentMethod',
      'amountMad',
      'status',
    ];
    const rows = completedCodBookings.map((b) =>
      [
        b.bookingRef,
        b.preferredDate,
        b.clientName,
        b.serviceType,
        b.city,
        b.paymentMethod,
        String(Math.round(b.estimatedMad)),
        b.status,
      ]
        .map((cell) => {
          const safe = String(cell ?? '').replace(/"/g, '""');
          return /[",\n\r]/.test(safe) ? `"${safe}"` : safe;
        })
        .join(',')
    );
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `revenus-maalem-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-5">
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Banknote className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-emerald-950">
              {uiText(isAr).provider.codLaunchBannerTitle}
            </h2>
            <p className="text-xs text-emerald-900 leading-relaxed max-w-2xl">
              {uiText(isAr).provider.codLaunchBannerBody}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDownloadEarningsCsv}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{uiText(isAr).provider.downloadMonthlyStatementCsv}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1">
          <div className="text-xs font-medium text-slate-500">
            {uiText(isAr).provider.encaisseDirectEspecesCod}
          </div>
          <div className="text-2xl font-bold tabular-nums text-emerald-700">
            {formatMadCurrency(cashCollectedDirectlyMad, lang)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1">
          <div className="text-xs font-medium text-slate-500">
            {uiText(isAr).client.interventionsTerminees}
          </div>
          <div className="text-2xl font-bold tabular-nums text-slate-900">
            {completedCodBookings.length}
          </div>
        </div>
      </div>

      {completedCodBookings.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="divide-y divide-slate-100">
            {completedCodBookings.map((b) => (
              <div
                key={b.id}
                className="py-3 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">
                    {b.serviceType}{' '}
                    <span className="font-mono-tabular font-normal text-slate-500">
                      #{b.bookingRef}
                    </span>
                  </div>
                  <div className="text-slate-500">
                    {b.clientName} · {b.preferredDate} · {b.city}
                  </div>
                </div>
                <span className="font-mono-tabular font-bold text-sm text-emerald-700">
                  {formatMadCurrency(b.estimatedMad, lang)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
