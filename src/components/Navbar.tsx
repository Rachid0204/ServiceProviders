import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Globe,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  Wrench,
  User as UserIcon,
  ShieldCheck,
  LogOut,
  LogIn,
  Compass,
  Plus,
  Briefcase,
  IdCard,
  Wallet,
} from 'lucide-react';
import { useMarketplace } from '../app/providers/MarketplaceContext';
import { ROUTE_PATHS, getProviderTabFromPathname } from '../app/routePaths';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const Navbar: React.FC = () => {
  const {
    lang,
    t,
    isAr,
    firebaseUser,
    isVerified,
    userProfile,
    effectiveRole,
    isPureProvider,
    canExplore,
    hasAdminAccess,
    clientActiveCount,
    providerPendingCount,
    openJobsCount,
    toggleLanguage,
    setAuthModalIntent,
    setIsPostJobModalOpen,
    signOutUser,
  } = useMarketplace();

  const location = useLocation();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isDoubleAccount = Boolean(firebaseUser && effectiveRole === 'both');
  const isClientCapable = Boolean(
    firebaseUser && (!effectiveRole || effectiveRole === 'client' || effectiveRole === 'both')
  );
  const isProviderCapable = Boolean(
    firebaseUser && (effectiveRole === 'provider' || effectiveRole === 'both')
  );

  const activeProviderTab = getProviderTabFromPathname(location.pathname);
  const isProviderRoute = location.pathname.startsWith(ROUTE_PATHS.PROVIDER_ROOT);

  const displayName =
    userProfile?.fullName ||
    firebaseUser?.displayName ||
    firebaseUser?.email?.split('@')[0] ||
    (isAr ? 'حسابي' : 'Mon Compte');

  const firstName = displayName.split(' ')[0];
  const initials = getInitials(displayName);

  const roleBadgeLabel =
    effectiveRole === 'both'
      ? isAr
        ? 'حساب مزدوج'
        : 'Client & Maâlem'
      : effectiveRole === 'provider'
      ? isAr
        ? 'معلم / مقدم خدمة'
        : 'Maâlem'
      : isAr
      ? 'زبون'
      : 'Client';

  // Close menus on route change
  useEffect(() => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSignOutClick = async () => {
    setIsSigningOut(true);
    try {
      await signOutUser();
      setDropdownOpen(false);
      setMobileMenuOpen(false);
      navigate(ROUTE_PATHS.HOME, { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
      isActive ? 'text-emerald-700 font-semibold' : ''
    }`;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-5 px-4 sm:px-6 lg:px-8 h-16">
        {/* Zone 1: Brand Wordmark (routes pure Maâlem to /provider/dashboard, others to /) */}
        <Link
          to={isPureProvider ? ROUTE_PATHS.PROVIDER_DASHBOARD : ROUTE_PATHS.HOME}
          className="inline-flex items-center gap-2 text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          <span className="w-7 h-7 rounded-lg bg-emerald-700 text-white inline-flex items-center justify-center text-xs font-extrabold">
            M
          </span>
          <span>{t.brandName}</span>
        </Link>

        {/* Zone 2: Strict Role-Aware Desktop Primary Navigation */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-5 lg:gap-6 text-sm font-medium text-slate-600"
        >
          {!firebaseUser ? (
            <>
              <NavLink to={ROUTE_PATHS.SERVICES} className={navLinkClass}>
                {t.navProviders}
              </NavLink>
              <Link
                to={`${ROUTE_PATHS.HOME}#how-it-works`}
                className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
              >
                {isAr ? 'كيف تعمل المنصة' : 'Comment ça marche'}
              </Link>
            </>
          ) : !isVerified ? (
            <Link
              to={ROUTE_PATHS.VERIFY_EMAIL}
              className="text-xs font-medium text-amber-700 hover:underline"
            >
              {isAr ? 'في انتظار تفعيل البريد الإلكتروني' : 'Vérification e-mail en attente'}
            </Link>
          ) : isPureProvider ? (
            /* Pure Maâlem Navigation: ZERO "Explorer other Maâlems" link! */
            <>
              <NavLink
                to={ROUTE_PATHS.PROVIDER_DASHBOARD}
                className={() =>
                  `inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                    isProviderRoute && activeProviderTab === 'jobs'
                      ? 'text-emerald-700 font-semibold'
                      : ''
                  }`
                }
              >
                <span>{isAr ? 'طلبات الزبناء' : 'Offres Clients'}</span>
                {openJobsCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 tabular-nums">
                    {openJobsCount}
                  </span>
                )}
              </NavLink>
              <NavLink to={ROUTE_PATHS.PROVIDER_MISSIONS} className={navLinkClass}>
                <span>{isAr ? 'مهامي' : 'Mes Missions'}</span>
                {providerPendingCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-900 tabular-nums">
                    {providerPendingCount}
                  </span>
                )}
              </NavLink>
              <NavLink to={ROUTE_PATHS.PROVIDER_CARD} className={navLinkClass}>
                {isAr ? 'بطاقتي المهنية' : 'Ma Fiche Maâlem'}
              </NavLink>
              <NavLink to={ROUTE_PATHS.PROVIDER_SERVICES} className={navLinkClass}>
                {t.providerServicesTab}
              </NavLink>
              <NavLink to={ROUTE_PATHS.PROVIDER_CALENDAR} className={navLinkClass}>
                {t.providerCalendarTab}
              </NavLink>
              <NavLink to={ROUTE_PATHS.PROVIDER_VERIFICATION} className={navLinkClass}>
                {t.providerVerificationTab}
              </NavLink>
              <NavLink to={ROUTE_PATHS.PROVIDER_EARNINGS} className={navLinkClass}>
                {isAr ? 'الأرباح' : 'Revenus'}
              </NavLink>
              {hasAdminAccess && (
                <NavLink to={ROUTE_PATHS.ADMIN_DASHBOARD} className={navLinkClass}>
                  {t.navAdmin}
                </NavLink>
              )}
            </>
          ) : (
            /* Client or Double Account ('both') Navigation */
            <>
              {canExplore && (
                <NavLink to={ROUTE_PATHS.SERVICES} className={navLinkClass}>
                  {isAr ? 'استكشف المعلمين' : 'Explorer les Maâlems'}
                </NavLink>
              )}
              {isClientCapable && (
                <NavLink to={ROUTE_PATHS.CUSTOMER_DASHBOARD} className={navLinkClass}>
                  <span>{isAr ? 'فضاء الزبون' : 'Espace Client'}</span>
                  {clientActiveCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 tabular-nums">
                      {clientActiveCount}
                    </span>
                  )}
                </NavLink>
              )}
              {isDoubleAccount && (
                <NavLink
                  to={ROUTE_PATHS.PROVIDER_DASHBOARD}
                  className={() =>
                    `inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                      isProviderRoute ? 'text-emerald-700 font-semibold' : ''
                    }`
                  }
                >
                  <span>{t.providerDashboardTab}</span>
                  {providerPendingCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-900 tabular-nums">
                      {providerPendingCount}
                    </span>
                  )}
                </NavLink>
              )}
              {hasAdminAccess && (
                <NavLink to={ROUTE_PATHS.ADMIN_DASHBOARD} className={navLinkClass}>
                  {t.navAdmin}
                </NavLink>
              )}
            </>
          )}
        </nav>

        {/* Zone 3: Quick Action (Post Job for Clients) + Language + Auth / Account Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {firebaseUser && isVerified && isClientCapable && (
            <button
              type="button"
              onClick={() => setIsPostJobModalOpen(true)}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'نشر طلب' : 'Publier un besoin'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={toggleLanguage}
            aria-label={`Switch language to ${t.langSwitchLabel}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{t.langSwitchLabel}</span>
          </button>

          {!firebaseUser ? (
            <>
              <Link
                to={ROUTE_PATHS.LOGIN}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-700" />
                <span>{isAr ? 'تسجيل الدخول' : 'Connexion'}</span>
              </Link>
              <Link
                to={`${ROUTE_PATHS.REGISTER}?role=provider`}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0"
              >
                {isAr ? 'انضم كمعلم' : 'Devenir Maâlem'}
              </Link>
            </>
          ) : (
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                aria-expanded={dropdownOpen}
                aria-haspopup="menu"
                className="inline-flex items-center gap-2 ps-1.5 pe-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <span className="w-7 h-7 rounded-full bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center shrink-0">
                  {initials}
                </span>
                <span className="hidden sm:inline text-xs font-semibold text-slate-900 max-w-[110px] truncate">
                  {firstName}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                    dropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {dropdownOpen && (
                <div
                  role="menu"
                  className="absolute end-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50"
                >
                  <div className="px-4 py-2.5 border-b border-slate-100 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {displayName}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap shrink-0">
                        {roleBadgeLabel}
                      </span>
                    </div>
                    {firebaseUser.email && (
                      <div className="text-[11px] text-slate-500 truncate" dir="ltr">
                        {firebaseUser.email}
                      </div>
                    )}
                    {userProfile?.verifiedBadge && (
                      <div className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                        <span>{t.verifiedCinLabel}</span>
                      </div>
                    )}
                  </div>

                  {isVerified && (
                    <div className="py-1.5">
                      {isClientCapable && (
                        <Link
                          to={ROUTE_PATHS.CUSTOMER_DASHBOARD}
                          role="menuitem"
                          className="w-full px-4 py-2 text-start text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-between gap-2"
                        >
                          <span className="inline-flex items-center gap-2.5">
                            <LayoutDashboard className="w-4 h-4 text-emerald-700" />
                            <span>{isAr ? 'فضاء الزبون' : 'Espace Client'}</span>
                          </span>
                          {clientActiveCount > 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 tabular-nums">
                              {clientActiveCount}
                            </span>
                          )}
                        </Link>
                      )}

                      {isProviderCapable && (
                        <Link
                          to={ROUTE_PATHS.PROVIDER_DASHBOARD}
                          role="menuitem"
                          className="w-full px-4 py-2 text-start text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-between gap-2"
                        >
                          <span className="inline-flex items-center gap-2.5">
                            <Wrench className="w-4 h-4 text-amber-700" />
                            <span>{t.providerDashboardTab}</span>
                          </span>
                          {providerPendingCount > 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-900 tabular-nums">
                              {providerPendingCount}
                            </span>
                          )}
                        </Link>
                      )}

                      <Link
                        to={ROUTE_PATHS.CUSTOMER_PROFILE}
                        role="menuitem"
                        className="w-full px-4 py-2 text-start text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5"
                      >
                        <UserIcon className="w-4 h-4 text-slate-500" />
                        <span>
                          {isPureProvider
                            ? isAr
                              ? 'الإعدادات والحساب المزدوج'
                              : 'Paramètres & Compte Double'
                            : isAr
                            ? 'ملفي الشخصي والأمان'
                            : 'Mon Profil & Sécurité'}
                        </span>
                      </Link>

                      {hasAdminAccess && (
                        <Link
                          to={ROUTE_PATHS.ADMIN_DASHBOARD}
                          role="menuitem"
                          className="w-full px-4 py-2 text-start text-xs font-medium text-emerald-800 hover:bg-emerald-50 flex items-center gap-2.5"
                        >
                          <ShieldCheck className="w-4 h-4 text-emerald-700" />
                          <span>{t.navAdmin}</span>
                        </Link>
                      )}
                    </div>
                  )}

                  <div className="pt-1.5 border-t border-slate-100">
                    <button
                      type="button"
                      role="menuitem"
                      disabled={isSigningOut}
                      onClick={() => {
                        void handleSignOutClick();
                      }}
                      className="w-full px-4 py-2 text-start text-xs font-semibold text-rose-700 hover:bg-rose-50 flex items-center gap-2.5 disabled:opacity-60 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t.signOutBtn}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? t.closeBtn : 'Menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Responsive Role-Aware Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2 shadow-md">
          {!firebaseUser ? (
            <>
              <Link
                to={ROUTE_PATHS.SERVICES}
                className="w-full px-3 py-2.5 rounded-lg text-start text-sm font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-2.5"
              >
                <Compass className="w-4 h-4 text-emerald-700" />
                <span>{t.navProviders}</span>
              </Link>
              <Link
                to={`${ROUTE_PATHS.HOME}#how-it-works`}
                className="block w-full px-3 py-2.5 rounded-lg text-start text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {isAr ? 'كيف تعمل المنصة' : 'Comment ça marche'}
              </Link>
              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAuthModalIntent('client');
                  }}
                  className="px-3 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
                >
                  {isAr ? 'تسجيل الدخول' : 'Connexion'}
                </button>
                <Link
                  to={`${ROUTE_PATHS.REGISTER}?role=provider`}
                  className="px-3 py-2.5 text-center text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800"
                >
                  {isAr ? 'انضم كمعلم' : 'Devenir Maâlem'}
                </Link>
              </div>
            </>
          ) : isPureProvider ? (
            <>
              <Link
                to={ROUTE_PATHS.PROVIDER_DASHBOARD}
                className="w-full px-3 py-2.5 rounded-lg text-start text-sm font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-2.5"
              >
                <Briefcase className="w-4 h-4 text-emerald-700" />
                <span>{isAr ? 'طلبات الزبناء المنشورة' : 'Offres Clients'}</span>
              </Link>
              <Link
                to={ROUTE_PATHS.PROVIDER_MISSIONS}
                className="w-full px-3 py-2.5 rounded-lg text-start text-sm font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-2.5"
              >
                <Wrench className="w-4 h-4 text-amber-700" />
                <span>{isAr ? 'مهامي' : 'Mes Missions'}</span>
              </Link>
              <Link
                to={ROUTE_PATHS.PROVIDER_CARD}
                className="w-full px-3 py-2.5 rounded-lg text-start text-sm font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-2.5"
              >
                <IdCard className="w-4 h-4 text-emerald-700" />
                <span>{isAr ? 'بطاقتي المهنية' : 'Ma Fiche Maâlem'}</span>
              </Link>
              <Link
                to={ROUTE_PATHS.PROVIDER_EARNINGS}
                className="w-full px-3 py-2.5 rounded-lg text-start text-sm font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-2.5"
              >
                <Wallet className="w-4 h-4 text-slate-600" />
                <span>{isAr ? 'الأرباح والسحب' : 'Revenus & Retraits'}</span>
              </Link>
              <Link
                to={ROUTE_PATHS.CUSTOMER_PROFILE}
                className="w-full px-3 py-2.5 rounded-lg text-start text-sm font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-2.5"
              >
                <UserIcon className="w-4 h-4 text-slate-500" />
                <span>{isAr ? 'الإعدادات والحساب المزدوج' : 'Paramètres & Compte Double'}</span>
              </Link>
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSigningOut}
                  onClick={() => {
                    void handleSignOutClick();
                  }}
                  className="w-full px-3 py-2.5 rounded-lg text-start text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 flex items-center gap-2.5 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t.signOutBtn}</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {canExplore && (
                <Link
                  to={ROUTE_PATHS.SERVICES}
                  className="w-full px-3 py-2.5 rounded-lg text-start text-sm font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-2.5"
                >
                  <Compass className="w-4 h-4 text-emerald-700" />
                  <span>{isAr ? 'استكشف المعلمين' : 'Explorer les Maâlems'}</span>
                </Link>
              )}
              {isClientCapable && (
                <Link
                  to={ROUTE_PATHS.CUSTOMER_DASHBOARD}
                  className="w-full px-3 py-2.5 rounded-lg text-start text-sm font-medium text-slate-800 hover:bg-slate-50 flex items-center justify-between"
                >
                  <span className="inline-flex items-center gap-2.5">
                    <LayoutDashboard className="w-4 h-4 text-emerald-700" />
                    <span>{isAr ? 'فضاء الزبون' : 'Espace Client'}</span>
                  </span>
                  {clientActiveCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
                      {clientActiveCount}
                    </span>
                  )}
                </Link>
              )}
              {isClientCapable && isVerified && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsPostJobModalOpen(true);
                  }}
                  className="w-full px-3 py-2.5 rounded-lg text-start text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 flex items-center gap-2.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-emerald-700" />
                  <span>{isAr ? 'نشر طلب خدمة جديد' : 'Publier un besoin'}</span>
                </button>
              )}
              {isDoubleAccount && (
                <Link
                  to={ROUTE_PATHS.PROVIDER_DASHBOARD}
                  className="w-full px-3 py-2.5 rounded-lg text-start text-sm font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-2.5"
                >
                  <Wrench className="w-4 h-4 text-amber-700" />
                  <span>{t.providerDashboardTab}</span>
                </Link>
              )}
              <Link
                to={ROUTE_PATHS.CUSTOMER_PROFILE}
                className="w-full px-3 py-2.5 rounded-lg text-start text-sm font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-2.5"
              >
                <UserIcon className="w-4 h-4 text-slate-500" />
                <span>{isAr ? 'ملفي الشخصي والأمان' : 'Mon Profil & Sécurité'}</span>
              </Link>
              {hasAdminAccess && (
                <Link
                  to={ROUTE_PATHS.ADMIN_DASHBOARD}
                  className="w-full px-3 py-2.5 rounded-lg text-start text-sm font-medium text-emerald-800 hover:bg-emerald-50 flex items-center gap-2.5"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>{t.navAdmin}</span>
                </Link>
              )}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSigningOut}
                  onClick={() => {
                    void handleSignOutClick();
                  }}
                  className="w-full px-3 py-2.5 rounded-lg text-start text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 flex items-center gap-2.5 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t.signOutBtn}</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
};
