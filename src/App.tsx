/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import {
  ShieldCheck,
  Search,
  MapPin,
  Wrench,
  Clock,
  Globe,
  UserCheck,
  ArrowRight,
  ArrowLeft,
  Navigation,
  Map as MapIcon,
  LayoutGrid,
  Columns,
} from 'lucide-react';
import { TRANSLATIONS } from './i18n/translations';
import {
  MOROCCAN_CITIES,
  SERVICE_CATEGORIES,
  CITY_COORDINATES,
  formatMadCurrency,
  filterProviders,
  type LanguageCode,
  type MoroccanCity,
  type ServiceCategory,
  type VettedProvider,
  type BookingRecord,
} from './utils/marketplace';
import { useMarketplaceAuth } from './hooks/useMarketplaceAuth';
import { useSystemSettings } from './hooks/useSystemSettings';
import { useProviders } from './hooks/useProviders';
import { useBookings } from './hooks/useBookings';
import { useAdminData } from './hooks/useAdminData';
import { OnboardingForm } from './components/OnboardingModal';
import { BookingModal } from './components/BookingModal';
import { ProviderDetailModal } from './components/ProviderDetailModal';
import { ProviderCard } from './components/ProviderCard';
import { BookingsDashboard } from './components/BookingsDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy-loaded chunks matching vite.config.ts manualChunks
const ProviderMap = lazy(() =>
  import('./components/ProviderMap').then((m) => ({ default: m.ProviderMap }))
);
const AdminDashboard = lazy(() =>
  import('./components/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const ChatDrawerModal = lazy(() =>
  import('./components/ChatDrawerModal').then((m) => ({ default: m.ChatDrawerModal }))
);
const ReviewModal = lazy(() =>
  import('./components/ReviewModal').then((m) => ({ default: m.ReviewModal }))
);
const BookingDetailModal = lazy(() =>
  import('./components/BookingLifecycleModals').then((m) => ({ default: m.BookingDetailModal }))
);
const CancellationModal = lazy(() =>
  import('./components/BookingLifecycleModals').then((m) => ({ default: m.CancellationModal }))
);
const RescheduleModal = lazy(() =>
  import('./components/BookingLifecycleModals').then((m) => ({ default: m.RescheduleModal }))
);

function detectInitialView(): 'marketplace' | 'admin' {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (
      params.get('view') === 'admin' ||
      window.location.pathname === '/admin' ||
      window.location.pathname.startsWith('/admin/')
    ) {
      return 'admin';
    }
  }
  return 'marketplace';
}

