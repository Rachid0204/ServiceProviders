import { uiText } from '../../i18n/uiCopy';
import React from 'react';
import { ArrowRight, ArrowLeft, ShieldCheck, CreditCard, Star } from 'lucide-react';
import {
  formatMadCurrency,
  type BookingRecord,
  type LanguageCode,
  type VettedProvider,
} from '../../utils/marketplace';
import type { AdminAnalyticsSummary } from '../../utils/adminMetrics';
import type { Translations } from '../../i18n/translations';

interface AdminOverviewSectionProps {
  lang: LanguageCode;
  t: Translations;
  analytics: AdminAnalyticsSummary;
  pendingProviders: VettedProvider[];
  escrowBookings: BookingRecord[];
  onApproveCin: (provider: VettedProvider) => void;
  onReleaseEscrow: (booking: BookingRecord) => void;
  onNavigateSection: (section: 'providers' | 'bookings') => void;
}

export const AdminOverviewSection: React.FC<AdminOverviewSectionProps> = ({
  lang,
  t,
  analytics,
  pendingProviders,
  escrowBookings,
  onApproveCin,
  onReleaseEscrow,
  onNavigateSection,
}) => {
  const isAr = lang === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;
  const maxCategoryRevenue = Math.max(
    1,
    ...analytics.categoryBreakdown.map((c) => c.revenueMad)
  );
  const maxCityProviders = Math.max(
    1,
    ...analytics.cityBreakdown.map((c) => c.providersCount)
  );

  return (
    <div className="space-y-8">
      {/* 4-Column Flat Hairline-Divided KPI Strip */}
      <div className="bg-white border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <div className="p-5 space-y-1.5">
          <div className="text-xs font-medium text-slate-500">
            {uiText(isAr).admin.volumeBrutDAffairesGmv}
          </div>
          <div className="text-2xl font-bold tabular-nums text-slate-900">
            {formatMadCurrency(analytics.totalGmvMad, lang)}
          </div>
          <div className="text-xs text-slate-600 tabular-nums">
            {uiText(isAr).admin.encaisse}{' '}
            <span className="font-semibold text-emerald-700">
              {formatMadCurrency(analytics.settledRevenueMad, lang)}
            </span>
          </div>
        </div>

        <div className="p-5 space-y-1.5 border-t sm:border-t-0 sm:border-s border-slate-200">
          <div className="text-xs font-medium text-slate-500">
            {uiText(isAr).admin.sequestreCmiBloque}
          </div>
          <div className="text-2xl font-bold tabular-nums text-amber-700">
            {formatMadCurrency(analytics.escrowHeldMad, lang)}
          </div>
          <div className="text-xs text-slate-600 tabular-nums">
            {analytics.escrowHeldCount}{' '}
            {uiText(isAr).admin.dossiersEnAttenteDeLiberation}
          </div>
        </div>

        <div className="p-5 space-y-1.5 border-t xl:border-t-0 xl:border-s border-slate-200">
          <div className="text-xs font-medium text-slate-500">
            {uiText(isAr).admin.tauxDAchevementMissions}
          </div>
          <div className="text-2xl font-bold tabular-nums text-slate-900">
            {analytics.completionRatePct}%
          </div>
          <div className="text-xs text-slate-600 tabular-nums">
            {analytics.completedBookingsCount} {uiText(isAr).admin.terminees} ·{' '}
            {analytics.activeBookingsCount} {uiText(isAr).admin.actives} ·{' '}
            {analytics.cancelledBookingsCount} {uiText(isAr).admin.annulees}
          </div>
        </div>

        <div className="p-5 space-y-1.5 border-t sm:border-s xl:border-t-0 border-slate-200">
          <div className="text-xs font-medium text-slate-500">
            {uiText(isAr).admin.maalemsVerifiesCin}
          </div>
          <div className="text-2xl font-bold tabular-nums text-emerald-700">
            {analytics.verifiedProvidersCount} / {analytics.totalProvidersCount}
          </div>
          <div className="text-xs text-slate-600 tabular-nums">
            {analytics.pendingCinCount > 0 ? (
              <span className="font-semibold text-amber-700">
                {analytics.pendingCinCount}{' '}
                {uiText(isAr).admin.dossiersCinEnAttente}
              </span>
            ) : (
              <span className="text-emerald-700 font-medium">
                {uiText(isAr).admin.fileCinAJour}
              </span>
            )}{' '}
            ·{' '}
            <span className="inline-flex items-center gap-0.5 text-slate-700 font-medium">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {analytics.averageRating.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Split: Category Revenue Breakdown + Moroccan City Supply/Demand */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {uiText(isAr).admin.repartitionGmvActiviteParMetier}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {uiText(isAr).admin.revenusEngagesHorsAnnulationsEnMad}
              </p>
            </div>
            <span className="text-xs font-mono-tabular text-slate-500 whitespace-nowrap">
              {analytics.totalProvidersCount} {uiText(isAr).common.maalems}
            </span>
          </div>

          <div className="space-y-4">
            {analytics.categoryBreakdown.map((item) => {
              const barWidth =
                item.revenueMad > 0
                  ? Math.max(8, Math.round((item.revenueMad / maxCategoryRevenue) * 100))
                  : 0;
              return (
                <div key={item.category} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="font-semibold text-slate-800 truncate">
                      {t.categories[item.category]}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 tabular-nums shrink-0">
                      <span>
                        {item.providersCount} {uiText(isAr).common.maalems}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {item.bookingsCount} {uiText(isAr).admin.missions}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-bold text-slate-900 min-w-[74px] text-end">
                        {formatMadCurrency(item.revenueMad, lang)}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-700 rounded-full transition-all duration-300"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {uiText(isAr).admin.couvertureNationaleParVille}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {uiText(isAr).admin.offreMaalemsEtDemandeActiveSur}
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {analytics.cityBreakdown.map((cityItem) => {
              const barPct =
                cityItem.providersCount > 0
                  ? Math.max(12, Math.round((cityItem.providersCount / maxCityProviders) * 100))
                  : 0;
              return (
                <div key={cityItem.city} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900">
                      {t.cities[cityItem.city]}
                    </span>
                    <span className="text-slate-600 tabular-nums">
                      {cityItem.providersCount} {uiText(isAr).common.maalems} ·{' '}
                      {cityItem.bookingsCount} {uiText(isAr).admin.cmd} ·{' '}
                      <strong className="text-slate-900">
                        {formatMadCurrency(cityItem.revenueMad, lang)}
                      </strong>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-600 rounded-full transition-all duration-300"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Required Queues: Pending CIN + Held CMI Escrow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending CIN Verification Queue */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {uiText(isAr).admin.fileDeVerificationCin}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {uiText(isAr).admin.nouveauxPrestatairesEnAttenteDeValidation}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateSection('providers')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{uiText(isAr).admin.toutVoir}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {pendingProviders.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">
              {uiText(isAr).admin.aucunDossierCinEnAttenteDe}
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingProviders.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {isAr ? p.fullNameAr : p.fullNameFr}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {t.categories[p.category]} · {t.cities[p.location.city]} (
                      {isAr ? p.location.quartierAr || p.location.quartier : p.location.quartier}) ·{' '}
                      {p.cinNumberMasked}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onApproveCin(p)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{uiText(isAr).admin.approuverCin}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Held CMI Escrow Queue */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {uiText(isAr).admin.sequestresCmiEnAttenteDeLiberation}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {uiText(isAr).admin.liberezLesFondsCmiVersLe}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateSection('bookings')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{uiText(isAr).admin.registreCmi}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-500 py-4">
            {uiText(isAr).admin.laPasserelleCmiEstDesactiveeReglement}
          </p>
        </div>
      </div>
    </div>
  );
};
