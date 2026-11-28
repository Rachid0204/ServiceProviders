import { uiText } from '../../i18n/uiCopy';
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  FileCheck,
  Scale,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type {
  BookingRecord,
  BookingStatus,
  DisputeRecord,
  DisputeStatus,
  LanguageCode,
  ProviderKycDocumentRecord,
  UserProfileRecord,
  VettedProvider,
} from '../../utils/marketplace';
import {
  type AdminAnalyticsSummary,
  type AdminAuditLog,
  type AdminModerationReportItem,
  type AdminReviewItem,
  type SystemSettingsRecord,
  type WithdrawalRecord,
  type WithdrawalStatus,
} from '../../utils/adminMetrics';
import type { Translations } from '../../i18n/translations';
import type { AdminToastMessage } from '../../hooks/useAdminData';
import { mapFirebaseAuthError } from '../../utils/authHelpers';
import {
  getAdminSectionFromPathname,
  getPathForAdminSection,
  type AdminRouteSectionId,
} from '../../app/routePaths';
import { AdminOverviewSection } from './AdminOverviewSection';
import { AdminProvidersSection } from './AdminProvidersSection';
import { AdminBookingsSection } from './AdminBookingsSection';
import { AdminKycReviewSection } from './AdminKycReviewSection';
import { AdminDisputesModerationSection } from './AdminDisputesModerationSection';
import {
  AdminAuditSection,
  AdminReviewsSection,
  AdminSettingsSection,
  AdminUsersSection,
  AdminWithdrawalsSection,
} from './AdminUsersReviewsSection';

export type AdminSectionId = AdminRouteSectionId;

interface AdminDashboardProps {
  lang: LanguageCode;
  t: Translations;
  onToggleLanguage: () => void;
  onExitAdmin: () => void;
  firebaseUser: User | null;
  authReady: boolean;
  isLiveAdmin: boolean;
  isCheckingAdmin: boolean;
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
  kycDocuments: ProviderKycDocumentRecord[];
  disputes: DisputeRecord[];
  moderationReports: AdminModerationReportItem[];
  systemSettings: SystemSettingsRecord;
  auditLogs: AdminAuditLog[];
  onToggleCinVerification: (provider: VettedProvider) => void;
  onToggleAvailability: (provider: VettedProvider) => void;
  onInspectProvider: (provider: VettedProvider) => void;
  onToggleUserVerified: (user: UserProfileRecord) => void;
  onToggleUserSuspension: (user: UserProfileRecord) => void;
  onLogKycDocumentViewed: (record: ProviderKycDocumentRecord, docLabel: string) => Promise<void>;
  onReviewProviderKyc: (
    record: ProviderKycDocumentRecord,
    nextStatus: 'under_review' | 'verified' | 'rejected' | 'resubmission_required',
    rejectionReason?: string
  ) => Promise<void>;
  onUpdateDispute: (
    dispute: DisputeRecord,
    nextStatus: DisputeStatus,
    resolutionSummary: string
  ) => Promise<void>;
  onModerateReport: (
    report: AdminModerationReportItem,
    nextStatus: 'reviewed' | 'resolved' | 'dismissed'
  ) => Promise<void>;
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
  authReady,
  isLiveAdmin,
  isCheckingAdmin,
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
  kycDocuments,
  disputes,
  moderationReports,
  systemSettings,
  auditLogs,
  onToggleCinVerification,
  onToggleAvailability,
  onInspectProvider,
  onToggleUserVerified,
  onToggleUserSuspension,
  onLogKycDocumentViewed,
  onReviewProviderKyc,
  onUpdateDispute,
  onModerateReport,
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
  const location = useLocation();
  const navigate = useNavigate();
  const activeSection: AdminSectionId = getAdminSectionFromPathname(location.pathname);
  const setActiveSection = (next: AdminSectionId) => {
    navigate(getPathForAdminSection(next));
  };
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  const BackIcon = isAr ? ArrowRight : ArrowLeft;
  const pendingWithdrawalsCount = withdrawals.filter((w) => w.status === 'pending').length;
  const pendingKycDocsCount = kycDocuments.filter(
    (d) => d.status === 'submitted' || d.status === 'under_review'
  ).length;
  const openDisputesAndReportsCount =
    disputes.filter((d) => d.status !== 'resolved' && d.status !== 'closed').length +
    moderationReports.filter((r) => r.status === 'open').length;

