import { uiText, interpolateCopy } from '../../i18n/uiCopy';
import React, { useState, useMemo } from 'react';
import {
  Search,
  ShieldCheck,
  ShieldOff,
  Eye,
  Star,
  FileCheck2,
  X,
  Lock,
} from 'lucide-react';
import {
  MOROCCAN_CITIES,
  formatMadCurrency,
  type LanguageCode,
  type MoroccanCity,
  type VettedProvider,
} from '../../utils/marketplace';
import type { Translations } from '../../i18n/translations';

interface AdminProvidersSectionProps {
  lang: LanguageCode;
  t: Translations;
  providers: VettedProvider[];
  onToggleCinVerification: (provider: VettedProvider) => void;
  onToggleAvailability: (provider: VettedProvider) => void;
  onInspectProvider: (provider: VettedProvider) => void;
}

export const AdminProvidersSection: React.FC<AdminProvidersSectionProps> = ({
  lang,
  t,
  providers,
  onToggleCinVerification,
  onToggleAvailability,
  onInspectProvider,
}) => {
  const isAr = lang === 'ar';
  const [search, setSearch] = useState<string>('');
  const [cinFilter, setCinFilter] = useState<'all' | 'pending' | 'verified'>('all');
  const [cityFilter, setCityFilter] = useState<MoroccanCity | 'ALL'>('ALL');
  const [kycModalProvider, setKycModalProvider] = useState<VettedProvider | null>(null);

  const pendingCount = useMemo(
    () => providers.filter((p) => !p.verifiedBadge).length,
    [providers]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return providers.filter((p) => {
      if (cinFilter === 'pending' && p.verifiedBadge) return false;
      if (cinFilter === 'verified' && !p.verifiedBadge) return false;
      if (cityFilter !== 'ALL' && p.location.city !== cityFilter) return false;
      if (q) {
        const hay = [
          p.fullNameFr,
          p.fullNameAr,
          p.category,
          p.location.city,
          p.location.quartier,
          p.phone,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [providers, search, cinFilter, cityFilter]);

  return (
    <div className="space-y-5">
      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[210px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute top-2.5 start-3 pointer-events-none" />
            <input
              type="search"
              aria-label={uiText(isAr).admin.rechercherUnMaalem}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                uiText(isAr).admin.nomMetierQuartierOu212
              }
              className="w-full ps-9 pe-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <select
            aria-label={t.cityLabel}
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value as MoroccanCity | 'ALL')}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="ALL">{t.filterAllCities}</option>
            {MOROCCAN_CITIES.map((city) => (
              <option key={city} value={city}>
                {t.cities[city]}
              </option>
            ))}
          </select>
        </div>

        {/* Segmented CIN Status Filter */}
        <div
          role="group"
          aria-label="CIN Verification Filter"
          className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
        >
          <button
            type="button"
            onClick={() => setCinFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              cinFilter === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {interpolateCopy(uiText(isAr).admin.tous, { v0: providers.length })}
          </button>
          <button
            type="button"
            onClick={() => setCinFilter('pending')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              cinFilter === 'pending'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {interpolateCopy(uiText(isAr).admin.enAttenteCin, { v0: pendingCount })}
          </button>
          <button
            type="button"
            onClick={() => setCinFilter('verified')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              cinFilter === 'verified'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {interpolateCopy(uiText(isAr).admin.cinVerifiee, { v0: providers.length - pendingCount })}
          </button>
        </div>
      </div>

      {/* High-Density Providers & CIN Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4 text-start">{uiText(isAr).admin.maalemMetier}</th>
                <th className="py-3 px-4 text-start">{uiText(isAr).admin.villeQuartier}</th>
                <th className="py-3 px-4 text-start">{uiText(isAr).admin.telephone}</th>
                <th className="py-3 px-4 text-end">{uiText(isAr).admin.tarifH}</th>
                <th className="py-3 px-4 text-end">{uiText(isAr).admin.note}</th>
                <th className="py-3 px-4 text-start">{uiText(isAr).admin.disponibilite}</th>
                <th className="py-3 px-4 text-start">{uiText(isAr).admin.statutCin2}</th>
                <th className="py-3 px-4 text-end">{uiText(isAr).admin.actions2}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 px-4 text-center text-slate-500">
                    {uiText(isAr).admin.aucunPrestataireNeCorrespondACe}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        {isAr ? p.fullNameAr : p.fullNameFr}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {t.categories[p.category]} · {p.experienceYears} {t.experienceYears}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div className="font-medium">{t.cities[p.location.city]}</div>
                      <div className="text-[11px] text-slate-500">
                        {isAr ? p.location.quartierAr || p.location.quartier : p.location.quartier}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-700 whitespace-nowrap" dir="ltr">
                      {p.phone}
                    </td>
                    <td className="py-3 px-4 text-end font-mono-tabular font-semibold text-slate-900 whitespace-nowrap">
                      {formatMadCurrency(p.hourlyRateMAD, lang)}
                    </td>
                    <td className="py-3 px-4 text-end tabular-nums whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {p.ratingAvg.toFixed(1)}
                      </span>
                      <span className="text-slate-400 ms-1">({p.reviewCount})</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onToggleAvailability(p)}
                        className={`text-xs font-semibold hover:underline cursor-pointer ${
                          p.isAvailableNow ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        {p.isAvailableNow ? t.availableNowText : t.busyScheduledText}
                      </button>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {p.verifiedBadge ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{uiText(isAr).admin.cinVerifiee2}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                          <ShieldOff className="w-3.5 h-3.5" />
                          <span>{uiText(isAr).admin.enAttenteCin2}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-end whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setKycModalProvider(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <FileCheck2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>{uiText(isAr).admin.dossierKyc}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onInspectProvider(p)}
                          aria-label={`${uiText(isAr).admin.inspecter} ${p.fullNameFr}`}
                          className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleCinVerification(p)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                            p.verifiedBadge
                              ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
                              : 'text-white bg-emerald-700 hover:bg-emerald-800'
                          }`}
                        >
                          {p.verifiedBadge
                            ? uiText(isAr).admin.revoquerCin
                            : uiText(isAr).admin.approuverCin}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* KYC & CIN Verification Review Modal */}
      {kycModalProvider && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="kyc-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h2 id="kyc-modal-title" className="text-base font-bold text-slate-900">
                  {uiText(isAr).admin.revueDuDossierKycCin}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  {isAr ? kycModalProvider.fullNameAr : kycModalProvider.fullNameFr} ·{' '}
                  {t.cities[kycModalProvider.location.city]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setKycModalProvider(null)}
                aria-label={t.closeBtn}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">
                  {uiText(isAr).admin.statutCin}
                </span>
                <span className="font-mono-tabular font-bold text-slate-900">
                  {kycModalProvider.cinNumberMasked}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">
                  {uiText(isAr).admin.telephoneVerifie}
                </span>
                <span className="font-mono-tabular font-semibold text-slate-800" dir="ltr">
                  {kycModalProvider.phone}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">
                  {uiText(isAr).admin.qualificationDiplome}
                </span>
                <span className="font-semibold text-slate-800 text-end">
                  {isAr ? kycModalProvider.diplomaAr : kycModalProvider.diplomaFr}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
              <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                {uiText(isAr).admin.verifiezManuellementLaPieceCinEt}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setKycModalProvider(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                {t.closeBtn}
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleCinVerification(kycModalProvider);
                  setKycModalProvider(null);
                }}
                className={`px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer ${
                  kycModalProvider.verifiedBadge
                    ? 'text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100'
                    : 'text-white bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                {kycModalProvider.verifiedBadge
                  ? uiText(isAr).admin.revoquerCin2
                  : uiText(isAr).admin.approuverDossierCin}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
