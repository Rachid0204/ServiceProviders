import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShieldCheck,
  Briefcase,
  Users,
  MessageSquareWarning,
  History,
  Landmark,
  Settings,
  ArrowLeft,
  ArrowRight,
  Globe,
  Menu,
  X,
  LogIn,
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type {
  BookingRecord,
  BookingStatus,
  LanguageCode,
  UserProfileRecord,
  VettedProvider,
} from '../../utils/marketplace';
import {
  BOOTSTRAP_ADMIN_EMAIL,
  type AdminAnalyticsSummary,
  type AdminAuditLog,
  type AdminReviewItem,
  type SystemSettingsRecord,
  type WithdrawalRecord,
  type WithdrawalStatus,
} from '../../utils/adminMetrics';
import type { Translations } from '../../i18n/translations';
import type { AdminToastMessage } from '../../hooks/useAdminData';
import { AdminOverviewSection } from './AdminOverviewSection';
import { AdminProvidersSection } from './AdminProvidersSection';
import { AdminBookingsSection } from './AdminBookingsSection';
import {
  AdminAuditSection,
  AdminReviewsSection,
  AdminSettingsSection,
  AdminUsersSection,
  AdminWithdrawalsSection,
} from './AdminUsersReviewsSection';

export type AdminSectionId =
  | 'overview'
  | 'providers'
  | 'bookings'
  | 'withdrawals'
  | 'users'
  | 'reviews'
  | 'settings'
  | 'audit';

