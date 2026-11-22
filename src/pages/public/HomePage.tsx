import React, { useState } from 'react';
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
import { CITY_COORDINATES, SERVICE_CATEGORIES, type MoroccanCity } from '../../utils/marketplace';
import { useMarketplace } from '../../app/providers/MarketplaceContext';
import { ROUTE_PATHS, buildServiceCategoryPath } from '../../app/routePaths';
import { ProviderDiscoverySection } from '../../components/ProviderDiscoverySection';

export const HomePage: React.FC = () => {
  const {
    lang,
    t,
    isAr,
    firebaseUser,
    userProfile,
    allProviders,
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
            label: isAr ? 'موقعي عبر GPS' : 'Ma position GPS',
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
      {/* Section 1: Clean Storefront Split Hero + 4-Column Trust Strip */}
      <section className="bg-white border-b border-slate-200 py-10 lg:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <p className="text-xs font-semibold text-emerald-700 tracking-wide">
                  {t.heroKicker}
                </p>
                <h1
                  className="text-3xl sm:text-4xl lg:text-[2.65rem] font-bold text-slate-900 leading-[1.18] tracking-tight"
                  style={{ textWrap: 'balance' }}
                >
                  {t.heroTitle}
                </h1>
                <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
                  {t.heroSubtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to={ROUTE_PATHS.SERVICES}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap"
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
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-emerald-700" />
                  <span>{isAr ? 'نشر طلب خدمة (تلقي عروض)' : 'Publier un besoin'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!nearMeActive) handleToggleNearMe();
                    document.getElementById('providers')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-900 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Navigation className="w-4 h-4 text-amber-700" />
                  <span>{t.nearMeToggle}</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative h-full min-h-[280px] rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6 text-white">
                  <div className="flex items-center gap-2 text-xs text-emerald-300 font-medium">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>{t.verifiedCinLabel}</span>
                  </div>
                  <p className="text-sm font-semibold mt-1">
                    {isAr
                      ? 'تشخيص دقيق، التزام بالمواعيد، وتسعير واضح بالدرهم المغربي'
                      : 'Diagnostic précis, ponctualité et devis transparent en Dirhams (MAD)'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Full-Width 4-Column KPI / Trust Row */}
          <div className="mt-10 pt-8 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="text-xl font-bold tabular-nums text-slate-900">
                {t.trustMetric1Value}
              </div>
              <div className="text-xs text-slate-600 mt-1">{t.trustMetric1Label}</div>
            </div>
            <div>
              <div className="text-xl font-bold tabular-nums text-slate-900">
                {allProviders.length} {isAr ? 'معلم' : 'Maâlems'}
              </div>
              <div className="text-xs text-slate-600 mt-1">{t.trustMetric2Label}</div>
            </div>
            <div>
              <div className="text-xl font-bold tabular-nums text-emerald-700">
                {t.trustMetric3Value}
              </div>
              <div className="text-xs text-slate-600 mt-1">{t.trustMetric3Label}</div>
            </div>
            <div>
              <div className="text-xl font-bold tabular-nums text-amber-700">
                {t.trustMetric4Value}
              </div>
              <div className="text-xs text-slate-600 mt-1">{t.trustMetric4Label}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1.5: 12-Category Quick Explorer */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                {t.categoriesExplorerTitle}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">{t.categoriesExplorerSubtitle}</p>
            </div>
            <Link
              to={ROUTE_PATHS.SERVICES}
              className="text-xs font-semibold text-emerald-700 hover:underline whitespace-nowrap"
            >
              {t.allServicesTab} →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {SERVICE_CATEGORIES.map((category) => (
              <Link
                key={category}
                to={buildServiceCategoryPath(category)}
                className="p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50/40 transition-colors flex items-center gap-2 text-xs font-semibold text-slate-800"
              >
                <Wrench className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="truncate">{t.categories[category]}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2: Service Provider Discovery */}
      <ProviderDiscoverySection
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
                <span>
                  {isAr ? 'للصناع والحرفيين المعتمدين' : 'Artisans & Maâlems qualifiés'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                {isAr
                  ? 'هل أنت معلم أو مقدم خدمة محترف في المغرب؟'
                  : 'Vous êtes un Maâlem qualifié ? Développez votre clientèle locale.'}
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                {isAr
                  ? 'انضم مجاناً إلى شبكة مول الخدمة، تصفح طلبات الزبناء المنشورة، وقدّم عروضك مباشرة في مدينتك.'
                  : 'Rejoignez gratuitement Moul L’Khedma, consultez les offres publiées par les clients dans votre ville et envoyez vos devis en direct.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                to={
                  firebaseUser
                    ? ROUTE_PATHS.PROVIDER_DASHBOARD
                    : `${ROUTE_PATHS.REGISTER}?role=provider`
                }
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors"
              >
                <span>
                  {firebaseUser
                    ? t.providerDashboardTab
                    : isAr
                    ? 'إنشاء حساب معلم مجاناً'
                    : 'Rejoindre en tant que Maâlem'}
                </span>
                <ArrowIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Sticky First-Contact & Near-Me Action Bar */}
      <div
        role="region"
        aria-label={isAr ? 'إجراءات سريعة للهاتف' : 'Actions rapides mobile'}
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-sm border-t border-slate-200 px-3 py-2.5 shadow-lg"
      >
        <div className="grid grid-cols-2 gap-2.5 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => {
              if (!nearMeActive) handleToggleNearMe();
              document.getElementById('providers')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3 min-h-[44px] text-xs font-semibold text-slate-900 bg-amber-50 border border-amber-300 rounded-lg active:bg-amber-100 cursor-pointer"
          >
            <Navigation className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="truncate">{t.nearMeToggle}</span>
          </button>
          <a
            href={supportWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3 min-h-[44px] text-xs font-semibold text-white bg-emerald-700 rounded-lg active:bg-emerald-800"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{isAr ? 'واتساب سريع' : 'WhatsApp Rapide'}</span>
          </a>
        </div>
      </div>
    </>
  );
};
