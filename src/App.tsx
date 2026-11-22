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
  ArrowRight,
  ArrowLeft,
  Navigation,
  Map as MapIcon,
  LayoutGrid,
  Columns,
  MessageCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { TRANSLATIONS } from './i18n/translations';
import {
  MOROCCAN_CITIES,
  SERVICE_CATEGORIES,
  CITY_COORDINATES,
  buildWhatsAppUrl,
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
import { useAdminAccess } from './hooks/useAdminAccess';
import { useProviders } from './hooks/useProviders';
import { useBookings } from './hooks/useBookings';
import { ProviderCard } from './components/ProviderCard';
import { Navbar, type AppView } from './components/Navbar';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy-loaded heavy routes, dashboards, map, and modals (never preloaded upfront on mobile)
const ProviderMap = lazy(() =>
  import('./components/ProviderMap').then((m) => ({ default: m.ProviderMap }))
);
const AdminRoute = lazy(() =>
  import('./components/admin/AdminRoute').then((m) => ({ default: m.AdminRoute }))
);
const ClientDashboard = lazy(() =>
  import('./components/dashboards/ClientDashboard').then((m) => ({ default: m.ClientDashboard }))
);
const ProviderDashboard = lazy(() =>
  import('./components/dashboards/ProviderDashboard').then((m) => ({
    default: m.ProviderDashboard,
  }))
);
const ProfileSettingsView = lazy(() =>
  import('./components/dashboards/ProfileSettingsView').then((m) => ({
    default: m.ProfileSettingsView,
  }))
);
const AuthModal = lazy(() =>
  import('./components/AuthModal').then((m) => ({ default: m.AuthModal }))
);
const BookingModal = lazy(() =>
  import('./components/BookingModal').then((m) => ({ default: m.BookingModal }))
);
const ProviderDetailModal = lazy(() =>
  import('./components/ProviderDetailModal').then((m) => ({ default: m.ProviderDetailModal }))
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

function detectInitialView(): AppView {
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'admin' || pathname === '/admin' || pathname.startsWith('/admin/')) {
      return 'admin';
    }
    if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
      return 'dashboard';
    }
    if (pathname === '/provider' || pathname.startsWith('/provider/')) {
      return 'provider';
    }
    if (pathname === '/profile' || pathname.startsWith('/profile/')) {
      return 'profile';
    }
  }
  return 'marketplace';
}

