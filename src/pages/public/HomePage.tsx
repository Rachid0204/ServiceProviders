import { uiText } from '../../i18n/uiCopy';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Wrench,
  ArrowRight,
  ArrowLeft,
  Navigation,
  MessageCircle,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { CITY_COORDINATES, type MoroccanCity } from '../../utils/marketplace';
import { formatMaalemCount } from '../../utils/tradeMeta';
import { useMarketplace } from '../../app/providers/MarketplaceContext';
import { ROUTE_PATHS } from '../../app/routePaths';
import { ProviderDiscoverySection } from '../../components/ProviderDiscoverySection';

export const HomePage: React.FC = () => {
  const {
    lang,
    t,
    isAr,
    firebaseUser,
    userProfile,
    allProviders,
    isLoadingProviders,
    supportWhatsAppUrl,
    setAuthModalIntent,
    setIsPostJobModalOpen,
  } = useMarketplace();

  const [nearMeActive, setNearMeActive] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);
  const [showMobileStickyBar, setShowMobileStickyBar] = useState(false);

  // Reveal mobile quick-action bar only after scrolling past the Hero CTAs
  useEffect(() => {
    const onScroll = () => {
      setShowMobileStickyBar(window.scrollY > 360);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleToggleNearMe = () => {
    if (nearMeActive) {
      setNearMeActive(false);
      setUserCoords(null);
      return;
    }

    setNearMeActive(true);
    const fallbackCity: MoroccanCity = userProfile?.city || 'Casablanca';
    const fallbackRef = CITY_COORDINATES[fallbackCity];

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            label: uiText(isAr).publicUi.maPositionGps,
          });
        },
        () => {
          setIsLocating(false);
          setUserCoords({
            lat: fallbackRef.lat,
            lng: fallbackRef.lng,
            label: isAr ? fallbackRef.labelAr : fallbackRef.labelFr,
          });
        },
        { timeout: 3500 }
      );
    } else {
      setUserCoords({
        lat: fallbackRef.lat,
        lng: fallbackRef.lng,
        label: isAr ? fallbackRef.labelAr : fallbackRef.labelFr,
      });
    }
  };

  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <>
      {/* Section 1: Editorial Split Hero + 4-Column Trust Strip */}
      <section className="bg-white border-b border-slate-200 py-8 sm:py-10 lg:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              <div className="space-y-3.5">
                <p className="text-xs font-semibold text-emerald-700 tracking-wide">
                  {t.heroKicker}
                </p>
                <h1
                  className="text-3xl sm:text-4xl lg:text-[2.65rem] font-bold text-slate-900 leading-[1.16] tracking-tight"
                  style={{ textWrap: 'balance' }}
                >
                  {t.heroTitle}
                </h1>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
                  {t.heroSubtitle}
                </p>
              </div>

              {/* Single Dominant Primary CTA + Calm Secondary CTA + Quiet Inline Location Trigger */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  to={ROUTE_PATHS.SERVICES}
                  className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap"
                >
                  <span>{t.heroPrimaryCta}</span>
                  <ArrowIcon className="w-4 h-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    if (firebaseUser) {
                      setIsPostJobModalOpen(true);
                    } else {
                      setAuthModalIntent('client');
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-emerald-700" />
                  <span>{uiText(isAr).publicUi.publierUnBesoin2}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!nearMeActive) handleToggleNearMe();
                    document.getElementById('providers')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-2.5 text-sm font-semibold text-slate-700 hover:text-emerald-700 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Navigation className="w-4 h-4 text-emerald-700" />
                  <span>{t.nearMeToggle}</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative h-full min-h-[240px] sm:min-h-[280px] rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
                <img
                  src="/src/assets/images/hero_moroccan_craftsman_1794980476857.jpg"
                  alt={t.heroTitle}
                  width={1200}
                  height={670}
                  fetchPriority="high"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-5 sm:p-6 text-white">
                  <div className="flex items-center gap-2 text-xs text-emerald-300 font-medium">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>{t.verifiedCinLabel}</span>
                  </div>
                  <p className="text-sm font-semibold mt-1">
                    {uiText(isAr).publicUi.diagnosticPrecisPonctualiteEtDevisTransparent}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Full-Width 4-Column KPI / Trust Row */}
          <div className="mt-8 sm:mt-10 pt-7 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            <div>
              <div className="text-lg sm:text-xl font-bold tabular-nums text-slate-900">
                {t.trustMetric1Value}
              </div>
              <div className="text-xs text-slate-600 mt-1">{t.trustMetric1Label}</div>
            </div>
            <div>
              <div className="text-lg sm:text-xl font-bold tabular-nums text-slate-900">
                {isLoadingProviders && allProviders.length === 0 ? (
                  <span
                    aria-label={t.routeLoadingLabel}
                    className="inline-block h-6 w-24 rounded bg-slate-200 animate-pulse align-middle"
                  />
                ) : (
                  formatMaalemCount(allProviders.length, lang)
                )}
              </div>
              <div className="text-xs text-slate-600 mt-1">{t.trustMetric2Label}</div>
            </div>
            <div>
              <div className="text-lg sm:text-xl font-bold tabular-nums text-emerald-700">
                {t.trustMetric3Value}
              </div>
              <div className="text-xs text-slate-600 mt-1">{t.trustMetric3Label}</div>
            </div>
            <div>
              <div className="text-lg sm:text-xl font-bold tabular-nums text-amber-700">
                {t.trustMetric4Value}
              </div>
              <div className="text-xs text-slate-600 mt-1">{t.trustMetric4Label}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Unified 12-Trade Discovery & Service Provider Catalog */}
      <ProviderDiscoverySection
        showSectionHeader
        nearMeActive={nearMeActive}
        isLocating={isLocating}
        userCoords={userCoords}
        onToggleNearMe={handleToggleNearMe}
        onUpdateUserCoords={setUserCoords}
      />

      {/* Section 3: How It Works & Trust Guarantees */}
      <section id="how-it-works" className="py-12 lg:py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="max-w-2xl">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{t.howItWorksTitle}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-2.5">
              <ShieldCheck className="w-6 h-6 text-emerald-700" />
              <h3 className="text-sm font-bold text-slate-900">{t.howItWorksStep1Title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{t.howItWorksStep1Desc}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-2.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-700" />
              <h3 className="text-sm font-bold text-slate-900">{t.howItWorksStep2Title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{t.howItWorksStep2Desc}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-2.5">
              <Navigation className="w-6 h-6 text-amber-700" />
              <h3 className="text-sm font-bold text-slate-900">{t.howItWorksStep3Title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{t.howItWorksStep3Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Dedicated Pro / Maâlem Onboarding CTA Banner */}
      <section className="py-12 lg:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900 text-white rounded-2xl p-8 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                <Wrench className="w-4 h-4" />
                <span>{uiText(isAr).publicUi.artisansMaalemsQualifies}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                {uiText(isAr).publicUi.vousEtesUnMaalemQualifieDeveloppez}
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                {uiText(isAr).publicUi.rejoignezGratuitementMoulLKhedmaConsultez}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                to={
                  firebaseUser
                    ? ROUTE_PATHS.PROVIDER_DASHBOARD
                    : `${ROUTE_PATHS.REGISTER}?role=provider`
                }
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-3 text-sm font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors"
              >
                <span>
                  {firebaseUser
                    ? t.providerDashboardTab
                    : uiText(isAr).publicUi.rejoindreEnTantQueMaalem}
                </span>
                <ArrowIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Adaptive Scroll-Aware Mobile Quick-Action Bar (strictly <= 15% combined sticky height) */}
      {showMobileStickyBar && (
        <div
          role="region"
          aria-label={uiText(isAr).publicUi.actionsRapidesMobile}
          className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-sm border-t border-slate-200 px-3 py-2 shadow-sm"
        >
          <div
            className={`grid gap-2 max-w-md mx-auto ${
              supportWhatsAppUrl ? 'grid-cols-2' : 'grid-cols-1'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                if (!nearMeActive) handleToggleNearMe();
                document.getElementById('providers')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`inline-flex items-center justify-center gap-1.5 px-3 min-h-[44px] text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                supportWhatsAppUrl
                  ? 'text-slate-900 bg-slate-100 border border-slate-300 active:bg-slate-200'
                  : 'text-white bg-emerald-700 active:bg-emerald-800'
              }`}
            >
              <Navigation
                className={`w-4 h-4 shrink-0 ${
                  supportWhatsAppUrl ? 'text-emerald-700' : 'text-white'
                }`}
              />
              <span className="truncate">{t.nearMeToggle}</span>
            </button>
            {supportWhatsAppUrl && (
              <a
                href={supportWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 min-h-[44px] text-xs font-semibold text-white bg-emerald-700 rounded-lg active:bg-emerald-800"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span className="truncate">{uiText(isAr).publicUi.whatsappRapide}</span>
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
};
