import { uiText } from '../i18n/uiCopy';
import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  MapPin,
  Wrench,
  Navigation,
  Map as MapIcon,
  LayoutGrid,
  Columns,
  ArrowUpDown,
  LayoutList,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import {
  MOROCCAN_CITIES,
  SERVICE_CATEGORIES,
  CITY_COORDINATES,
  formatMadCurrency,
  filterProviders,
  type MoroccanCity,
  type ProviderSortOption,
  type ServiceCategory,
  type VettedProvider,
} from '../utils/marketplace';
import {
  TRADE_META,
  getTradeShortLabel,
  formatProviderResultsLabel,
} from '../utils/tradeMeta';
import { useMarketplace } from '../app/providers/MarketplaceContext';
import {
  ROUTE_PATHS,
  buildProviderDetailPath,
  buildServiceCategoryPath,
} from '../app/routePaths';
import { ProviderCard } from './ProviderCard';

const ProviderMap = lazy(() =>
  import('./ProviderMap').then((m) => ({ default: m.ProviderMap }))
);

const PAGE_SIZE = 9;
const VALID_SORT_OPTIONS: ProviderSortOption[] = [
  'recommended',
  'rating_desc',
  'price_asc',
  'price_desc',
  'experience_desc',
  'distance_asc',
];

interface ProviderDiscoverySectionProps {
  /** Controlled category from `/services/:category` route param, or undefined for local/query state. */
  routeCategory?: ServiceCategory | 'ALL';
  /** When true, clicking category tabs navigates between `/services` and `/services/:category` and syncs query params. */
  syncUrl?: boolean;
  /** When true (e.g. on HomePage), renders the unified 12-trade section heading above the discovery bar. */
  showSectionHeader?: boolean;
  /** External trigger counter or active near-me state when invoked from hero/mobile sticky bar. */
  nearMeActive?: boolean;
  isLocating?: boolean;
  userCoords?: { lat: number; lng: number; label: string } | null;
  onToggleNearMe?: () => void;
  onUpdateUserCoords?: (coords: { lat: number; lng: number; label: string } | null) => void;
}

const ProviderCardSkeleton: React.FC = () => (
  <div
    aria-hidden="true"
    className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between animate-pulse"
  >
    <div>
      <div className="h-44 bg-slate-200" />
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-24 bg-slate-200 rounded" />
          <div className="h-3.5 w-20 bg-slate-100 rounded" />
        </div>
        <div className="h-5 w-44 bg-slate-200 rounded" />
        <div className="space-y-1.5">
          <div className="h-3 w-full bg-slate-100 rounded" />
          <div className="h-3 w-4/5 bg-slate-100 rounded" />
        </div>
        <div className="h-3 w-2/3 bg-slate-100 rounded" />
      </div>
    </div>
    <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
      <div className="space-y-1.5">
        <div className="h-3 w-20 bg-slate-200 rounded" />
        <div className="h-4 w-24 bg-slate-200 rounded" />
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-10 w-20 bg-slate-200 rounded-lg" />
        <div className="h-10 w-24 bg-slate-200 rounded-lg" />
      </div>
    </div>
  </div>
);

