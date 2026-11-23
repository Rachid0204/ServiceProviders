import { uiText } from '../../i18n/uiCopy';
import React from 'react';
import {
  computeQuotationTotals,
  formatMadCurrency,
  getTodayIsoDate,
  type LanguageCode,
} from '../../utils/marketplace';
import type { Translations } from '../../i18n/translations';

interface ProviderQuoteComposerProps {
  lang: LanguageCode;
  t: Translations;
  quoteLaborMad: number;
  setQuoteLaborMad: (v: number) => void;
  quoteMaterialsMad: number;
  setQuoteMaterialsMad: (v: number) => void;
  quoteValidUntil: string;
  setQuoteValidUntil: (v: string) => void;
  quoteWarranty: string;
  setQuoteWarranty: (v: string) => void;
  quoteDuration: string;
  setQuoteDuration: (v: string) => void;
  quoteMessage: string;
  setQuoteMessage: (v: string) => void;
  quoteErrors: Record<string, string>;
  quoteSubmitError: string | null;
  isSendingQuote: boolean;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ProviderQuoteComposer: React.FC<ProviderQuoteComposerProps> = ({
  lang,
  t,
  quoteLaborMad,
  setQuoteLaborMad,
  quoteMaterialsMad,
  setQuoteMaterialsMad,
  quoteValidUntil,
  setQuoteValidUntil,
  quoteWarranty,
  setQuoteWarranty,
  quoteDuration,
  setQuoteDuration,
  quoteMessage,
  setQuoteMessage,
  quoteErrors,
  quoteSubmitError,
  isSendingQuote,
  onCancel,
  onSubmit,
}) => {
  const isAr = lang === 'ar';

  return (
    <form
      onSubmit={onSubmit}
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
            {uiText(isAr).provider.totalDevis}
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
        <p className="text-[11px] text-rose-600">{quoteErrors.proposedPriceMad}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            {uiText(isAr).provider.disponibiliteDuree}
          </label>
          <input
            type="text"
            maxLength={64}
            value={quoteDuration}
            onChange={(e) => setQuoteDuration(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
          />
          {quoteErrors.estimatedDuration && (
            <p className="text-[11px] text-rose-600 mt-0.5">{quoteErrors.estimatedDuration}</p>
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
            {uiText(isAr).provider.garantieOptionnel}
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
          {uiText(isAr).provider.messageAuClient}
        </label>
        <textarea
          rows={2}
          maxLength={500}
          value={quoteMessage}
          onChange={(e) => setQuoteMessage(e.target.value)}
          placeholder={
            uiText(isAr).provider.presentezVotreExperienceSurCeType
          }
          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
        />
        {quoteErrors.message && (
          <p className="text-[11px] text-rose-600 mt-0.5">{quoteErrors.message}</p>
        )}
      </div>

      {quoteSubmitError && <p className="text-xs text-rose-700">{quoteSubmitError}</p>}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg cursor-pointer"
        >
          {uiText(isAr).common.annuler}
        </button>
        <button
          type="submit"
          disabled={isSendingQuote}
          className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-60 cursor-pointer"
        >
          {isSendingQuote
            ? uiText(isAr).provider.envoi
            : uiText(isAr).provider.envoyerMonDevis}
        </button>
      </div>
    </form>
  );
};