export function MarketplaceApp() {
  const [lang, setLang] = useState<LanguageCode>('fr');
  const t = TRANSLATIONS[lang];

  // Keep HTML dir="ltr"/"rtl" and lang="fr"/"ar" strictly synchronized
  useEffect(() => {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const handleLanguageSync = useCallback((nextLang: LanguageCode) => {
    setLang(nextLang);
  }, []);

  // Modular Firebase Auth, System Settings, Providers, and Dual-Role Bookings Hooks
  const {
    firebaseUser,
    authReady,
    userProfile,
    signInWithGoogle,
    signOutUser,
    handleSaveProfile,
  } = useMarketplaceAuth(handleLanguageSync);

  const { systemSettings, updateLocalSettings } = useSystemSettings(firebaseUser, authReady);

  const [appView, setAppView] = useState<'marketplace' | 'admin'>(detectInitialView);

  const navigateView = useCallback((nextView: 'marketplace' | 'admin') => {
    setAppView(nextView);
    if (typeof window !== 'undefined') {
      const targetUrl = nextView === 'admin' ? '/admin' : '/';
      if (window.location.pathname !== targetUrl) {
        window.history.pushState({ view: nextView }, '', targetUrl);
      }
    }
  }, []);

  useEffect(() => {
    const onPopState = () => setAppView(detectInitialView());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const {
    allProviders,
    firestoreProviders,
    toggleProviderAvailability,
    applyLocalReviewOverride,
    applyAdminProviderOverride,
    removeProviderReview,
  } = useProviders(firebaseUser, userProfile, t);

  const {
    bookings,
    chatThreads,
    bookingActionError,
    clearBookingActionError,
    submitBooking,
    updateBookingStatus,
    clientConfirmAndReleaseEscrow,
    cancelBookingWithReason,
    rescheduleBooking,
    submitClientReview,
    applyAdminBookingPatch,
    sendLocalChatMessage,
  } = useBookings({
    firebaseUser,
    authReady,
    lang,
    allProviders,
    platformFeePct: systemSettings.platformFeePct,
    autoRefundOnProviderCancel: systemSettings.autoRefundOnProviderCancel,
    onApplyReviewOverride: applyLocalReviewOverride,
  });

  const {
    isLiveAdmin,
    isLoadingAdmin,
    adminToast,
    adminProviders,
    adminBookings,
    adminUsers,
    adminReviews,
    auditLogs,
    withdrawals,
    analytics,
    toggleProviderCinVerification,
    adminToggleProviderAvailability,
    toggleUserVerifiedBadge,
    releaseCmiEscrow,
    refundCmiEscrow,
    disputeSplitEscrow,
    overrideBookingStatus,
    deleteModeratedReview,
    updateWithdrawalStatus,
    saveSystemSettings,
  } = useAdminData({
    enabled: appView === 'admin',
    firebaseUser,
    authReady,
    allProviders,
    firestoreProviders,
    bookings,
    systemSettings,
    onUpdateLocalSettings: updateLocalSettings,
    onApplyProviderOverride: applyAdminProviderOverride,
    onRemoveProviderReview: removeProviderReview,
    onApplyBookingPatch: applyAdminBookingPatch,
  });

  // Dynamic price slider ceiling so higher-priced Firestore providers are never hidden
  const sliderMaxHourlyRate = useMemo(() => {
    const highest = allProviders.reduce((max, p) => Math.max(max, p.hourlyRateMAD), 300);
    return Math.max(300, Math.ceil(highest / 50) * 50);
  }, [allProviders]);

  // Marketplace Filters & Geolocation Discovery
  const [selectedCity, setSelectedCity] = useState<MoroccanCity | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'ALL'>('ALL');
  const [quartierQuery, setQuartierQuery] = useState<string>('');
  const [maxHourlyRateMAD, setMaxHourlyRateMAD] = useState<number>(sliderMaxHourlyRate);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [availableNowOnly, setAvailableNowOnly] = useState<boolean>(false);

  // Expand default ceiling automatically when new providers load with higher rates
  useEffect(() => {
    setMaxHourlyRateMAD((prev) => (prev < sliderMaxHourlyRate && prev === 300 ? sliderMaxHourlyRate : prev));
  }, [sliderMaxHourlyRate]);

  // Geolocation ("Near Me / قريب مني") & Map/List View Mode
  const [nearMeActive, setNearMeActive] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'grid' | 'map'>('split');

  // Dashboard Mode: 'client' ("Mes Demandes / طلباتي") vs 'provider' ("Espace Maâlem / لوحة المعلم")
  const [dashboardTab, setDashboardTab] = useState<'client' | 'provider'>('client');
  const [activeMaalemId, setActiveMaalemId] = useState<string>('maalem-driss-casa');

  // Modals & Drawers
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState<boolean>(false);
  const [detailProvider, setDetailProvider] = useState<VettedProvider | null>(null);
  const [bookingProvider, setBookingProvider] = useState<VettedProvider | null>(null);
  const [activeChatBooking, setActiveChatBooking] = useState<BookingRecord | null>(null);
  const [detailBooking, setDetailBooking] = useState<BookingRecord | null>(null);
  const [cancellingBooking, setCancellingBooking] = useState<BookingRecord | null>(null);
  const [reschedulingBooking, setReschedulingBooking] = useState<BookingRecord | null>(null);
  const [reviewingBooking, setReviewingBooking] = useState<BookingRecord | null>(null);

  const filteredProviders = useMemo(
    () =>
      filterProviders(allProviders, {
        city: selectedCity,
        category: selectedCategory,
        quartier: quartierQuery,
        maxHourlyRateMAD: maxHourlyRateMAD >= sliderMaxHourlyRate ? undefined : maxHourlyRateMAD,
        searchQuery,
        verifiedOnly,
        availableNowOnly,
        userCoords,
        nearMeActive,
      }),
    [
      allProviders,
      selectedCity,
      selectedCategory,
      quartierQuery,
      maxHourlyRateMAD,
      sliderMaxHourlyRate,
      searchQuery,
      verifiedOnly,
      availableNowOnly,
      userCoords,
      nearMeActive,
    ]
  );

  const activeMaalemProvider = useMemo(
    () => allProviders.find((p) => p.id === activeMaalemId) || allProviders[0],
    [allProviders, activeMaalemId]
  );

  // Auto-select signed-in provider in Provider Dashboard when role === 'provider' or 'both'
  useEffect(() => {
    if (userProfile?.role === 'provider' || userProfile?.role === 'both') {
      const ownProvider = allProviders.find((p) => p.uid === userProfile.uid);
      if (ownProvider) {
        setActiveMaalemId(ownProvider.id);
      }
    }
  }, [userProfile, allProviders]);

  // Keep open detail modals synced with live Firestore updates
  const syncedDetailBooking = useMemo(
    () => (detailBooking ? bookings.find((b) => b.id === detailBooking.id) || detailBooking : null),
    [bookings, detailBooking]
  );
  const syncedDetailProvider = useMemo(
    () =>
      detailProvider ? allProviders.find((p) => p.id === detailProvider.id) || detailProvider : null,
    [allProviders, detailProvider]
  );

  // Handle "Near Me / قريب مني" toggle using navigator.geolocation with Moroccan city fallback
  const handleToggleNearMe = () => {
    if (nearMeActive) {
      setNearMeActive(false);
      setUserCoords(null);
      return;
    }

    setNearMeActive(true);
    const fallbackCity: MoroccanCity =
      selectedCity !== 'ALL'
        ? selectedCity
        : userProfile?.city
        ? userProfile.city
        : 'Casablanca';
    const fallbackRef = CITY_COORDINATES[fallbackCity];

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            label: lang === 'ar' ? 'موقعي عبر GPS' : 'Ma position GPS',
          });
        },
        () => {
          setIsLocating(false);
          setUserCoords({
            lat: fallbackRef.lat,
            lng: fallbackRef.lng,
            label: lang === 'ar' ? fallbackRef.labelAr : fallbackRef.labelFr,
          });
        },
        { timeout: 3500 }
      );
    } else {
      setUserCoords({
        lat: fallbackRef.lat,
        lng: fallbackRef.lng,
        label: lang === 'ar' ? fallbackRef.labelAr : fallbackRef.labelFr,
      });
    }
  };

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'fr' ? 'ar' : 'fr'));
  };

  const resetAllFilters = () => {
    setSelectedCity('ALL');
    setSelectedCategory('ALL');
    setQuartierQuery('');
    setMaxHourlyRateMAD(sliderMaxHourlyRate);
    setSearchQuery('');
    setVerifiedOnly(false);
    setAvailableNowOnly(false);
    setNearMeActive(false);
    setUserCoords(null);
  };

  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight;

  if (appView === 'admin') {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-600">
            {lang === 'ar' ? 'جاري تحميل لوحة الإدارة...' : 'Chargement de l’administration...'}
          </div>
        }
      >
        <AdminDashboard
          lang={lang}
          t={t}
          onToggleLanguage={toggleLanguage}
          onExitAdmin={() => navigateView('marketplace')}
          firebaseUser={firebaseUser}
          isLiveAdmin={isLiveAdmin}
          isLoadingAdmin={isLoadingAdmin}
          adminToast={adminToast}
          onGoogleSignIn={async () => {
            await signInWithGoogle();
          }}
          onSignOut={async () => {
            await signOutUser();
          }}
          analytics={analytics}
          providers={adminProviders}
          bookings={adminBookings}
          users={adminUsers}
          reviews={adminReviews}
          withdrawals={withdrawals}
          systemSettings={systemSettings}
          auditLogs={auditLogs}
          onToggleCinVerification={toggleProviderCinVerification}
          onToggleAvailability={adminToggleProviderAvailability}
          onInspectProvider={setDetailProvider}
          onToggleUserVerified={toggleUserVerifiedBadge}
          onReleaseEscrow={releaseCmiEscrow}
          onRefundEscrow={refundCmiEscrow}
          onDisputeSplitEscrow={disputeSplitEscrow}
          onOverrideBookingStatus={overrideBookingStatus}
          onOpenChat={setActiveChatBooking}
          onDeleteReview={deleteModeratedReview}
          onUpdateWithdrawalStatus={updateWithdrawalStatus}
          onSaveSystemSettings={saveSystemSettings}
        />

        {syncedDetailProvider && (
          <ProviderDetailModal
            provider={syncedDetailProvider}
            lang={lang}
            t={t}
            onClose={() => setDetailProvider(null)}
            onBookProvider={(p) => {
              setDetailProvider(null);
              navigateView('marketplace');
              setBookingProvider(p);
            }}
          />
        )}

        {activeChatBooking && (
          <ChatDrawerModal
            booking={activeChatBooking}
            relatedBookings={adminBookings}
            onSwitchBooking={setActiveChatBooking}
            lang={lang}
            t={t}
            firebaseUser={firebaseUser}
            activeRole="provider"
            activeUserName={firebaseUser?.displayName || 'Admin Moul L’Khedma'}
            readOnly={true}
            localMessages={chatThreads[activeChatBooking.id] || []}
            onSendLocalMessage={sendLocalChatMessage}
            onClose={() => setActiveChatBooking(null)}
          />
        )}
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 overflow-x-hidden">
      {/* Top Bar Contract: 3 zones */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 lg:gap-8 px-4 sm:px-6 lg:px-8 h-16">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#top"
            className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            {t.brandName}
          </a>

          {/* Zone 2: Concise Single-Line Navigation Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            <a
              href="#providers"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              {t.navProviders}
            </a>
            <a
              href="#onboarding"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              {t.navOnboarding}
            </a>
            <a
              href="#requests"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              {t.navMyRequests} ({bookings.length})
            </a>
            {isLiveAdmin && (
              <button
                type="button"
                onClick={() => navigateView('admin')}
                className="hover:text-emerald-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {t.navAdmin}
              </button>
            )}
            <button
              type="button"
              onClick={toggleLanguage}
              aria-label={`Switch language to ${t.langSwitchLabel}`}
              className="inline-flex items-center gap-1.5 text-slate-700 hover:text-emerald-700 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Globe className="w-4 h-4" />
              <span>{t.langSwitchLabel}</span>
            </button>
          </nav>

          {/* Zone 3: Primary Action + Mobile Language Switcher */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={toggleLanguage}
              aria-label={`Switch language to ${t.langSwitchLabel}`}
              className="md:hidden inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{t.langSwitchLabel}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsOnboardingModalOpen(true)}
              className="px-3 sm:px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer truncate max-w-[165px] sm:max-w-none"
            >
              {userProfile
                ? `${t.ctaProfile} (${userProfile.fullName.split(' ')[0]})`
                : t.ctaBecomeProvider}
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Section 1: Storefront Split Hero + Full-Width 4-Column Trust Strip */}
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

                {userProfile && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                      <div>
                        <span className="font-semibold text-slate-900">
                          {userProfile.fullName}
                        </span>
                        <span className="mx-1.5 text-slate-400">·</span>
                        <span className="text-slate-600">
                          {userProfile.role === 'both'
                            ? lang === 'ar'
                              ? 'زبون ومعلم (مزدوج)'
                              : 'Client & Maâlem'
                            : userProfile.role === 'provider'
                            ? t.roleProviderLabel
                            : t.roleClientLabel}
                        </span>
                        <span className="mx-1.5 text-slate-400">·</span>
                        <span className="text-slate-600">
                          {t.cities[userProfile.city]} ({userProfile.neighborhood})
                        </span>
                        <span className="mx-1.5 text-slate-400">·</span>
                        <span className="font-mono-tabular text-slate-700" dir="ltr">
                          {userProfile.phone}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsOnboardingModalOpen(true)}
                      className="text-emerald-700 font-semibold hover:underline whitespace-nowrap cursor-pointer"
                    >
                      {lang === 'ar' ? 'تعديل الحساب' : 'Modifier'}
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <a
                    href="#providers"
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap"
                  >
                    <span>{t.heroPrimaryCta}</span>
                    <ArrowIcon className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      if (!nearMeActive) handleToggleNearMe();
                      document.getElementById('providers')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-900 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors whitespace-nowrap cursor-pointer"
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
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6 text-white">
                    <div className="flex items-center gap-2 text-xs text-emerald-300 font-medium">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>{t.verifiedCinLabel}</span>
                    </div>
                    <p className="text-sm font-semibold mt-1">
                      {lang === 'ar'
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
                  {allProviders.length} {lang === 'ar' ? 'معلم' : 'Maâlems'}
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

        {/* Section 2: Service Provider Discovery, Geolocation & Map/List Split View */}
        <section id="providers" className="py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            {/* Search, Filters & Geolocation Control Bar */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5">
                <div className="lg:col-span-4 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute top-3 start-3.5 pointer-events-none" />
                  <input
                    type="search"
                    aria-label={t.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="w-full ps-10 pe-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="lg:col-span-2">
                  <select
                    aria-label={t.cityLabel}
                    value={selectedCity}
                    onChange={(e) => {
                      const val = e.target.value as MoroccanCity | 'ALL';
                      setSelectedCity(val);
                      if (nearMeActive && val !== 'ALL') {
                        const ref = CITY_COORDINATES[val];
                        setUserCoords({
                          lat: ref.lat,
                          lng: ref.lng,
                          label: lang === 'ar' ? ref.labelAr : ref.labelFr,
                        });
                      }
                    }}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="ALL">{t.filterAllCities}</option>
                    {MOROCCAN_CITIES.map((city) => (
                      <option key={city} value={city}>
                        {t.cities[city]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-3 relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute top-3 start-3.5 pointer-events-none" />
                  <input
                    type="text"
                    aria-label={t.quartierFilterPlaceholder}
                    value={quartierQuery}
                    onChange={(e) => setQuartierQuery(e.target.value)}
                    placeholder={t.quartierFilterPlaceholder}
                    className="w-full ps-9 pe-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="lg:col-span-3 flex flex-col justify-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">{t.maxPriceLabel}</span>
                    <span className="font-bold tabular-nums text-slate-900">
                      {formatMadCurrency(maxHourlyRateMAD, lang)}
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label={t.maxPriceLabel}
                    min={100}
                    max={sliderMaxHourlyRate}
                    step={10}
                    value={maxHourlyRateMAD}
                    onChange={(e) => setMaxHourlyRateMAD(Number(e.target.value))}
                    className="w-full accent-emerald-700 mt-1 cursor-pointer"
                  />
                </div>
              </div>

              <div
                role="group"
                aria-label="Service Categories"
                className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1"
              >
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedCategory === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {t.filterAllCategories}
                </button>
                {SERVICE_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedCategory === category
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {t.categories[category]}
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={verifiedOnly}
                      onChange={(e) => setVerifiedOnly(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                    />
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{t.filterVerifiedOnly}</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={availableNowOnly}
                      onChange={(e) => setAvailableNowOnly(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                    />
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{t.filterAvailableNow}</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleToggleNearMe}
                    aria-pressed={nearMeActive}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      nearMeActive
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5 shrink-0" />
                    <span>{isLocating ? t.nearMeLocating : t.nearMeToggle}</span>
                  </button>

                  {nearMeActive && userCoords && (
                    <span className="text-xs text-emerald-700 font-medium">
                      {t.nearMeActiveBadge} ({userCoords.label})
                    </span>
                  )}
                </div>

                <div
                  role="group"
                  aria-label="View Mode"
                  className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
                >
                  <button
                    type="button"
                    onClick={() => setViewMode('split')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      viewMode === 'split'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span>{t.viewModeSplit}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>{t.viewModeGrid}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('map')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      viewMode === 'map'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <MapIcon className="w-3.5 h-3.5" />
                    <span>{t.viewModeMap}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Results Counter & Reset */}
            <div className="flex items-center justify-between text-xs text-slate-600">
              <div>
                <span className="font-bold tabular-nums text-slate-900">
                  {filteredProviders.length}
                </span>{' '}
                <span>{t.resultsShowing}</span>
              </div>
              {(selectedCity !== 'ALL' ||
                selectedCategory !== 'ALL' ||
                quartierQuery.trim() !== '' ||
                maxHourlyRateMAD < sliderMaxHourlyRate ||
                searchQuery.trim() !== '' ||
                verifiedOnly ||
                availableNowOnly ||
                nearMeActive) && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-emerald-700 font-semibold hover:underline cursor-pointer"
                >
                  {t.resetFilters}
                </button>
              )}
            </div>

            {/* Discovery Content: Empty State or Split / Grid / Map View */}
            {filteredProviders.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
                <Wrench className="w-8 h-8 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-900">{t.emptyResultsTitle}</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">{t.emptyResultsDesc}</p>
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {t.resetFilters}
                </button>
              </div>
            ) : (
              <div
                className={
                  viewMode === 'split'
                    ? 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'
                    : 'block'
                }
              >
                {viewMode !== 'map' && (
                  <div
                    className={
                      viewMode === 'split'
                        ? 'lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-5'
                        : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                    }
                  >
                    {filteredProviders.map((provider) => (
                      <ProviderCard
                        key={provider.id}
                        provider={provider}
                        lang={lang}
                        t={t}
                        onViewDetails={setDetailProvider}
                        onBookProvider={setBookingProvider}
                      />
                    ))}
                  </div>
                )}

                {viewMode !== 'grid' && (
                  <div
                    className={
                      viewMode === 'split'
                        ? 'lg:col-span-5 lg:sticky lg:top-20 h-[540px]'
                        : 'w-full h-[580px]'
                    }
                  >
                    <Suspense
                      fallback={
                        <div className="w-full h-full rounded-xl border border-slate-200 bg-slate-100 animate-pulse flex items-center justify-center text-xs text-slate-500">
                          {lang === 'ar' ? 'جاري تحميل الخريطة...' : 'Chargement de la carte...'}
                        </div>
                      }
                    >
                      <ProviderMap
                        providers={filteredProviders}
                        lang={lang}
                        t={t}
                        userCoords={userCoords}
                        selectedProviderId={syncedDetailProvider?.id}
                        onSelectProvider={setDetailProvider}
                        onBookProvider={setBookingProvider}
                      />
                    </Suspense>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Dual-Role Onboarding & Firestore Profile Studio */}
        <section id="onboarding" className="py-12 bg-slate-100/70 border-y border-slate-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <OnboardingForm
              lang={lang}
              t={t}
              firebaseUser={firebaseUser}
              currentProfile={userProfile}
              onGoogleSignIn={async () => {
                await signInWithGoogle();
              }}
              onSignOut={async () => {
                await signOutUser();
              }}
              onSaveProfile={handleSaveProfile}
            />
          </div>
        </section>

        {/* Section 4: Client & Provider Bookings Dashboard + Guarantees */}
        <section id="requests" className="py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <BookingsDashboard
              lang={lang}
              t={t}
              firebaseUser={firebaseUser}
              platformFeePct={systemSettings.platformFeePct}
              bookingActionError={bookingActionError}
              onDismissError={clearBookingActionError}
              dashboardTab={dashboardTab}
              onChangeDashboardTab={setDashboardTab}
              allProviders={allProviders}
              activeMaalemProvider={activeMaalemProvider}
              onSelectActiveMaalemId={setActiveMaalemId}
              onToggleProviderAvailability={toggleProviderAvailability}
              bookings={bookings}
              chatThreads={chatThreads}
              onOpenChat={setActiveChatBooking}
              onOpenBookingDetail={setDetailBooking}
              onOpenReschedule={setReschedulingBooking}
              onOpenCancel={setCancellingBooking}
              onConfirmAndReleaseEscrow={(id) => {
                void clientConfirmAndReleaseEscrow(id);
              }}
              onUpdateBookingStatus={updateBookingStatus}
              onOpenReview={setReviewingBooking}
            />

            {/* Editorial Guarantees Section */}
            <div id="how-it-works" className="pt-8 border-t border-slate-200 space-y-6">
              <h2 className="text-xl font-bold text-slate-900">{t.howItWorksTitle}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900">{t.howItWorksStep1Title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{t.howItWorksStep1Desc}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900">{t.howItWorksStep2Title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{t.howItWorksStep2Desc}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900">{t.howItWorksStep3Title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{t.howItWorksStep3Desc}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Clean Footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span className="font-bold text-slate-900">
              {t.brandName} ({t.brandArabic})
            </span>{' '}
            — {t.footerTagline}
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigateView('admin')}
              className="text-emerald-700 font-semibold hover:underline cursor-pointer whitespace-nowrap"
            >
              {t.navAdmin}
            </button>
            <span>{t.footerRights}</span>
          </div>
        </div>
      </footer>

      {/* Onboarding Modal */}
      {isOnboardingModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.onboardingTitle}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto"
        >
          <div className="max-w-3xl w-full my-8">
            <OnboardingForm
              lang={lang}
              t={t}
              firebaseUser={firebaseUser}
              currentProfile={userProfile}
              onGoogleSignIn={async () => {
                await signInWithGoogle();
              }}
              onSignOut={async () => {
                await signOutUser();
              }}
              onSaveProfile={async (data) => {
                await handleSaveProfile(data);
              }}
              onClose={() => setIsOnboardingModalOpen(false)}
              isModal={true}
            />
          </div>
        </div>
      )}

      {/* Provider Detail Modal */}
      {syncedDetailProvider && (
        <ProviderDetailModal
          provider={syncedDetailProvider}
          lang={lang}
          t={t}
          onClose={() => setDetailProvider(null)}
          onBookProvider={setBookingProvider}
        />
      )}

      {/* Booking Modal */}
      {bookingProvider && (
        <BookingModal
          provider={bookingProvider}
          lang={lang}
          t={t}
          firebaseUser={firebaseUser}
          currentProfile={userProfile}
          onClose={() => setBookingProvider(null)}
          onSubmitBooking={submitBooking}
        />
      )}

      {/* Lazy-Loaded Booking Lifecycle, Chat & Review Modals */}
      <Suspense fallback={null}>
        {/* Booking Detail Modal (`BookingDetailPage`) */}
        {syncedDetailBooking && (
          <BookingDetailModal
            booking={syncedDetailBooking}
            lang={lang}
            t={t}
            activeRole={dashboardTab}
            platformFeePct={systemSettings.platformFeePct}
            onClose={() => setDetailBooking(null)}
            onOpenChat={setActiveChatBooking}
            onOpenReschedule={setReschedulingBooking}
            onOpenCancel={setCancellingBooking}
            onOpenReview={setReviewingBooking}
            onConfirmAndReleaseEscrow={clientConfirmAndReleaseEscrow}
          />
        )}

        {/* Cancellation Modal (`CancellationModal`) */}
        {cancellingBooking && (
          <CancellationModal
            booking={cancellingBooking}
            lang={lang}
            t={t}
            actorRole={dashboardTab}
            onClose={() => setCancellingBooking(null)}
            onConfirmCancel={cancelBookingWithReason}
          />
        )}

        {/* Reschedule Modal (`RescheduleModal`) */}
        {reschedulingBooking && (
          <RescheduleModal
            booking={reschedulingBooking}
            lang={lang}
            t={t}
            onClose={() => setReschedulingBooking(null)}
            onConfirmReschedule={rescheduleBooking}
          />
        )}

        {/* Real-Time In-App Chat Drawer (`chats/{bookingId}/messages` / `MessagesPage`) */}
        {activeChatBooking && (
          <ChatDrawerModal
            booking={activeChatBooking}
            relatedBookings={bookings}
            onSwitchBooking={setActiveChatBooking}
            lang={lang}
            t={t}
            firebaseUser={firebaseUser}
            activeRole={dashboardTab}
            activeUserName={
              userProfile?.fullName ||
              (dashboardTab === 'provider'
                ? activeChatBooking.providerName
                : activeChatBooking.clientName)
            }
            localMessages={chatThreads[activeChatBooking.id] || []}
            onSendLocalMessage={sendLocalChatMessage}
            onClose={() => setActiveChatBooking(null)}
          />
        )}

        {/* Client 1–5 Star Review Modal (`ReviewSubmissionPage`) */}
        {reviewingBooking && (
          <ReviewModal
            booking={reviewingBooking}
            lang={lang}
            t={t}
            onClose={() => setReviewingBooking(null)}
            onSubmitReview={submitClientReview}
          />
        )}
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MarketplaceApp />
    </ErrorBoundary>
  );
}
