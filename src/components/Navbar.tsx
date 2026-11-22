import React, { useState, useEffect, useRef } from 'react';
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
import type { User } from 'firebase/auth';
import type { LanguageCode, UserProfileRecord, UserRole } from '../utils/marketplace';
import type { Translations } from '../i18n/translations';
import { canExploreMarketplace } from '../utils/authHelpers';
import type { ProviderTab } from './dashboards/ProviderDashboard';

export type AppView = 'marketplace' | 'dashboard' | 'provider' | 'profile' | 'admin';

interface NavbarProps {
  lang: LanguageCode;
  t: Translations;
  appView: AppView;
  providerTab?: ProviderTab;
  firebaseUser: User | null;
  isVerified: boolean;
  userProfile: UserProfileRecord | null;
  signupRoleIntent: UserRole | null;
  hasAdminAccess: boolean;
  clientActiveCount: number;
  providerPendingCount: number;
  openJobsCount: number;
  onNavigate: (view: AppView, anchor?: string) => void;
  onSelectProviderTab?: (tab: ProviderTab) => void;
  onOpenPostJob?: () => void;
  onToggleLanguage: () => void;
  onOpenAuth: (intent: UserRole) => void;
  onSignOut: () => Promise<void>;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const Navbar: React.FC<NavbarProps> = ({
  lang,
  t,
  appView,
  providerTab = 'jobs',
  firebaseUser,
  isVerified,
  userProfile,
  signupRoleIntent,
  hasAdminAccess,
  clientActiveCount,
  providerPendingCount,
  openJobsCount,
  onNavigate,
  onSelectProviderTab,
  onOpenPostJob,
  onToggleLanguage,
  onOpenAuth,
  onSignOut,
}) => {
  const isAr = lang === 'ar';
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const effectiveRole: UserRole | null = userProfile?.role ?? signupRoleIntent ?? null;
  const isPureProvider = Boolean(firebaseUser && effectiveRole === 'provider');
  const isDoubleAccount = Boolean(firebaseUser && effectiveRole === 'both');
  const isClientCapable = Boolean(
    firebaseUser && (!effectiveRole || effectiveRole === 'client' || effectiveRole === 'both')
  );
  const isProviderCapable = Boolean(
    firebaseUser && (effectiveRole === 'provider' || effectiveRole === 'both')
  );
  const canExplore = !firebaseUser || canExploreMarketplace(effectiveRole);

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
      await onSignOut();
      setDropdownOpen(false);
      setMobileMenuOpen(false);
      onNavigate('marketplace');
    } finally {
      setIsSigningOut(false);
    }
  };

  const navTo = (view: AppView, anchor?: string) => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    onNavigate(view, anchor);
  };

  const goToProviderTab = (tab: ProviderTab) => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    onSelectProviderTab?.(tab);
    onNavigate('provider');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-5 px-4 sm:px-6 lg:px-8 h-16">
        {/* Zone 1: Brand Wordmark (routes pure Maâlem to /provider, others to /) */}
        <button
          type="button"
          onClick={() => navTo(isPureProvider ? 'provider' : 'marketplace')}
          className="inline-flex items-center gap-2 text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span className="w-7 h-7 rounded-lg bg-emerald-700 text-white inline-flex items-center justify-center text-xs font-extrabold">
            M
          </span>
          <span>{t.brandName}</span>
        </button>

        {/* Zone 2: Strict Role-Aware Desktop Primary Navigation */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-5 lg:gap-6 text-sm font-medium text-slate-600"
        >
          {!firebaseUser ? (
            <>
              <button
                type="button"
                onClick={() => navTo('marketplace', 'providers')}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  appView === 'marketplace' ? 'text-slate-900 font-semibold' : ''
                }`}
              >
                {t.navProviders}
              </button>
              <button
                type="button"
                onClick={() => navTo('marketplace', 'how-it-works')}
                className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isAr ? 'كيف تعمل المنصة' : 'Comment ça marche'}
              </button>
            </>
          ) : !isVerified ? (
            <span className="text-xs font-medium text-amber-700">
              {isAr ? 'في انتظار تفعيل البريد الإلكتروني' : 'Vérification e-mail en attente'}
            </span>
          ) : isPureProvider ? (
            /* Pure Maâlem Navigation: ZERO "Explorer other Maâlems" link! */
            <>
              <button
                type="button"
                onClick={() => goToProviderTab('jobs')}
                className={`inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  appView === 'provider' && providerTab === 'jobs'
                    ? 'text-emerald-700 font-semibold'
                    : ''
                }`}
              >
                <span>{isAr ? 'طلبات الزبناء' : 'Offres Clients'}</span>
                {openJobsCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 tabular-nums">
                    {openJobsCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => goToProviderTab('missions')}
                className={`inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  appView === 'provider' && providerTab === 'missions'
                    ? 'text-emerald-700 font-semibold'
                    : ''
                }`}
              >
                <span>{isAr ? 'مهامي' : 'Mes Missions'}</span>
                {providerPendingCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-900 tabular-nums">
                    {providerPendingCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => goToProviderTab('card')}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  appView === 'provider' && providerTab === 'card'
                    ? 'text-emerald-700 font-semibold'
                    : ''
                }`}
              >
                {isAr ? 'بطاقتي المهنية' : 'Ma Fiche Maâlem'}
              </button>
              <button
                type="button"
                onClick={() => goToProviderTab('earnings')}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  appView === 'provider' && providerTab === 'earnings'
                    ? 'text-emerald-700 font-semibold'
                    : ''
                }`}
              >
                {isAr ? 'الأرباح' : 'Revenus'}
              </button>
              {hasAdminAccess && (
                <button
                  type="button"
                  onClick={() => navTo('admin')}
                  className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {t.navAdmin}
                </button>
              )}
            </>
          ) : (
            /* Client or Double Account ('both') Navigation */
            <>
              {canExplore && (
                <button
                  type="button"
                  onClick={() => navTo('marketplace', 'providers')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    appView === 'marketplace' ? 'text-emerald-700 font-semibold' : ''
                  }`}
                >
                  {isAr ? 'استكشف المعلمين' : 'Explorer les Maâlems'}
                </button>
              )}
              {isClientCapable && (
                <button
                  type="button"
                  onClick={() => navTo('dashboard')}
                  className={`inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    appView === 'dashboard' ? 'text-emerald-700 font-semibold' : ''
                  }`}
                >
                  <span>{isAr ? 'فضاء الزبون' : 'Espace Client'}</span>
                  {clientActiveCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 tabular-nums">
                      {clientActiveCount}
                    </span>
                  )}
                </button>
              )}
              {isDoubleAccount && (
                <button
                  type="button"
                  onClick={() => navTo('provider')}
                  className={`inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    appView === 'provider' ? 'text-emerald-700 font-semibold' : ''
                  }`}
                >
                  <span>{t.providerDashboardTab}</span>
                  {providerPendingCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-900 tabular-nums">
                      {providerPendingCount}
                    </span>
                  )}
                </button>
              )}
              {hasAdminAccess && (
                <button
                  type="button"
                  onClick={() => navTo('admin')}
                  className={`hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    appView === 'admin' ? 'text-emerald-700 font-semibold' : ''
                  }`}
                >
                  {t.navAdmin}
                </button>
              )}
            </>
          )}
        </nav>

        {/* Zone 3: Quick Action (Post Job for Clients) + Language + Auth / Account Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {firebaseUser && isVerified && isClientCapable && onOpenPostJob && (
            <button
              type="button"
              onClick={onOpenPostJob}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'نشر طلب' : 'Publier un besoin'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleLanguage}
            aria-label={`Switch language to ${t.langSwitchLabel}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{t.langSwitchLabel}</span>
          </button>

          {!firebaseUser ? (
            <>
              <button
                type="button"
                onClick={() => onOpenAuth('client')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-700" />
                <span>{isAr ? 'تسجيل الدخول' : 'Connexion'}</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('provider')}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isAr ? 'انضم كمعلم' : 'Devenir Maâlem'}
              </button>
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
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => navTo('dashboard')}
                          className="w-full px-4 py-2 text-start text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-between gap-2 cursor-pointer"
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
                        </button>
                      )}

                      {isProviderCapable && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => navTo('provider')}
                          className="w-full px-4 py-2 text-start text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-between gap-2 cursor-pointer"
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
                        </button>
                      )}

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => navTo('profile')}
                        className="w-full px-4 py-2 text-start text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 cursor-pointer"
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
                      </button>

                      {hasAdminAccess && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => navTo('admin')}
                          className="w-full px-4 py-2 text-start text-xs font-medium text-emerald-800 hover:bg-emerald-50 flex items-center gap-2.5 cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4 text-emerald-700" />
                          <span>{t.navAdmin}</span>
                        </button>
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
              <button
                type="button"
                onClick={() => navTo('marketplace', 'providers')}
                className="w-full px-3 py-2.5 rounded-lg text-start text-sm font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
              >
                <Compass className="w-4 h-4 text-emerald-700" />
                <span>{t.navProviders}</span>
              </button>
              <button
                type="button"
                onClick={() => navTo('marketplace', 'how-it-works')}
                className="w-full px-3 py-2.5 rounded-lg text-start text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                {isAr ? 'كيف تعمل المنصة' : 'Comment ça marche'}
              </button>
              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('client');
                  }}
                  className="px-3 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
                >
                  {isAr ? 'تسجيل الدخول' : 'Connexion'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('provider');
                  }}
                  className="px-3 py-2.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
                >
                  {isAr ? 'انضم كمعلم' : 'Devenir Maâlem'}
                </button>
              </div>
            </>
          ) : isPureProvider ? (
            <>
              <button
                type="button"
                onClick={() => goToProviderTab('jobs')}
                className="w-full px-3 py-2.5 rounded-lg text-start text-sm font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
              >
                <Briefcase className="w-4 h-4 text-emerald-700" />
                <span>{isAr ? 'طلبات الزبناء المنشورة' : 'Offres Clients'}</span>
              </button>
              <button
                type="button"
                onClick={() => goToProviderTab('missions')}
                className="w-full px-3 py-2.5 rounded-lg text-start text-sm font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
              >
                <Wrench className="w-4 h-4 text-amber-700" />
                <span>{isAr ? 'مهامي' : 'Mes Missions'}</span>
              </button>
              <button
                type="button"
                onClick={() => goToProviderTab('card')}
                className="w-full px-3 py-2.5 rounded-lg text-start text-sm font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
              >
                <IdCard className="w-4 h-4 text-emerald-700" />
                <span>{isAr ? 'بطاقتي المهنية' : 'Ma Fiche Maâlem'}</span>
              </button>
              <button
                type="button"
                onClick={() => goToProviderTab('earnings')}
                className="w-full px-3 py-2.5 rounded-lg text-start text-sm font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
              >
                <Wallet className="w-4 h-4 text-slate-600" />
                <span>{isAr ? 'الأرباح والسحب' : 'Revenus & Retraits'}</span>
              </button>
              <button
                type="button"
                onClick={() => navTo('profile')}
                className="w-full px-3 py-2.5 rounded-lg text-start text-sm font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
              >
                <UserIcon className="w-4 h-4 text-slate-500" />
                <span>{isAr ? 'الإعدادات والحساب المزدوج' : 'Paramètres & Compte Double'}</span>
              </button>
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
                <button
                  type="button"
                  onClick={() => navTo('marketplace', 'providers')}
                  className="w-full px-3 py-2.5 rounded-lg text-start text-sm font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                >
                  <Compass className="w-4 h-4 text-emerald-700" />
                  <span>{isAr ? 'استكشف المعلمين' : 'Explorer les Maâlems'}</span>
                </button>
              )}
              {isClientCapable && (
                <button
                  type="button"
                  onClick={() => navTo('dashboard')}
                  className="w-full px-3 py-2.5 rounded-lg text-start text-sm font-medium text-slate-800 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
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
                </button>
              )}
              {isClientCapable && onOpenPostJob && isVerified && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenPostJob();
                  }}
                  className="w-full px-3 py-2.5 rounded-lg text-start text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 flex items-center gap-2.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-emerald-700" />
                  <span>{isAr ? 'نشر طلب خدمة جديد' : 'Publier un besoin'}</span>
                </button>
              )}
              {isDoubleAccount && (
                <button
                  type="button"
                  onClick={() => navTo('provider')}
                  className="w-full px-3 py-2.5 rounded-lg text-start text-sm font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                >
                  <Wrench className="w-4 h-4 text-amber-700" />
                  <span>{t.providerDashboardTab}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => navTo('profile')}
                className="w-full px-3 py-2.5 rounded-lg text-start text-sm font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
              >
                <UserIcon className="w-4 h-4 text-slate-500" />
                <span>{isAr ? 'ملفي الشخصي والأمان' : 'Mon Profil & Sécurité'}</span>
              </button>
              {hasAdminAccess && (
                <button
                  type="button"
                  onClick={() => navTo('admin')}
                  className="w-full px-3 py-2.5 rounded-lg text-start text-sm font-medium text-emerald-800 hover:bg-emerald-50 flex items-center gap-2.5 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>{t.navAdmin}</span>
                </button>
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