  const handleAdminSignIn = async () => {
    setAdminAuthError(null);
    setIsAuthenticating(true);
    try {
      await onGoogleSignIn();
    } catch (err) {
      setAdminAuthError(mapFirebaseAuthError(err, lang));
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleAdminSignOut = async () => {
    setAdminAuthError(null);
    setIsAuthenticating(true);
    try {
      await onSignOut();
    } catch (err) {
      setAdminAuthError(mapFirebaseAuthError(err, lang));
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Prevent flashing "Access Denied" while Firebase Auth or admin RBAC check is in flight
  if (!authReady || isCheckingAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-sm text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-medium text-slate-600">
            {uiText(isAr).admin.verificationDesPrivilegesAdministrateur}
          </p>
        </div>
      </div>
    );
  }

  // Strict RBAC Gate: Do not render Admin console or operational data to unauthenticated or non-admin users
  if (!isLiveAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-sm space-y-5 text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-bold text-slate-900">
              {uiText(isAr).admin.accesAdministrationRestreint}
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              {firebaseUser
                ? uiText(isAr).admin.leCompteActuellementConnecteNeDispose
                : uiText(isAr).admin.veuillezVousConnecterAvecUnCompte}
            </p>
          </div>
          {adminAuthError && (
            <div
              role="alert"
              className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 text-start"
            >
              {adminAuthError}
            </div>
          )}
          <div className="flex flex-col gap-2.5 pt-1">
            {firebaseUser ? (
              <button
                type="button"
                disabled={isAuthenticating}
                onClick={() => {
                  void handleAdminSignOut();
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{t.signOutBtn}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isAuthenticating}
                onClick={() => {
                  void handleAdminSignIn();
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{uiText(isAr).admin.connexionAdministrateurGoogle}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onExitAdmin}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
            >
              <BackIcon className="w-4 h-4" />
              <span>{uiText(isAr).admin.retourMarketplace}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  type AdminNavItem = {
    id: AdminSectionId;
    labelFr: string;
    labelAr: string;
    count?: number;
    icon: React.ComponentType<{ className?: string }>;
  };

  const navGroups: Array<{
    groupId: string;
    titleFr: string;
    titleAr: string;
    items: AdminNavItem[];
  }> = [
    {
      groupId: 'pilotage',
      titleFr: 'Pilotage',
      titleAr: 'القيادة والمؤشرات',
      items: [
        {
          id: 'overview',
          labelFr: 'Vue d’ensemble',
          labelAr: 'نظرة عامة',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      groupId: 'trust',
      titleFr: 'Confiance & Conformité',
      titleAr: 'الثقة والمطابقة',
      items: [
        {
          id: 'kyc',
          labelFr: 'Dossiers KYC (CNDP)',
          labelAr: 'ملفات KYC (CNDP)',
          count: pendingKycDocsCount > 0 ? pendingKycDocsCount : kycDocuments.length,
          icon: FileCheck,
        },
        {
          id: 'providers',
          labelFr: 'Annuaire Maâlems',
          labelAr: 'دليل المعلمين',
          count: analytics.pendingCinCount > 0 ? analytics.pendingCinCount : undefined,
          icon: ShieldCheck,
        },
        {
          id: 'reviews',
          labelFr: 'Modération Avis',
          labelAr: 'مراقبة التقييمات',
          count: reviews.length,
          icon: MessageSquareWarning,
        },
      ],
    },
    {
      groupId: 'operations',
      titleFr: 'Opérations & Finances',
      titleAr: 'العمليات والمالية',
      items: [
        {
          id: 'bookings',
          labelFr: 'Réservations & Paiements',
          labelAr: 'الحجوزات والمدفوعات',
          count: analytics.escrowHeldCount > 0 ? analytics.escrowHeldCount : undefined,
          icon: Briefcase,
        },
        {
          id: 'disputes',
          labelFr: 'Litiges & Signalements',
          labelAr: 'النزاعات والبلاغات',
          count:
            openDisputesAndReportsCount > 0
              ? openDisputesAndReportsCount
              : disputes.length + moderationReports.length,
          icon: Scale,
        },
        {
          id: 'withdrawals',
          labelFr: 'Retraits RIB',
          labelAr: 'طلبات السحب RIB',
          count: pendingWithdrawalsCount > 0 ? pendingWithdrawalsCount : withdrawals.length,
          icon: Landmark,
        },
      ],
    },
    {
      groupId: 'system',
      titleFr: 'Système',
      titleAr: 'النظام',
      items: [
        {
          id: 'users',
          labelFr: 'Utilisateurs',
          labelAr: 'المستخدمون',
          count: analytics.totalUsersCount,
          icon: Users,
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
      ],
    },
  ];

  const navItems: AdminNavItem[] = navGroups.flatMap((g) => g.items);

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
          className="lg:hidden inline-flex items-center justify-center min-w-[40px] min-h-[40px] text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav aria-label="Admin Navigation" className="flex-1 p-3 space-y-4 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.groupId} className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {isAr ? group.titleAr : group.titleFr}
            </div>
            {group.items.map((item) => {
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
                  className={`w-full min-h-[40px] flex items-center justify-between gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-start ${
                    active
                      ? 'bg-emerald-700 text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-500'}`}
                    />
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
          </div>
        ))}
      </nav>

      {/* Admin Session Footer inside Sidebar */}
      <div className="p-4 border-t border-slate-200 space-y-2.5 text-xs">
        <div className="space-y-0.5">
          <div className="font-semibold text-slate-900 truncate">
            {firebaseUser?.email}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium">
            {uiText(isAr).admin.firestoreAdminActif}
          </div>
        </div>

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
        {/* Top Breadcrumb Bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label={uiText(isAr).admin.ouvrirLeMenuAdmin}
              className="lg:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer shrink-0"
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
                {uiText(isAr).admin.administration}
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
              <span className="sm:hidden">{uiText(isAr).admin.plateforme}</span>
              <span className="hidden sm:inline">
                {uiText(isAr).admin.retourMarketplace2}
              </span>
            </button>
          </div>
        </header>

        {/* Main Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1320px] w-full mx-auto space-y-6">
          {adminToast && (
            <div
              role="status"
              className={`rounded-xl px-4 py-3 flex items-center gap-2 text-xs font-semibold border ${
                adminToast.variant === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <CheckCircle2
                className={`w-4 h-4 shrink-0 ${
                  adminToast.variant === 'error' ? 'text-rose-700' : 'text-emerald-700'
                }`}
              />
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

          {activeSection === 'kyc' && (
            <AdminKycReviewSection
              lang={lang}
              kycDocuments={kycDocuments}
              onLogDocumentViewed={onLogKycDocumentViewed}
              onReviewKyc={onReviewProviderKyc}
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

          {activeSection === 'disputes' && (
            <AdminDisputesModerationSection
              lang={lang}
              disputes={disputes}
              reports={moderationReports}
              onUpdateDispute={onUpdateDispute}
              onModerateReport={onModerateReport}
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
              onToggleUserSuspension={onToggleUserSuspension}
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