const VIEW_TO_PATH: Record<AppView, string> = {
  marketplace: '/',
  dashboard: '/dashboard',
  provider: '/provider',
  profile: '/profile',
  admin: '/admin',
};

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
    needsOnboarding,
    userProfile,
    hydrateUserProfile,
    signInWithGoogle,
    signOutUser,
    deleteAccount,
    handleSaveProfile,
    updateOwnProviderDetails,
  } = useMarketplaceAuth(handleLanguageSync);

  const { systemSettings, updateLocalSettings } = useSystemSettings(firebaseUser, authReady);
  const hasAdminAccess = useAdminAccess(firebaseUser, authReady);

  const [appView, setAppView] = useState<AppView>(detectInitialView);

  const navigateView = useCallback((nextView: AppView, anchor?: string) => {
    setAppView(nextView);
    if (typeof window !== 'undefined') {
      const targetUrl = VIEW_TO_PATH[nextView];
      if (window.location.pathname !== targetUrl) {
        window.history.pushState({ view: nextView }, '', targetUrl);
      }
      if (anchor) {
        window.setTimeout(() => {
          document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' });
        }, 60);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
    userProfile,
    onBootstrapUserProfile: hydrateUserProfile,
    lang,
    allProviders,
    platformFeePct: systemSettings.platformFeePct,
    autoRefundOnProviderCancel: systemSettings.autoRefundOnProviderCancel,
    onApplyReviewOverride: applyLocalReviewOverride,
  });

  // Own provider profile strictly bound to firebaseUser.uid (never any other provider)
  const ownProvider = useMemo(
    () => (firebaseUser ? allProviders.find((p) => p.uid === firebaseUser.uid) ?? null : null),
    [firebaseUser, allProviders]
  );

  // Navbar badge counts strictly scoped to authenticated user's own bookings
  const clientActiveCount = useMemo(() => {
    if (!firebaseUser) return 0;
    return bookings.filter(
      (b) =>
        b.clientId === firebaseUser.uid &&
        (b.status === 'pending' || b.status === 'accepted' || b.status === 'in_progress')
    ).length;
  }, [firebaseUser, bookings]);

  const providerPendingCount = useMemo(() => {
    if (!firebaseUser) return 0;
    return bookings.filter(
      (b) => b.providerId === firebaseUser.uid && b.status === 'pending'
    ).length;
  }, [firebaseUser, bookings]);

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
    setMaxHourlyRateMAD((prev) =>
      prev < sliderMaxHourlyRate && prev === 300 ? sliderMaxHourlyRate : prev
    );
  }, [sliderMaxHourlyRate]);

  // Geolocation ("Near Me / قريب مني") & Map/List View Mode (symmetric 3-column grid default on all viewports)
  const [nearMeActive, setNearMeActive] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'split' | 'map'>('grid');

  // Modals & Drawers
  const [authModalIntent, setAuthModalIntent] = useState<'client' | 'provider' | null>(null);
  const [detailProvider, setDetailProvider] = useState<VettedProvider | null>(null);
  const [bookingProvider, setBookingProvider] = useState<VettedProvider | null>(null);
  const [activeChatBooking, setActiveChatBooking] = useState<BookingRecord | null>(null);
  const [detailBooking, setDetailBooking] = useState<BookingRecord | null>(null);
  const [cancellingBooking, setCancellingBooking] = useState<BookingRecord | null>(null);
  const [reschedulingBooking, setReschedulingBooking] = useState<BookingRecord | null>(null);
  const [reviewingBooking, setReviewingBooking] = useState<BookingRecord | null>(null);

  // Close user-scoped modals on sign-out or account switch to prevent stale PII display
  useEffect(() => {
    setBookingProvider(null);
    setActiveChatBooking(null);
    setDetailBooking(null);
    setCancellingBooking(null);
    setReschedulingBooking(null);
    setReviewingBooking(null);
  }, [firebaseUser?.uid]);

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

  // Active role for booking lifecycle & chat modals derived strictly from active route
  const activeModalRole: 'client' | 'provider' = appView === 'provider' ? 'provider' : 'client';

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

  const handleAuthSuccess = (intent: 'client' | 'provider') => {
    if (intent === 'provider') {
      navigateView('profile');
    }
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
        <AdminRoute
          lang={lang}
          t={t}
          onToggleLanguage={toggleLanguage}
          onExitAdmin={() => navigateView('marketplace')}
          onBookFromAdmin={(p) => {
            navigateView('marketplace');
            setBookingProvider(p);
          }}
          firebaseUser={firebaseUser}
          authReady={authReady}
          onGoogleSignIn={async () => {
            await signInWithGoogle();
          }}
          onSignOut={async () => {
            await signOutUser();
          }}
          allProviders={allProviders}
          firestoreProviders={firestoreProviders}
          bookings={bookings}
          chatThreads={chatThreads}
          systemSettings={systemSettings}
          onUpdateLocalSettings={updateLocalSettings}
          onApplyProviderOverride={applyAdminProviderOverride}
          onRemoveProviderReview={removeProviderReview}
          onApplyBookingPatch={applyAdminBookingPatch}
          onSendLocalChatMessage={sendLocalChatMessage}
        />
      </Suspense>
    );
  }

  const supportWhatsAppUrl = buildWhatsAppUrl({
    phone: systemSettings.supportWhatsAppPhone || '+212661428910',
    lang,
    providerName: lang === 'ar' ? 'مول الخدمة' : "Moul L'Khedma",
    category: lang === 'ar' ? 'خدمة منزلية' : 'Service à domicile',
  });

  const isAr = lang === 'ar';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 overflow-x-clip">
      {/* Clean Role-Aware Top Navigation Bar with Account Dropdown & Sign Out */}
      <Navbar
        lang={lang}
        t={t}
        appView={appView}
        firebaseUser={firebaseUser}
        userProfile={userProfile}
        hasAdminAccess={hasAdminAccess}
        clientActiveCount={clientActiveCount}
        providerPendingCount={providerPendingCount}
        onNavigate={navigateView}
        onToggleLanguage={toggleLanguage}
        onOpenAuth={(intent) => setAuthModalIntent(intent)}
        onSignOut={signOutUser}
      />

      {/* Gentle Onboarding Prompt Bar for Signed-in New Accounts Without Profile Yet */}
      {firebaseUser && needsOnboarding && appView !== 'profile' && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-950">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                {isAr
                  ? 'أكمل ملفك الشخصي (رقم الهاتف والمدينة) لتسريع حجوزاتك أو تفعيل فضاء المعلم.'
                  : 'Complétez votre profil (téléphone marocain & ville) pour réserver en un clic ou activer votre espace Maâlem.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigateView('profile')}
              className="px-3 py-1 font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 whitespace-nowrap cursor-pointer"
            >
              {isAr ? 'إكمال ملفي الآن' : 'Compléter mon profil'}
            </button>
          </div>
        </div>
      )}

      {/* Main Routed View */}
      <main id="top" className="flex-1">
        {appView === 'dashboard' && (
          <Suspense
            fallback={
              <div className="max-w-7xl mx-auto px-4 py-16 text-center text-xs text-slate-500">
                {isAr ? 'جاري تحميل طلباتك...' : 'Chargement de vos réservations...'}
              </div>
            }
          >
            <ClientDashboard
              lang={lang}
              t={t}
              firebaseUser={firebaseUser}
              platformFeePct={systemSettings.platformFeePct}
              bookingActionError={bookingActionError}
              onDismissError={clearBookingActionError}
              bookings={bookings}
              onExploreProviders={() => navigateView('marketplace', 'providers')}
              onOpenAuth={() => setAuthModalIntent('client')}
              onOpenChat={setActiveChatBooking}
              onOpenBookingDetail={setDetailBooking}
              onOpenReschedule={setReschedulingBooking}
              onOpenCancel={setCancellingBooking}
              onConfirmAndReleaseEscrow={(id) => {
                void clientConfirmAndReleaseEscrow(id);
              }}
              onOpenReview={setReviewingBooking}
            />
          </Suspense>
        )}

        {appView === 'provider' && (
          <Suspense
            fallback={
              <div className="max-w-7xl mx-auto px-4 py-16 text-center text-xs text-slate-500">
                {isAr ? 'جاري تحميل فضاء المعلم...' : 'Chargement de votre espace Maâlem...'}
              </div>
            }
          >
            <ProviderDashboard
              lang={lang}
              t={t}
              firebaseUser={firebaseUser}
              userProfile={userProfile}
              ownProvider={ownProvider}
              systemSettings={systemSettings}
              bookingActionError={bookingActionError}
              onDismissError={clearBookingActionError}
              bookings={bookings}
              onToggleProviderAvailability={toggleProviderAvailability}
              onUpdateProviderDetails={updateOwnProviderDetails}
              onOpenAuth={() => setAuthModalIntent('provider')}
              onGoToProfile={() => navigateView('profile')}
              onExploreProviders={() => navigateView('marketplace', 'providers')}
              onOpenChat={setActiveChatBooking}
              onOpenBookingDetail={setDetailBooking}
              onOpenCancel={setCancellingBooking}
              onUpdateBookingStatus={updateBookingStatus}
            />
          </Suspense>
        )}

        {appView === 'profile' && (
          <Suspense
            fallback={
              <div className="max-w-4xl mx-auto px-4 py-16 text-center text-xs text-slate-500">
                {isAr ? 'جاري تحميل ملفك الشخصي...' : 'Chargement de votre profil...'}
              </div>
            }
          >
            <ProfileSettingsView
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
              onDeleteAccount={deleteAccount}
              onSaveProfile={handleSaveProfile}
              onOpenAuth={() => setAuthModalIntent('client')}
              onBackToMarketplace={() => navigateView('marketplace')}
            />
          </Suspense>
        )}

        {appView === 'marketplace' && (
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
                          document
                            .getElementById('providers')
                            ?.scrollIntoView({ behavior: 'smooth' });
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

            {/* Section 2: Service Provider Discovery, Symmetric 3-Col Grid & Sticky Split Map */}
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
                              label: isAr ? ref.labelAr : ref.labelFr,
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

                {/* Discovery Content: Empty State or Symmetric 3-Col Grid / Sticky Split / Full Map */}
                {filteredProviders.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
                    <Wrench className="w-8 h-8 text-slate-400 mx-auto" />
                    <h3 className="text-base font-bold text-slate-900">{t.emptyResultsTitle}</h3>
                    <p className="text-xs text-slate-600 max-w-md mx-auto">
                      {t.emptyResultsDesc}
                    </p>
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
                            ? 'lg:col-span-5 lg:sticky lg:top-20 h-[calc(100vh-6rem)] min-h-[480px] max-h-[680px]'
                            : 'w-full h-[580px]'
                        }
                      >
                        <Suspense
                          fallback={
                            <div className="w-full h-full rounded-xl border border-slate-200 bg-slate-100 animate-pulse flex items-center justify-center text-xs text-slate-500">
                              {isAr ? 'جاري تحميل الخريطة...' : 'Chargement de la carte...'}
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

            {/* Section 3: How It Works & Trust Guarantees */}
            <section
              id="how-it-works"
              className="py-12 lg:py-16 bg-white border-y border-slate-200"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                <div className="max-w-2xl">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {t.howItWorksTitle}
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-2.5">
                    <ShieldCheck className="w-6 h-6 text-emerald-700" />
                    <h3 className="text-sm font-bold text-slate-900">{t.howItWorksStep1Title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t.howItWorksStep1Desc}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-2.5">
                    <CheckCircle2 className="w-6 h-6 text-emerald-700" />
                    <h3 className="text-sm font-bold text-slate-900">{t.howItWorksStep2Title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t.howItWorksStep2Desc}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-2.5">
                    <Navigation className="w-6 h-6 text-amber-700" />
                    <h3 className="text-sm font-bold text-slate-900">{t.howItWorksStep3Title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t.howItWorksStep3Desc}
                    </p>
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
                        ? 'انضم مجاناً إلى شبكة مول الخدمة، استقبل طلبات الزبناء في حيك، واستفد من الدفع المضمون عبر CMI وتحويلات RIB السريعة.'
                        : 'Rejoignez gratuitement Moul L’Khedma, recevez des demandes qualifiées dans votre quartier et sécurisez vos paiements par séquestre CMI et virement RIB.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (firebaseUser) {
                          navigateView('provider');
                        } else {
                          setAuthModalIntent('provider');
                        }
                      }}
                      className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors cursor-pointer"
                    >
                      <span>
                        {firebaseUser
                          ? t.providerDashboardTab
                          : isAr
                          ? 'إنشاء حساب معلم مجاناً'
                          : 'Rejoindre en tant que Maâlem'}
                      </span>
                      <ArrowIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Structured 4-Column Professional Footer */}
      <footer className="bg-white border-t border-slate-200 pt-10 pb-24 md:pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-xs">
            <div className="space-y-2.5">
              <div className="text-base font-bold text-slate-900">
                {t.brandName}{' '}
                <span className="text-emerald-700 font-semibold">({t.brandArabic})</span>
              </div>
              <p className="text-slate-600 leading-relaxed">{t.footerTagline}</p>
            </div>

            <div className="space-y-2.5">
              <div className="font-bold text-slate-900">
                {isAr ? 'الخدمات الرئيسية' : 'Métiers & Services'}
              </div>
              <ul className="space-y-1.5 text-slate-600">
                {SERVICE_CATEGORIES.map((cat) => (
                  <li key={cat}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        navigateView('marketplace', 'providers');
                      }}
                      className="hover:text-emerald-700 hover:underline cursor-pointer"
                    >
                      {t.categories[cat]}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2.5">
              <div className="font-bold text-slate-900">
                {isAr ? 'المدن المغطاة' : 'Villes desservies'}
              </div>
              <ul className="space-y-1.5 text-slate-600">
                {MOROCCAN_CITIES.map((city) => (
                  <li key={city}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCity(city);
                        navigateView('marketplace', 'providers');
                      }}
                      className="hover:text-emerald-700 hover:underline cursor-pointer"
                    >
                      {t.cities[city]}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2.5">
              <div className="font-bold text-slate-900">
                {isAr ? 'الحساب والدعم' : 'Espaces & Support'}
              </div>
              <ul className="space-y-1.5 text-slate-600">
                <li>
                  <button
                    type="button"
                    onClick={() =>
                      firebaseUser ? navigateView('dashboard') : setAuthModalIntent('client')
                    }
                    className="hover:text-emerald-700 hover:underline cursor-pointer"
                  >
                    {t.clientDashboardTab}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() =>
                      firebaseUser ? navigateView('provider') : setAuthModalIntent('provider')
                    }
                    className="hover:text-emerald-700 hover:underline cursor-pointer"
                  >
                    {t.providerDashboardTab}
                  </button>
                </li>
                <li>
                  <a
                    href={supportWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-emerald-700 hover:underline"
                  >
                    {isAr ? 'دعم واتساب المباشر' : 'Support WhatsApp'}
                  </a>
                </li>
                {hasAdminAccess && (
                  <li>
                    <button
                      type="button"
                      onClick={() => navigateView('admin')}
                      className="text-emerald-700 font-semibold hover:underline cursor-pointer"
                    >
                      {t.navAdmin}
                    </button>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <span>{t.footerRights}</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>
                {isAr
                  ? 'حماية الزبون وضمان CMI — 100% مغربي'
                  : 'Protection client & séquestre CMI — 100% Maroc'}
              </span>
            </span>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky First-Contact & Near-Me Action Bar (on Landing Page) */}
      {appView === 'marketplace' && (
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
      )}

      {/* Lazy-Loaded Auth, Provider Detail & Booking Modals */}
      <Suspense fallback={null}>
        {authModalIntent && (
          <AuthModal
            lang={lang}
            t={t}
            intent={authModalIntent}
            onGoogleSignIn={async () => {
              await signInWithGoogle();
            }}
            onAuthSuccess={handleAuthSuccess}
            onClose={() => setAuthModalIntent(null)}
          />
        )}

        {syncedDetailProvider && (
          <ProviderDetailModal
            provider={syncedDetailProvider}
            lang={lang}
            t={t}
            onClose={() => setDetailProvider(null)}
            onBookProvider={setBookingProvider}
          />
        )}

        {bookingProvider && (
          <BookingModal
            provider={bookingProvider}
            lang={lang}
            t={t}
            firebaseUser={firebaseUser}
            currentProfile={userProfile}
            onGoogleSignIn={async () => {
              await signInWithGoogle();
            }}
            onOpenAuthModal={() => setAuthModalIntent('client')}
            onClose={() => setBookingProvider(null)}
            onSubmitBooking={submitBooking}
          />
        )}
      </Suspense>

      {/* Lazy-Loaded Booking Lifecycle, Chat & Review Modals */}
      <Suspense fallback={null}>
        {syncedDetailBooking && (
          <BookingDetailModal
            booking={syncedDetailBooking}
            lang={lang}
            t={t}
            activeRole={activeModalRole}
            platformFeePct={systemSettings.platformFeePct}
            onClose={() => setDetailBooking(null)}
            onOpenChat={setActiveChatBooking}
            onOpenReschedule={setReschedulingBooking}
            onOpenCancel={setCancellingBooking}
            onOpenReview={setReviewingBooking}
            onConfirmAndReleaseEscrow={clientConfirmAndReleaseEscrow}
          />
        )}

        {cancellingBooking && (
          <CancellationModal
            booking={cancellingBooking}
            lang={lang}
            t={t}
            actorRole={activeModalRole}
            onClose={() => setCancellingBooking(null)}
            onConfirmCancel={cancelBookingWithReason}
          />
        )}

        {reschedulingBooking && (
          <RescheduleModal
            booking={reschedulingBooking}
            lang={lang}
            t={t}
            onClose={() => setReschedulingBooking(null)}
            onConfirmReschedule={rescheduleBooking}
          />
        )}

        {activeChatBooking && (
          <ChatDrawerModal
            booking={activeChatBooking}
            relatedBookings={bookings}
            onSwitchBooking={setActiveChatBooking}
            lang={lang}
            t={t}
            firebaseUser={firebaseUser}
            activeRole={activeModalRole}
            activeUserName={
              userProfile?.fullName ||
              (activeModalRole === 'provider'
                ? activeChatBooking.providerName
                : activeChatBooking.clientName)
            }
            localMessages={chatThreads[activeChatBooking.id] || []}
            onSendLocalMessage={sendLocalChatMessage}
            onClose={() => setActiveChatBooking(null)}
          />
        )}

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