export const ProviderDiscoverySection: React.FC<ProviderDiscoverySectionProps> = ({
  routeCategory,
  syncUrl = false,
  showSectionHeader = false,
  nearMeActive: externalNearMe,
  isLocating: externalLocating,
  userCoords: externalCoords,
  onToggleNearMe: externalToggleNearMe,
  onUpdateUserCoords: externalUpdateCoords,
}) => {
  const {
    lang,
    t,
    isAr,
    allProviders,
    isLoadingProviders,
    hasMoreProviders,
    isLoadingMoreProviders,
    loadMoreProviders,
    userProfile,
    favoriteProviderIds,
    toggleFavoriteProvider,
    setBookingProvider,
  } = useMarketplace();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const sliderMaxHourlyRate = useMemo(() => {
    const highest = allProviders.reduce((max, p) => Math.max(max, p.hourlyRateMAD), 300);
    return Math.max(300, Math.ceil(highest / 50) * 50);
  }, [allProviders]);

  const initialCityParam = searchParams.get('city');
  const validInitialCity: MoroccanCity | 'ALL' =
    initialCityParam && MOROCCAN_CITIES.includes(initialCityParam as MoroccanCity)
      ? (initialCityParam as MoroccanCity)
      : 'ALL';

  const initialSortParam = searchParams.get('sort') as ProviderSortOption | null;
  const validInitialSort: ProviderSortOption =
    initialSortParam && VALID_SORT_OPTIONS.includes(initialSortParam)
      ? initialSortParam
      : 'recommended';

  const [selectedCity, setSelectedCity] = useState<MoroccanCity | 'ALL'>(validInitialCity);
  const [localCategory, setLocalCategory] = useState<ServiceCategory | 'ALL'>(
    routeCategory ?? 'ALL'
  );
  const [quartierQuery, setQuartierQuery] = useState<string>(searchParams.get('quartier') || '');
  const [maxHourlyRateMAD, setMaxHourlyRateMAD] = useState<number>(sliderMaxHourlyRate);
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('q') || '');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(
    searchParams.get('verified') === '1'
  );
  const [availableNowOnly, setAvailableNowOnly] = useState<boolean>(
    searchParams.get('available') === '1'
  );
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(
    searchParams.get('favorites') === '1'
  );
  const [sortBy, setSortBy] = useState<ProviderSortOption>(validInitialSort);
  const [currentPage, setCurrentPage] = useState<number>(() => {
    const parsed = Number(searchParams.get('page') || 1);
    return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
  });
  const [viewMode, setViewMode] = useState<'grid' | 'split' | 'map'>('grid');

  // Local fallback geolocation state when not controlled by HomePage
  const [internalNearMe, setInternalNearMe] = useState(false);
  const [internalLocating, setInternalLocating] = useState(false);
  const [internalCoords, setInternalCoords] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);

  const nearMeActive = externalNearMe ?? internalNearMe;
  const isLocating = externalLocating ?? internalLocating;
  const userCoords = externalCoords !== undefined ? externalCoords : internalCoords;
  const setUserCoords = externalUpdateCoords ?? setInternalCoords;

  const selectedCategory: ServiceCategory | 'ALL' =
    routeCategory !== undefined ? routeCategory : localCategory;

  // Sync URL query params into state when navigating via browser back/forward on /services
  useEffect(() => {
    if (!syncUrl) return;
    const paramCity = searchParams.get('city');
    if (paramCity && MOROCCAN_CITIES.includes(paramCity as MoroccanCity)) {
      setSelectedCity(paramCity as MoroccanCity);
    } else if (!paramCity) {
      setSelectedCity('ALL');
    }
    setSearchQuery(searchParams.get('q') || '');
    setQuartierQuery(searchParams.get('quartier') || '');
    setVerifiedOnly(searchParams.get('verified') === '1');
    setAvailableNowOnly(searchParams.get('available') === '1');
  }, [syncUrl, searchParams]);

  useEffect(() => {
    setMaxHourlyRateMAD((prev) =>
      prev < sliderMaxHourlyRate && prev === 300 ? sliderMaxHourlyRate : prev
    );
  }, [sliderMaxHourlyRate]);

  const updateQueryParam = (key: string, value: string | null) => {
    if (!syncUrl) return;
    const next = new URLSearchParams(searchParams);
    if (value && value.trim()) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next, { replace: true });
  };

  const handleToggleNearMe = () => {
    if (externalToggleNearMe) {
      externalToggleNearMe();
      return;
    }
    if (internalNearMe) {
      setInternalNearMe(false);
      setInternalCoords(null);
      return;
    }
    setInternalNearMe(true);
    const fallbackCity: MoroccanCity =
      selectedCity !== 'ALL' ? selectedCity : userProfile?.city || 'Casablanca';
    const fallbackRef = CITY_COORDINATES[fallbackCity];

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      setInternalLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setInternalLocating(false);
          setInternalCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            label: uiText(isAr).publicUi.maPositionGps,
          });
        },
        () => {
          setInternalLocating(false);
          setInternalCoords({
            lat: fallbackRef.lat,
            lng: fallbackRef.lng,
            label: isAr ? fallbackRef.labelAr : fallbackRef.labelFr,
          });
        },
        { timeout: 3500 }
      );
    } else {
      setInternalCoords({
        lat: fallbackRef.lat,
        lng: fallbackRef.lng,
        label: isAr ? fallbackRef.labelAr : fallbackRef.labelFr,
      });
    }
  };

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
        favoritesOnly,
        favoriteIds: favoriteProviderIds,
        sortBy,
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
      favoritesOnly,
      favoriteProviderIds,
      sortBy,
      userCoords,
      nearMeActive,
    ]
  );

  const totalPages = Math.max(1, Math.ceil(filteredProviders.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProviders = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredProviders.slice(start, start + PAGE_SIZE);
  }, [filteredProviders, safePage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCity !== 'ALL') count += 1;
    if (selectedCategory !== 'ALL') count += 1;
    if (quartierQuery.trim() !== '') count += 1;
    if (maxHourlyRateMAD < sliderMaxHourlyRate) count += 1;
    if (searchQuery.trim() !== '') count += 1;
    if (verifiedOnly) count += 1;
    if (availableNowOnly) count += 1;
    if (favoritesOnly) count += 1;
    if (sortBy !== 'recommended') count += 1;
    if (nearMeActive) count += 1;
    return count;
  }, [
    selectedCity,
    selectedCategory,
    quartierQuery,
    maxHourlyRateMAD,
    sliderMaxHourlyRate,
    searchQuery,
    verifiedOnly,
    availableNowOnly,
    favoritesOnly,
    sortBy,
    nearMeActive,
  ]);

  const resetAllFilters = () => {
    setSelectedCity('ALL');
    setLocalCategory('ALL');
    setQuartierQuery('');
    setMaxHourlyRateMAD(sliderMaxHourlyRate);
    setSearchQuery('');
    setVerifiedOnly(false);
    setAvailableNowOnly(false);
    setFavoritesOnly(false);
    setSortBy('recommended');
    setCurrentPage(1);
    setInternalNearMe(false);
    setUserCoords(null);
    if (syncUrl) {
      navigate(ROUTE_PATHS.SERVICES, { replace: true });
    }
  };

  const handleViewProviderDetails = (provider: VettedProvider) => {
    navigate(buildProviderDetailPath(provider.id));
  };

  const preservedSearch = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const showInitialSkeleton = isLoadingProviders && allProviders.length === 0;
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  return (
    <section id="providers" className="py-8 sm:py-10 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        {showSectionHeader && (
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                {t.categoriesExplorerTitle}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                {t.categoriesExplorerSubtitle}
              </p>
            </div>
            <Link
              to={ROUTE_PATHS.SERVICES}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline whitespace-nowrap"
            >
              <span>{t.allServicesTab}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Unified 12-Trade Selector with Unique Icons (zero duplication, no mid-word truncation) */}
        <div className="relative">
          <div
            role="group"
            aria-label="Service Categories"
            className="flex sm:flex-wrap items-center gap-2 overflow-x-auto sm:overflow-visible no-scrollbar scroll-smooth pb-1 sm:pb-0 pe-8 sm:pe-0"
          >
            {syncUrl ? (
              <>
                <Link
                  to={`${ROUTE_PATHS.SERVICES}${preservedSearch}`}
                  className={`inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                    selectedCategory === 'ALL'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <LayoutList className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.filterAllCategories}</span>
                </Link>
                {SERVICE_CATEGORIES.map((category) => {
                  const Icon = TRADE_META[category].icon;
                  const active = selectedCategory === category;
                  return (
                    <Link
                      key={category}
                      to={`${buildServiceCategoryPath(category)}${preservedSearch}`}
                      className={`inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40'
                      }`}
                    >
                      <Icon
                        className={`w-3.5 h-3.5 shrink-0 ${
                          active ? 'text-white' : 'text-emerald-700'
                        }`}
                      />
                      <span>{getTradeShortLabel(category, lang)}</span>
                    </Link>
                  );
                })}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setLocalCategory('ALL');
                    setCurrentPage(1);
                  }}
                  aria-pressed={selectedCategory === 'ALL'}
                  className={`inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedCategory === 'ALL'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <LayoutList className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.filterAllCategories}</span>
                </button>
                {SERVICE_CATEGORIES.map((category) => {
                  const Icon = TRADE_META[category].icon;
                  const active = selectedCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        setLocalCategory(category);
                        setCurrentPage(1);
                      }}
                      aria-pressed={active}
                      className={`inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40'
                      }`}
                    >
                      <Icon
                        className={`w-3.5 h-3.5 shrink-0 ${
                          active ? 'text-white' : 'text-emerald-700'
                        }`}
                      />
                      <span>{getTradeShortLabel(category, lang)}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
          {/* Soft scroll-edge fade cue on mobile horizontal scroll */}
          <div
            aria-hidden="true"
            className="sm:hidden pointer-events-none absolute inset-y-0 end-0 w-8 bg-gradient-to-l from-slate-50 to-transparent"
          />
        </div>

        {/* Clean Search, Filter & View-Mode Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-4 relative">
              <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
              <input
                type="search"
                aria-label={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                  updateQueryParam('q', e.target.value);
                }}
                placeholder={t.searchPlaceholder}
                className="w-full min-h-[40px] ps-10 pe-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="lg:col-span-2">
              <select
                aria-label={t.cityLabel}
                value={selectedCity}
                onChange={(e) => {
                  const val = e.target.value as MoroccanCity | 'ALL';
                  setSelectedCity(val);
                  setCurrentPage(1);
                  updateQueryParam('city', val === 'ALL' ? null : val);
                  if (nearMeActive && val !== 'ALL') {
                    const ref = CITY_COORDINATES[val];
                    setUserCoords({
                      lat: ref.lat,
                      lng: ref.lng,
                      label: isAr ? ref.labelAr : ref.labelFr,
                    });
                  }
                }}
                className="w-full min-h-[40px] px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
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
              <MapPin className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
              <input
                type="text"
                aria-label={t.quartierFilterPlaceholder}
                value={quartierQuery}
                onChange={(e) => {
                  setQuartierQuery(e.target.value);
                  setCurrentPage(1);
                  updateQueryParam('quartier', e.target.value);
                }}
                placeholder={t.quartierFilterPlaceholder}
                className="w-full min-h-[40px] ps-9 pe-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="lg:col-span-3 flex flex-col justify-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 min-h-[40px]">
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
                onChange={(e) => {
                  setMaxHourlyRateMAD(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-full accent-emerald-700 mt-1 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <label className="inline-flex items-center gap-2 min-h-[40px] text-xs font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => {
                    setVerifiedOnly(e.target.checked);
                    setCurrentPage(1);
                    updateQueryParam('verified', e.target.checked ? '1' : null);
                  }}
                  className="w-4 h-4 rounded border-slate-300 accent-emerald-700"
                />
                <span>{t.filterVerifiedOnly}</span>
              </label>

              <label className="inline-flex items-center gap-2 min-h-[40px] text-xs font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={availableNowOnly}
                  onChange={(e) => {
                    setAvailableNowOnly(e.target.checked);
                    setCurrentPage(1);
                    updateQueryParam('available', e.target.checked ? '1' : null);
                  }}
                  className="w-4 h-4 rounded border-slate-300 accent-emerald-700"
                />
                <span>{t.filterAvailableNow}</span>
              </label>

              <label className="inline-flex items-center gap-2 min-h-[40px] text-xs font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={favoritesOnly}
                  onChange={(e) => {
                    setFavoritesOnly(e.target.checked);
                    setCurrentPage(1);
                    updateQueryParam('favorites', e.target.checked ? '1' : null);
                  }}
                  className="w-4 h-4 rounded border-slate-300 accent-emerald-700"
                />
                <span>
                  {t.favoritesOnlyLabel}
                  {favoriteProviderIds.length > 0 ? ` (${favoriteProviderIds.length})` : ''}
                </span>
              </label>

              <button
                type="button"
                onClick={handleToggleNearMe}
                aria-pressed={nearMeActive}
                className={`inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
                  {t.nearMeActiveBadge} · {userCoords.label}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  aria-label={t.sortByLabel}
                  value={sortBy}
                  onChange={(e) => {
                    const nextSort = e.target.value as ProviderSortOption;
                    setSortBy(nextSort);
                    setCurrentPage(1);
                    updateQueryParam('sort', nextSort === 'recommended' ? null : nextSort);
                  }}
                  className="min-h-[40px] px-2.5 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="recommended">{t.sortRecommended}</option>
                  <option value="rating_desc">{t.sortRatingDesc}</option>
                  <option value="price_asc">{t.sortPriceAsc}</option>
                  <option value="price_desc">{t.sortPriceDesc}</option>
                  <option value="experience_desc">{t.sortExperienceDesc}</option>
                  {userCoords && <option value="distance_asc">{t.sortDistanceAsc}</option>}
                </select>
              </div>

              <div
                role="group"
                aria-label="View Mode"
                className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
              >
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`inline-flex items-center gap-1.5 min-h-[34px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
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
                  className={`inline-flex items-center gap-1.5 min-h-[34px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
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
                  className={`inline-flex items-center gap-1.5 min-h-[34px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
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
        </div>

        {/* Results Status Line & Filter Reset */}
        <div className="flex items-center justify-between text-xs text-slate-600 min-h-[24px]">
          <div>
            {showInitialSkeleton ? (
              <span
                aria-label={t.routeLoadingLabel}
                className="inline-block h-4 w-44 rounded bg-slate-200 animate-pulse align-middle"
              />
            ) : (
              <span className="font-semibold text-slate-800 tabular-nums">
                {formatProviderResultsLabel(filteredProviders.length, lang, verifiedOnly)}
              </span>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="text-emerald-700 font-semibold hover:underline cursor-pointer"
            >
              {t.resetFilters} ({activeFiltersCount})
            </button>
          )}
        </div>

        {/* Cards / Skeletons / Empty State */}
        {showInitialSkeleton ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <ProviderCardSkeleton key={idx} />
            ))}
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 sm:p-12 text-center space-y-3">
            <Wrench className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">{t.emptyResultsTitle}</h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
              {t.emptyResultsDesc}
            </p>
            <button
              type="button"
              onClick={resetAllFilters}
              className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {t.resetFilters}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div
              className={
                viewMode === 'split' ? 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start' : 'block'
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
                  {paginatedProviders.map((provider) => (
                    <ProviderCard
                      key={provider.id}
                      provider={provider}
                      lang={lang}
                      t={t}
                      isFavorite={favoriteProviderIds.includes(provider.id)}
                      onToggleFavorite={(pid) => {
                        void toggleFavoriteProvider(pid);
                      }}
                      onViewDetails={handleViewProviderDetails}
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
                        {uiText(isAr).publicUi.chargementDeLaCarte}
                      </div>
                    }
                  >
                    <ProviderMap
                      providers={filteredProviders}
                      lang={lang}
                      t={t}
                      userCoords={userCoords}
                      onSelectProvider={handleViewProviderDetails}
                      onBookProvider={setBookingProvider}
                    />
                  </Suspense>
                </div>
              )}
            </div>

            {viewMode !== 'map' && totalPages > 1 && (
              <nav
                aria-label="Pagination"
                className="flex items-center justify-center gap-3 pt-2"
              >
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => {
                    const nextPage = Math.max(1, safePage - 1);
                    setCurrentPage(nextPage);
                    updateQueryParam('page', nextPage <= 1 ? null : String(nextPage));
                  }}
                  className="min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  {t.paginationPrev}
                </button>
                <span className="text-xs font-semibold text-slate-700 tabular-nums">
                  {t.paginationPageOf} {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => {
                    const nextPage = Math.min(totalPages, safePage + 1);
                    setCurrentPage(nextPage);
                    updateQueryParam('page', String(nextPage));
                  }}
                  className="min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  {t.paginationNext}
                </button>
              </nav>
            )}
            {hasMoreProviders && (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  data-testid="load-more-providers-btn"
                  disabled={isLoadingMoreProviders}
                  onClick={() => {
                    void loadMoreProviders();
                  }}
                  className="min-h-[44px] px-5 py-2.5 text-xs font-semibold rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isLoadingMoreProviders
                    ? uiText(isAr).publicUi.chargement
                    : uiText(isAr).publicUi.chargerPlusDeMaalems}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
