import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Star,
  ShieldCheck,
  Navigation,
  Eye,
  MessageCircle,
  Phone,
  Clock,
  Lock,
  Heart,
} from 'lucide-react';
import {
  formatMadCurrency,
  buildWhatsAppUrl,
  maskMoroccanPhone,
  type LanguageCode,
  type VettedProvider,
} from '../utils/marketplace';
import type { Translations } from '../i18n/translations';

interface ProviderCardProps {
  provider: VettedProvider;
  lang: LanguageCode;
  t: Translations;
  isFavorite?: boolean;
  onToggleFavorite?: (providerId: string) => void;
  onViewDetails: (provider: VettedProvider) => void;
  onBookProvider: (provider: VettedProvider) => void;
}

export const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  lang,
  t,
  isFavorite = false,
  onToggleFavorite,
  onViewDetails,
  onBookProvider,
}) => {
  const [contactRevealed, setContactRevealed] = useState(false);

  useEffect(() => {
    setContactRevealed(false);
  }, [provider.id]);

  const isAr = lang === 'ar';
  const displayName = isAr ? provider.fullNameAr : provider.fullNameFr;
  const displayQuartier = isAr
    ? provider.location.quartierAr || provider.location.quartier
    : provider.location.quartier;
  const displayBio = isAr ? provider.bioAr : provider.bioFr;
  const displaySkills = isAr ? provider.skillsAr : provider.skills;
  const maskedPhone = maskMoroccanPhone(provider.phone);
  const providerWhatsappUrl =
    contactRevealed && maskedPhone
      ? buildWhatsAppUrl({
          phone: provider.phone,
          lang,
          providerName: displayName,
          category: t.categories[provider.category],
        })
      : '';
  const telHref =
    contactRevealed && maskedPhone
      ? `tel:${provider.phone.replace(/[^\d+]/g, '')}`
      : '';

  return (
    <article className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5">
      <div>
        <div className="relative h-44 bg-slate-100 overflow-hidden">
          <img
            src={provider.portfolioImages[0]}
            alt={displayName}
            width={800}
            height={597}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/25" />

          {/* Top Trust, Favorite & Response-Speed Strip */}
          <div className="absolute top-2.5 inset-x-3 flex items-center justify-between gap-2 text-[11px]">
            {provider.verifiedBadge ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-700/95 text-white font-semibold shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>{t.verifiedCinLabel}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/75 text-slate-100 font-medium">
                <span>{isAr ? 'ملف قيد التوثيق' : 'Vérification en cours'}</span>
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/95 text-slate-900 font-semibold tabular-nums shadow-xs">
                <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                <span>
                  ~{provider.responseMinutes} {isAr ? 'د' : 'min'}
                </span>
              </span>
              {onToggleFavorite && (
                <button
                  type="button"
                  onClick={() => onToggleFavorite(provider.id)}
                  aria-pressed={isFavorite}
                  aria-label={isFavorite ? t.removeFavoriteLabel : t.saveFavoriteLabel}
                  className={`w-7 h-7 rounded-full inline-flex items-center justify-center shadow-xs transition-colors cursor-pointer ${
                    isFavorite
                      ? 'bg-rose-600 text-white'
                      : 'bg-white/95 text-slate-600 hover:text-rose-600'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-white' : ''}`} />
                </button>
              )}
            </div>
          </div>

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

        <div className="p-4 sm:p-5 space-y-2.5">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
            <span className="font-semibold text-amber-800">
              {t.categories[provider.category]}
            </span>
            <span
              className={
                provider.isAvailableNow ? 'text-emerald-700 font-semibold' : 'text-slate-500'
              }
            >
              {provider.isAvailableNow ? t.availableNowText : t.busyScheduledText}
            </span>
          </div>

          <h3 className="text-base font-bold text-slate-900">{displayName}</h3>

          <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{displayBio}</p>

          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 pt-0.5">
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

          <div className="text-xs text-slate-600 truncate">
            {displaySkills.slice(0, 3).join(' · ')}
          </div>

          <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50/70 border border-emerald-100 rounded-md px-2 py-1">
            <Lock className="w-3 h-3 text-emerald-700 shrink-0" />
            <span>
              {isAr
                ? 'الدفع بعد الإنجاز أو عبر ضمان CMI الآمن'
                : 'Paiement après intervention ou séquestre CMI'}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-t border-slate-200 space-y-2.5">
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
              className="inline-flex items-center justify-center gap-1 px-2.5 min-h-[40px] text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{t.viewDetailsBtn}</span>
            </button>
            <button
              type="button"
              onClick={() => onBookProvider(provider)}
              className="inline-flex items-center justify-center px-3.5 min-h-[40px] text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              {t.bookProviderBtn}
            </button>
          </div>
        </div>

        {/* One-Tap Mobile First-Contact Row: Masked Click-to-Reveal Phone & WhatsApp (AUD-016) */}
        {maskedPhone &&
          (!contactRevealed ? (
            <button
              type="button"
              data-testid="reveal-provider-phone-btn"
              onClick={() => setContactRevealed(true)}
              aria-label={`${isAr ? 'إظهار رقم هاتف' : 'Afficher le numéro de'} ${displayName}`}
              className="w-full inline-flex items-center justify-center gap-2 px-3 min-h-[40px] text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>{isAr ? 'إظهار الهاتف / واتساب' : 'Afficher téléphone / WhatsApp'}</span>
              <span className="font-mono-tabular text-slate-500" dir="ltr">
                {maskedPhone}
              </span>
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <a
                href={telHref}
                aria-label={`${isAr ? 'اتصال مباشر بـ' : 'Appeler'} ${displayName}`}
                className="inline-flex items-center justify-center gap-1.5 px-3 min-h-[40px] text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="font-mono-tabular" dir="ltr">
                  {provider.phone}
                </span>
              </a>
              {providerWhatsappUrl && (
                <a
                  href={providerWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 min-h-[40px] text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>WhatsApp</span>
                </a>
              )}
            </div>
          ))}
      </div>
    </article>
  );
};
