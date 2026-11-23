import { uiText, interpolateCopy } from '../../i18n/uiCopy';
import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Briefcase,
  Calendar,
  Clock,
  IdCard,
  ShieldCheck,
  Wallet,
  Wrench,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  DEFAULT_CATEGORY_IMAGE,
  computeProviderEarningsBreakdown,
  formatMadCurrency,
  type BookingRecord,
  type BookingStatus,
  type JobPostRecord,
  type JobProposalRecord,
  type LanguageCode,
  type UserProfileRecord,
  type UserRole,
  type VettedProvider,
} from '../../utils/marketplace';
import type { Translations } from '../../i18n/translations';
import type { SystemSettingsRecord } from '../../utils/adminMetrics';
import type { SaveFullProviderCardInput } from '../../hooks/useMarketplaceAuth';
import type { SubmitProposalPayload } from '../../hooks/useJobPosts';
import { useProviderCardStudio } from '../../hooks/useProviderCardStudio';
import { ProviderLeadsTab } from './ProviderLeadsTab';
import { ProviderMissionsTab } from './ProviderMissionsTab';
import { ProviderCardStudioTab } from './ProviderCardStudioTab';
import { ProviderEarningsTab } from './ProviderEarningsTab';
import { ProviderServicesManager } from './ProviderServicesManager';
import { ProviderVerificationPanel } from './ProviderVerificationPanel';
import { ProviderAvailabilityCalendar } from './ProviderAvailabilityCalendar';
import {
  ProviderUnauthenticatedGate,
  ProviderUpgradeClientGate,
} from './ProviderAccessGates';

export type ProviderTab =
  | 'jobs'
  | 'missions'
  | 'card'
  | 'services'
  | 'calendar'
  | 'verification'
  | 'earnings';

interface ProviderDashboardProps {
  lang: LanguageCode;
  t: Translations;
  firebaseUser: User | null;
  userProfile: UserProfileRecord | null;
  signupRoleIntent: UserRole | null;
  ownProvider: VettedProvider | null;
  systemSettings: SystemSettingsRecord;
  activeTab?: ProviderTab;
  onChangeTab?: (tab: ProviderTab) => void;
  bookingActionError: string | null;
  onDismissError: () => void;
  bookings: BookingRecord[];
  openJobPosts: JobPostRecord[];
  myProposalsByJobId: Record<string, JobProposalRecord>;
  jobActionError: string | null;
  onDismissJobError: () => void;
  onSubmitJobProposal: (job: JobPostRecord, payload: SubmitProposalPayload) => Promise<void>;
  onWithdrawJobProposal: (jobId: string) => Promise<void>;
  onToggleProviderAvailability: (provider: VettedProvider) => void;
  onSaveFullProviderCard: (input: SaveFullProviderCardInput) => Promise<void>;
  onOpenAuth: () => void;
  onOpenChat: (booking: BookingRecord) => void;
  onOpenBookingDetail: (booking: BookingRecord) => void;
  onOpenCancel: (booking: BookingRecord) => void;
  onUpdateBookingStatus: (
    bookingId: string,
    nextStatus: BookingStatus,
    actorRole: UserRole
  ) => void;
}

