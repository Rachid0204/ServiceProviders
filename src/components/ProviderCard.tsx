import React from 'react';
import {
  MapPin,
  Star,
  ShieldCheck,
  Navigation,
  Eye,
  MessageCircle,
} from 'lucide-react';
import {
  formatMadCurrency,
  buildWhatsAppUrl,
  type LanguageCode,
  type VettedProvider,
} from '../utils/marketplace';
import type { Translations } from '../i18n/translations';

interface ProviderCardProps {
  provider: VettedProvider;
  lang: LanguageCode;
  t: Translations;
  onViewDetails: (provider: VettedProvider) => void;
  onBookProvider: (provider: VettedProvider) => void;
}

export const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  lang,
  t,
  onViewDetails,
  onBookProvider,
}) => {
  const displayName = lang === 'ar' ? provider.fullNameAr : provider.fullNameFr;
  const displayQuartier =
    lang === 'ar'
      ? provider.location.quartierAr || provider.location.quartier
      : provider.location.quartier;
  const displayBio = lang === 'ar' ? provider.bioAr : provider.bioFr;
  const displaySkills = lang === 'ar' ? provider.skillsAr : provider.skills;
  const providerWhatsappUrl = buildWhatsAppUrl({
    phone: provider.phone,
    lang,
    providerName: displayName,
    category: t.categories[provider.category],
  });

  return (
    <article className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5">
      <div>
        <div className="relative h-44 bg-slate-100 overflow-hidden">
          <img
            src={provider.portfolioImages[0]}
            alt={displayName}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <div className="absolute bottom-3 inset-x-4 flex items-center justify-between text-white text-xs">
            <span className="font-medium flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">
                {t.cities[provider.location.city]} · {displayQuartier}
              </span>
            </span>
            <span className="tabular-nums font-semibold flex items-center gap-1 shrink-0">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>{provider.ratingAvg.toFixed(1)}</span>
              <span className="text-slate-300 font-normal">({provider.reviewCount})</span>
            </span>
          </div>
        </div>

        <div className="p-5 space-y-2.5">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
            <span className="font-semibold text-amber-800">
              {t.categories[provider.category]}
            </span>
            <div className="flex items-center gap-1.5">
              {provider.verifiedBadge && (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.verifiedCinLabel}</span>
                </span>
              )}
            </div>
          </div>

          <h3 className="text-base font-bold text-slate-900">{displayName}</h3>

          <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{displayBio}</p>

          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 pt-1">
            <span
              className={
                provider.isAvailableNow ? 'text-emerald-700 font-semibold' : 'text-slate-500'
              }
            >
              {provider.isAvailableNow ? t.availableNowText : t.busyScheduledText}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {provider.experienceYears} {t.experienceYears}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {provider.completedJobs} {t.jobsCompleted}
            </span>
            {provider.distanceKm != null && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold tabular-nums">
                  <Navigation className="w-3 h-3" />
                  {provider.distanceKm} {t.distanceAwayUnit}
                </span>
              </>
            )}
          </div>

          <div className="text-xs text-slate-600 pt-0.5 truncate">
            {displaySkills.slice(0, 3).join(' · ')}
          </div>
        </div>
      </div>

      <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] text-slate-500">
              {t.calloutFeeLabel}{' '}
              {provider.fixedVisitFeeMAD > 0
                ? formatMadCurrency(provider.fixedVisitFeeMAD, lang)
                : t.freeCallout}
            </div>
            <div className="text-sm font-bold tabular-nums text-slate-900">
              {formatMadCurrency(provider.hourlyRateMAD, lang)}{' '}
              <span className="text-xs font-normal text-slate-500">/ h</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onViewDetails(provider)}
              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{t.viewDetailsBtn}</span>
            </button>
            <button
              type="button"
              onClick={() => onBookProvider(provider)}
              className="px-3 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              {t.bookProviderBtn}
            </button>
          </div>
        </div>

        <a
          href={providerWhatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{t.whatsappContactBtn}</span>
        </a>
      </div>
    </article>
  );
};
