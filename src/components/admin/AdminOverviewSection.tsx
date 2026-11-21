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
            {isAr ? 'إجمالي حجم المعاملات (GMV)' : 'Volume brut d’affaires (GMV)'}
          </div>
          <div className="text-2xl font-bold tabular-nums text-slate-900">
            {formatMadCurrency(analytics.totalGmvMad, lang)}
          </div>
          <div className="text-xs text-slate-600 tabular-nums">
            {isAr ? 'مُحصّل:' : 'Encaissé :'}{' '}
            <span className="font-semibold text-emerald-700">
              {formatMadCurrency(analytics.settledRevenueMad, lang)}
            </span>
          </div>
        </div>

        <div className="p-5 space-y-1.5 border-t sm:border-t-0 sm:border-s border-slate-200">
          <div className="text-xs font-medium text-slate-500">
            {isAr ? 'ضمان CMI المحجوز (Escrow)' : 'Séquestre CMI bloqué'}
          </div>
          <div className="text-2xl font-bold tabular-nums text-amber-700">
            {formatMadCurrency(analytics.escrowHeldMad, lang)}
          </div>
          <div className="text-xs text-slate-600 tabular-nums">
            {analytics.escrowHeldCount}{' '}
            {isAr ? 'حجوزات بانتظار الصرف' : 'dossiers en attente de libération'}
          </div>
        </div>

        <div className="p-5 space-y-1.5 border-t xl:border-t-0 xl:border-s border-slate-200">
          <div className="text-xs font-medium text-slate-500">
            {isAr ? 'معدل إنجاز الطلبات' : 'Taux d’achèvement missions'}
          </div>
          <div className="text-2xl font-bold tabular-nums text-slate-900">
            {analytics.completionRatePct}%
          </div>
          <div className="text-xs text-slate-600 tabular-nums">
            {analytics.completedBookingsCount} {isAr ? 'مكتملة' : 'terminées'} ·{' '}
            {analytics.activeBookingsCount} {isAr ? 'نشطة' : 'actives'} ·{' '}
            {analytics.cancelledBookingsCount} {isAr ? 'ملغاة' : 'annulées'}
          </div>
        </div>

        <div className="p-5 space-y-1.5 border-t sm:border-s xl:border-t-0 border-slate-200">
          <div className="text-xs font-medium text-slate-500">
            {isAr ? 'المعلمون الموثقون (CIN)' : 'Maâlems vérifiés (CIN)'}
          </div>
          <div className="text-2xl font-bold tabular-nums text-emerald-700">
            {analytics.verifiedProvidersCount} / {analytics.totalProvidersCount}
          </div>
          <div className="text-xs text-slate-600 tabular-nums">
            {analytics.pendingCinCount > 0 ? (
              <span className="font-semibold text-amber-700">
                {analytics.pendingCinCount}{' '}
                {isAr ? 'ملفات CIN قيد المراجعة' : 'dossiers CIN en attente'}
              </span>
            ) : (
              <span className="text-emerald-700 font-medium">
                {isAr ? 'جميع الملفات موثقة' : 'File CIN à jour'}
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
                {isAr ? 'توزيع حجم المعاملات حسب الحرفة' : 'Répartition GMV & activité par métier'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? 'الحجوزات غير الملغاة بالدرهم المغربي وعدد الحرفيين بكل تخصص'
                  : 'Revenus engagés (hors annulations) en MAD et couverture artisans'}
              </p>
            </div>
            <span className="text-xs font-mono-tabular text-slate-500 whitespace-nowrap">
              {analytics.totalProvidersCount} {isAr ? 'معلم' : 'Maâlems'}
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
                        {item.providersCount} {isAr ? 'معلم' : 'Maâlems'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {item.bookingsCount} {isAr ? 'طلب' : 'missions'}
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
                {isAr ? 'التغطية الجغرافية حسب المدينة' : 'Couverture nationale par ville'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? 'عدد المعلمين والطلبات النشطة في المدن المغربية الست'
                  : 'Offre Maâlems et demande active sur les 6 pôles urbains'}
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
                      {cityItem.providersCount} {isAr ? 'معلم' : 'Maâlems'} ·{' '}
                      {cityItem.bookingsCount} {isAr ? 'طلب' : 'cmd'} ·{' '}
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
                {isAr ? 'ملفات التحقق من البطاقة الوطنية (CIN)' : 'File de vérification CIN'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? 'المعلمون الجدد بانتظار المصادقة لتفعيل شارة الثقة'
                  : 'Nouveaux prestataires en attente de validation du badge CIN'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateSection('providers')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{isAr ? 'عرض الكل' : 'Tout voir'}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {pendingProviders.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">
              {isAr
                ? 'لا توجد ملفات بطاقة وطنية قيد الانتظار حالياً.'
                : 'Aucun dossier CIN en attente de validation.'}
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
                    <span>{isAr ? 'توثيق CIN' : 'Approuver CIN'}</span>
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
                {isAr ? 'مبالغ ضمان CMI الجاهزة للصرف' : 'Séquestres CMI en attente de libération'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? 'صرف المستحقات للمعلم بعد التأكد من إتمام الخدمة بنجاح'
                  : 'Libérez les fonds CMI vers le Maâlem après validation de la prestation'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateSection('bookings')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{isAr ? 'السجل المالي' : 'Registre CMI'}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {escrowBookings.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">
              {isAr
                ? 'تم صرف جميع مبالغ ضمان CMI بنجاح.'
                : 'Tous les séquestres CMI ont été réglés.'}
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {escrowBookings.slice(0, 4).map((b) => (
                <div
                  key={b.id}
                  className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      <span className="font-mono-tabular">#{b.bookingRef}</span> · {b.providerName}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {b.clientName} · {t.cities[b.city]} ·{' '}
                      <span className="font-bold text-slate-800 tabular-nums">
                        {formatMadCurrency(b.estimatedMad, lang)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onReleaseEscrow(b)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>{isAr ? 'صرف الضمان' : 'Libérer CMI'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