interface AdminDashboardProps {
  lang: LanguageCode;
  t: Translations;
  onToggleLanguage: () => void;
  onExitAdmin: () => void;
  firebaseUser: User | null;
  isLiveAdmin: boolean;
  isLoadingAdmin: boolean;
  adminToast: AdminToastMessage | null;
  onGoogleSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  analytics: AdminAnalyticsSummary;
  providers: VettedProvider[];
  bookings: BookingRecord[];
  users: UserProfileRecord[];
  reviews: AdminReviewItem[];
  withdrawals: WithdrawalRecord[];
  systemSettings: SystemSettingsRecord;
  auditLogs: AdminAuditLog[];
  onToggleCinVerification: (provider: VettedProvider) => void;
  onToggleAvailability: (provider: VettedProvider) => void;
  onInspectProvider: (provider: VettedProvider) => void;
  onToggleUserVerified: (user: UserProfileRecord) => void;
  onReleaseEscrow: (booking: BookingRecord) => void;
  onRefundEscrow: (booking: BookingRecord) => void;
  onDisputeSplitEscrow: (booking: BookingRecord) => void;
  onOverrideBookingStatus: (booking: BookingRecord, nextStatus: BookingStatus) => void;
  onOpenChat: (booking: BookingRecord) => void;
  onDeleteReview: (review: AdminReviewItem) => void;
  onUpdateWithdrawalStatus: (
    withdrawal: WithdrawalRecord,
    nextStatus: WithdrawalStatus
  ) => void;
  onSaveSystemSettings: (patch: Partial<SystemSettingsRecord>) => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  lang,
  t,
  onToggleLanguage,
  onExitAdmin,
  firebaseUser,
  isLiveAdmin,
  isLoadingAdmin,
  adminToast,
  onGoogleSignIn,
  onSignOut,
  analytics,
  providers,
  bookings,
  users,
  reviews,
  withdrawals,
  systemSettings,
  auditLogs,
  onToggleCinVerification,
  onToggleAvailability,
  onInspectProvider,
  onToggleUserVerified,
  onReleaseEscrow,
  onRefundEscrow,
  onDisputeSplitEscrow,
  onOverrideBookingStatus,
  onOpenChat,
  onDeleteReview,
  onUpdateWithdrawalStatus,
  onSaveSystemSettings,
}) => {
  const isAr = lang === 'ar';
  const [activeSection, setActiveSection] = useState<AdminSectionId>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);

  const BackIcon = isAr ? ArrowRight : ArrowLeft;
  const pendingWithdrawalsCount = withdrawals.filter((w) => w.status === 'pending').length;

  const navItems: Array<{
    id: AdminSectionId;
    labelFr: string;
    labelAr: string;
    count?: number;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: 'overview',
      labelFr: 'Vue d’ensemble',
      labelAr: 'نظرة عامة',
      icon: LayoutDashboard,
    },
    {
      id: 'providers',
      labelFr: 'Vérification CIN & Maâlems',
      labelAr: 'التحقق من CIN والمعلمين',
      count: analytics.pendingCinCount > 0 ? analytics.pendingCinCount : undefined,
      icon: ShieldCheck,
    },
    {
      id: 'bookings',
      labelFr: 'Réservations & Séquestre CMI',
      labelAr: 'الحجوزات وضمان CMI',
      count: analytics.escrowHeldCount > 0 ? analytics.escrowHeldCount : undefined,
      icon: Briefcase,
    },
    {
      id: 'withdrawals',
      labelFr: 'Retraits & Virements RIB',
      labelAr: 'طلبات السحب والتحويلات',
      count: pendingWithdrawalsCount > 0 ? pendingWithdrawalsCount : withdrawals.length,
      icon: Landmark,
    },
    {
      id: 'users',
      labelFr: 'Annuaire Utilisateurs',
      labelAr: 'دليل المستخدمين',
      count: analytics.totalUsersCount,
      icon: Users,
    },
    {
      id: 'reviews',
      labelFr: 'Modération des Avis',
      labelAr: 'مراقبة التقييمات',
      count: reviews.length,
      icon: MessageSquareWarning,
    },
    {
      id: 'settings',
      labelFr: 'Paramètres Système',
      labelAr: 'إعدادات النظام',
      icon: Settings,
    },
    {
      id: 'audit',
      labelFr: 'Journal d’Audit',
      labelAr: 'سجل التدقيق',
      count: auditLogs.length,
      icon: History,
    },
  ];

  const activeNav = navItems.find((item) => item.id === activeSection) || navItems[0];
  const pendingProviders = providers.filter((p) => !p.verifiedBadge);
  const escrowBookings = bookings.filter(
    (b) =>
      b.paymentMethod === 'cmi_escrow' &&
      b.paymentStatus === 'escrow_held' &&
      b.status !== 'cancelled'
  );

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onExitAdmin}
          className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap truncate cursor-pointer"
        >
          {t.brandName}
        </button>
        <button
          type="button"
          onClick={() => setMobileNavOpen(false)}
          aria-label={t.closeBtn}
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav aria-label="Admin Navigation" className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveSection(item.id);
                setMobileNavOpen(false);
              }}
              aria-current={active ? 'page' : undefined}
              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-start ${
                active
                  ? 'bg-emerald-700 text-white'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-500'}`} />
                <span className="truncate">{isAr ? item.labelAr : item.labelFr}</span>
              </span>
              {typeof item.count === 'number' && (
                <span
                  className={`font-mono-tabular text-[11px] shrink-0 ${
                    active ? 'text-emerald-100' : 'text-slate-500'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Admin Session Footer inside Sidebar */}
      <div className="p-4 border-t border-slate-200 space-y-2.5 text-xs">
        <div className="space-y-0.5">
          <div className="font-semibold text-slate-900 truncate">
            {firebaseUser?.email || (isAr ? 'وضع المعاينة الإدارية' : 'Mode Aperçu Admin')}
          </div>
          <div className="text-[11px] text-slate-500">
            {isLiveAdmin
              ? isAr
                ? 'صلاحية Firestore مفعلة'
                : 'Firestore Admin actif'
              : isAr
              ? `الحساب المخول: ${BOOTSTRAP_ADMIN_EMAIL}`
              : `Admin autorisé : ${BOOTSTRAP_ADMIN_EMAIL}`}
          </div>
        </div>

        {firebaseUser ? (
          <button
            type="button"
            onClick={() => {
              void onSignOut();
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.signOutBtn}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              void onGoogleSignIn();
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{isAr ? 'دخول المشرف (Google)' : 'Connexion Admin Google'}</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex overflow-x-hidden">
      {/* Desktop Fixed 276px Sidebar */}
      <aside className="hidden lg:block w-[276px] shrink-0 bg-white border-e border-slate-200 sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-[270px] bg-white h-full border-e border-slate-200 shadow-xl">
            {renderSidebarContent()}
          </div>
          <button
            type="button"
            aria-label={t.closeBtn}
            onClick={() => setMobileNavOpen(false)}
            className="flex-1 bg-slate-900/50 cursor-pointer"
          />
        </div>
      )}

      {/* Main Admin Workspace Viewport */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Breadcrumb Bar (SaaS Top Bar Contract: Breadcrumb Left, 2 Actions Right) */}
        <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label={isAr ? 'فتح قائمة الإدارة' : 'Ouvrir le menu admin'}
              className="lg:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
              <span className="text-slate-500 whitespace-nowrap hidden md:inline">
                {t.brandName}
              </span>
              <span className="text-slate-300 hidden md:inline" aria-hidden="true">
                /
              </span>
              <span className="text-slate-500 whitespace-nowrap hidden sm:inline">
                {isAr ? 'الإدارة' : 'Administration'}
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="font-bold text-slate-900 truncate text-sm">
                {isAr ? activeNav.labelAr : activeNav.labelFr}
              </h1>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onToggleLanguage}
              aria-label={`Switch language to ${t.langSwitchLabel}`}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{t.langSwitchLabel}</span>
            </button>

            <button
              type="button"
              onClick={onExitAdmin}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <BackIcon className="w-3.5 h-3.5" />
              <span className="sm:hidden">{isAr ? 'المنصة' : 'Plateforme'}</span>
              <span className="hidden sm:inline">
                {isAr ? 'العودة للمنصة' : 'Retour Marketplace'}
              </span>
            </button>
          </div>
        </header>

        {/* Main Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1320px] w-full mx-auto space-y-6">
          {/* Access Mode Notice & Action Feedback */}
          {!isLiveAdmin && (
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 lg:gap-4 text-xs">
              <div className="text-slate-700">
                <span className="font-bold text-slate-900">
                  {isAr ? 'وضع المعاينة الإدارية المحلية' : 'Mode Aperçu Administration'}
                </span>
                <span className="mx-1.5 text-slate-400">·</span>
                <span>
                  {firebaseUser && firebaseUser.email !== BOOTSTRAP_ADMIN_EMAIL
                    ? isAr
                      ? `الحساب الحالي (${firebaseUser.email}) لا يملك صلاحيات المشرف على Firestore.`
                      : `Le compte connecté (${firebaseUser.email}) n’a pas le rôle administrateur Firestore.`
                    : isAr
                    ? `جميع العمليات قابلة للتجربة فوراً. سجّل الدخول بحساب ${BOOTSTRAP_ADMIN_EMAIL} لمزامنة Firestore المباشرة.`
                    : `Toutes les opérations sont testables immédiatement. Connectez-vous avec ${BOOTSTRAP_ADMIN_EMAIL} pour synchroniser en direct sur Firestore.`}
                </span>
              </div>
              {!firebaseUser && (
                <button
                  type="button"
                  onClick={() => {
                    void onGoogleSignIn();
                  }}
                  className="text-emerald-700 font-semibold hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isAr ? 'تفعيل المزامنة المباشرة' : 'Activer sync Firestore'}
                </button>
              )}
            </div>
          )}

          {adminToast && (
            <div
              role="status"
              className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-2 text-xs font-semibold text-emerald-900"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{isAr ? adminToast.ar : adminToast.fr}</span>
            </div>
          )}

          {isLoadingAdmin && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 animate-pulse">
              <div className="h-4 w-48 bg-slate-200 rounded" />
              <div className="h-10 w-full bg-slate-100 rounded" />
              <div className="h-10 w-full bg-slate-100 rounded" />
            </div>
          )}

          {activeSection === 'overview' && (
            <AdminOverviewSection
              lang={lang}
              t={t}
              analytics={analytics}
              pendingProviders={pendingProviders}
              escrowBookings={escrowBookings}
              onApproveCin={onToggleCinVerification}
              onReleaseEscrow={onReleaseEscrow}
              onNavigateSection={(sec) => setActiveSection(sec)}
            />
          )}

          {activeSection === 'providers' && (
            <AdminProvidersSection
              lang={lang}
              t={t}
              providers={providers}
              onToggleCinVerification={onToggleCinVerification}
              onToggleAvailability={onToggleAvailability}
              onInspectProvider={onInspectProvider}
            />
          )}

          {activeSection === 'bookings' && (
            <AdminBookingsSection
              lang={lang}
              t={t}
              bookings={bookings}
              platformFeePct={systemSettings.platformFeePct}
              onReleaseEscrow={onReleaseEscrow}
              onRefundEscrow={onRefundEscrow}
              onDisputeSplitEscrow={onDisputeSplitEscrow}
              onOverrideStatus={onOverrideBookingStatus}
              onOpenChat={onOpenChat}
            />
          )}

          {activeSection === 'withdrawals' && (
            <AdminWithdrawalsSection
              lang={lang}
              t={t}
              withdrawals={withdrawals}
              onUpdateWithdrawalStatus={onUpdateWithdrawalStatus}
            />
          )}

          {activeSection === 'users' && (
            <AdminUsersSection
              lang={lang}
              t={t}
              users={users}
              onToggleUserVerified={onToggleUserVerified}
            />
          )}

          {activeSection === 'reviews' && (
            <AdminReviewsSection
              lang={lang}
              t={t}
              reviews={reviews}
              onDeleteReview={onDeleteReview}
            />
          )}

          {activeSection === 'settings' && (
            <AdminSettingsSection
              lang={lang}
              settings={systemSettings}
              onSaveSettings={onSaveSystemSettings}
            />
          )}

          {activeSection === 'audit' && (
            <AdminAuditSection lang={lang} logs={auditLogs} />
          )}
        </main>
      </div>
    </div>
  );
};