export const ProviderDashboard: React.FC<ProviderDashboardProps> = ({
  lang,
  t,
  firebaseUser,
  userProfile,
  signupRoleIntent,
  ownProvider,
  systemSettings,
  activeTab: controlledTab,
  onChangeTab,
  bookingActionError,
  onDismissError,
  bookings,
  openJobPosts,
  myProposalsByJobId,
  jobActionError,
  onDismissJobError,
  onSubmitJobProposal,
  onWithdrawJobProposal,
  onToggleProviderAvailability,
  onSaveFullProviderCard,
  onOpenAuth,
  onOpenChat,
  onOpenBookingDetail,
  onOpenCancel,
  onUpdateBookingStatus,
}) => {
  const isAr = lang === 'ar';
  const [internalTab, setInternalTab] = useState<ProviderTab>(ownProvider ? 'jobs' : 'card');
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = (next: ProviderTab) => {
    setInternalTab(next);
    onChangeTab?.(next);
  };

  const [upgradingFromClient, setUpgradingFromClient] = useState(false);

  const studio = useProviderCardStudio({
    lang,
    t,
    firebaseUser,
    userProfile,
    signupRoleIntent,
    ownProvider,
    onSaveFullProviderCard,
    onPublished: () => setUpgradingFromClient(false),
  });

  const providerBookings = useMemo(() => {
    if (!firebaseUser) return [];
    return bookings.filter((b) => b.providerId === firebaseUser.uid);
  }, [firebaseUser, bookings]);

  const metrics = useMemo(() => {
    let pendingCount = 0;
    let activeCount = 0;
    let completedCount = 0;

    for (const b of providerBookings) {
      if (b.status === 'pending') pendingCount++;
      if (b.status === 'accepted' || b.status === 'in_progress') activeCount++;
      if (b.status === 'completed' || b.status === 'reviewed') completedCount++;
    }

    const earnings = computeProviderEarningsBreakdown({
      bookings: providerBookings,
      withdrawals: [],
      platformFeePct: systemSettings.platformFeePct,
      minWithdrawalMad: systemSettings.minWithdrawalMad,
      cmiEscrowEnabled: false,
    });

    return {
      pendingCount,
      activeCount,
      completedCount,
      cashCollectedDirectlyMad: earnings.cashCollectedDirectlyMad,
    };
  }, [providerBookings, systemSettings.platformFeePct, systemSettings.minWithdrawalMad]);

  if (!firebaseUser) {
    return <ProviderUnauthenticatedGate isAr={isAr} onOpenAuth={onOpenAuth} />;
  }

  const isExistingClientOnly =
    userProfile?.role === 'client' && !ownProvider && !upgradingFromClient;

  if (isExistingClientOnly) {
    return (
      <ProviderUpgradeClientGate
        isAr={isAr}
        onActivateProvider={() => {
          setUpgradingFromClient(true);
          setActiveTab('card');
        }}
      />
    );
  }

  const effectiveTab: ProviderTab =
    !ownProvider &&
    activeTab !== 'services' &&
    activeTab !== 'calendar' &&
    activeTab !== 'verification'
      ? 'card'
      : activeTab;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 lg:py-9 space-y-6">
      {/* Compact Maâlem Workspace Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-start gap-4">
          <img
            src={
              ownProvider?.portfolioImages[0] ||
              studio.cardPhotos[0] ||
              DEFAULT_CATEGORY_IMAGE[studio.cardCategory]
            }
            alt={studio.cardFullName || 'Maâlem'}
            className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                {ownProvider
                  ? isAr
                    ? ownProvider.fullNameAr
                    : ownProvider.fullNameFr
                  : uiText(isAr).provider.configurationDeVotreFicheMaalem}
              </h1>
              {ownProvider?.verifiedBadge ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{t.verifiedCinLabel}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {ownProvider
                      ? uiText(isAr).provider.cinEnCoursDeVerification
                      : uiText(isAr).provider.completezVotreFichePourCommencer}
                  </span>
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-700 tabular-nums">
                {interpolateCopy(uiText(isAr).provider.ficheA, { v0: studio.completeness.percent })}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {ownProvider ? (
                <>
                  {t.categories[ownProvider.category]} · {t.cities[ownProvider.location.city]} (
                  {ownProvider.location.quartier}) ·{' '}
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {formatMadCurrency(ownProvider.hourlyRateMAD, lang)}/h
                  </span>
                </>
              ) : isAr ? (
                'أكمل معلوماتك (الاسم، المدينة، الخبرة، والصورة) لتظهر بطاقتك للزبناء وتبدأ بتقديم العروض.'
              ) : (
                'Renseignez votre nom, localisation, expérience et photo pour publier votre carte et répondre aux offres clients.'
              )}
            </p>
          </div>
        </div>

        {ownProvider && (
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2">
              <span className="text-xs font-medium text-slate-700">
                {t.providerAvailabilityLabel}:
              </span>
              <button
                type="button"
                onClick={() => onToggleProviderAvailability(ownProvider)}
                aria-pressed={ownProvider.isAvailableNow}
                className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  ownProvider.isAvailableNow
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                {ownProvider.isAvailableNow ? t.availableNowText : t.busyScheduledText}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Maâlem Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Maâlem Dashboard Tabs"
        className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3"
      >
        {(
          [
            {
              id: 'jobs' as const,
              icon: Briefcase,
              disabled: !ownProvider,
              badge: openJobPosts.filter((j) => j.clientId !== firebaseUser.uid).length,
              labelFr: 'Offres Clients',
              labelAr: 'طلبات الزبناء المنشورة',
            },
            {
              id: 'missions' as const,
              icon: Clock,
              disabled: !ownProvider,
              badge: metrics.pendingCount,
              labelFr: `Mes Missions (${providerBookings.length})`,
              labelAr: `مهامي (${providerBookings.length})`,
            },
            {
              id: 'card' as const,
              icon: IdCard,
              disabled: false,
              badge: studio.completeness.percent < 100 ? 1 : 0,
              labelFr: 'Ma Fiche Maâlem',
              labelAr: 'بطاقتي المهنية',
            },
            {
              id: 'services' as const,
              icon: Wrench,
              disabled: false,
              badge: 0,
              labelFr: 'Mes Services',
              labelAr: 'خدماتي',
            },
            {
              id: 'calendar' as const,
              icon: Calendar,
              disabled: false,
              badge: 0,
              labelFr: 'Mon Agenda',
              labelAr: 'جدول المواعيد',
            },
            {
              id: 'verification' as const,
              icon: ShieldCheck,
              disabled: false,
              badge: ownProvider?.verifiedBadge ? 0 : 1,
              labelFr: 'Vérification CIN',
              labelAr: 'توثيق البطاقة الوطنية',
            },
            {
              id: 'earnings' as const,
              icon: Wallet,
              disabled: !ownProvider,
              badge: 0,
              labelFr: 'Revenus & Retraits',
              labelAr: 'الأرباح والسحب',
            },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = effectiveTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              disabled={tab.disabled}
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
                tab.disabled
                  ? 'opacity-45 cursor-not-allowed bg-slate-100 text-slate-500'
                  : active
                  ? 'bg-emerald-700 text-white shadow-2xs cursor-pointer'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{isAr ? tab.labelAr : tab.labelFr}</span>
              {tab.id === 'jobs' && tab.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full tabular-nums ${
                    active ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
              {tab.id === 'missions' && tab.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full tabular-nums ${
                    active ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Errors */}
      {(bookingActionError || jobActionError) && (
        <div
          role="alert"
          className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-900"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
            <span>{bookingActionError || jobActionError}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onDismissError();
              onDismissJobError();
            }}
            className="text-rose-700 font-semibold hover:underline cursor-pointer shrink-0"
          >
            {t.closeBtn}
          </button>
        </div>
      )}

      {effectiveTab === 'jobs' && ownProvider && (
        <ProviderLeadsTab
          lang={lang}
          t={t}
          currentUid={firebaseUser.uid}
          ownProvider={ownProvider}
          openJobPosts={openJobPosts}
          myProposalsByJobId={myProposalsByJobId}
          onSubmitJobProposal={onSubmitJobProposal}
          onWithdrawJobProposal={onWithdrawJobProposal}
        />
      )}

      {effectiveTab === 'missions' && ownProvider && (
        <ProviderMissionsTab
          lang={lang}
          t={t}
          ownProvider={ownProvider}
          providerBookings={providerBookings}
          pendingCount={metrics.pendingCount}
          activeCount={metrics.activeCount}
          completedCount={metrics.completedCount}
          cashCollectedDirectlyMad={metrics.cashCollectedDirectlyMad}
          onGoToJobs={() => setActiveTab('jobs')}
          onOpenBookingDetail={onOpenBookingDetail}
          onOpenChat={onOpenChat}
          onOpenCancel={onOpenCancel}
          onUpdateBookingStatus={onUpdateBookingStatus}
        />
      )}

      {effectiveTab === 'card' && (
        <ProviderCardStudioTab lang={lang} t={t} ownProvider={ownProvider} studio={studio} />
      )}

      {effectiveTab === 'earnings' && ownProvider && (
        <ProviderEarningsTab
          lang={lang}
          firebaseUser={firebaseUser}
          ownProvider={ownProvider}
          providerBookings={providerBookings}
          systemSettings={systemSettings}
        />
      )}

      {effectiveTab === 'services' && (
        <ProviderServicesManager
          providerId={firebaseUser.uid}
          defaultCategory={ownProvider?.category || 'Plomberie'}
          hasProviderProfile={Boolean(ownProvider)}
          lang={lang}
          t={t}
          onGoToCardSetup={() => setActiveTab('card')}
        />
      )}

      {effectiveTab === 'calendar' && (
        <ProviderAvailabilityCalendar uid={firebaseUser.uid} lang={lang} t={t} />
      )}

      {effectiveTab === 'verification' && (
        <ProviderVerificationPanel
          uid={firebaseUser.uid}
          isVerifiedBadge={Boolean(ownProvider?.verifiedBadge || userProfile?.verifiedBadge)}
          lang={lang}
        />
      )}
    </div>
  );
};
