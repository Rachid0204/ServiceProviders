import React, { useState, lazy, Suspense } from 'react';
import type { User } from 'firebase/auth';
import type { Translations } from '../../i18n/translations';
import type {
  BookingRecord,
  ChatMessageRecord,
  LanguageCode,
  VettedProvider,
} from '../../utils/marketplace';
import type { SystemSettingsRecord } from '../../utils/systemSettings';
import type { ProviderOverride } from '../../hooks/useProviders';
import type { AdminBookingPatch } from '../../hooks/useBookings';
import { useAdminData } from '../../hooks/useAdminData';
import { useAdminModeration } from '../../hooks/useAdminModeration';
import { AdminDashboard } from './AdminDashboard';

const ProviderDetailModal = lazy(() =>
  import('../ProviderDetailModal').then((m) => ({ default: m.ProviderDetailModal }))
);
const ChatDrawerModal = lazy(() =>
  import('../ChatDrawerModal').then((m) => ({ default: m.ChatDrawerModal }))
);

interface AdminRouteProps {
  lang: LanguageCode;
  t: Translations;
  onToggleLanguage: () => void;
  onExitAdmin: () => void;
  onBookFromAdmin: (provider: VettedProvider) => void;
  firebaseUser: User | null;
  authReady: boolean;
  onGoogleSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  allProviders: VettedProvider[];
  firestoreProviders: VettedProvider[];
  bookings: BookingRecord[];
  chatThreads: Record<string, ChatMessageRecord[]>;
  systemSettings: SystemSettingsRecord;
  onUpdateLocalSettings: (next: SystemSettingsRecord) => void;
  onApplyProviderOverride: (providerId: string, patch: ProviderOverride) => void;
  onRemoveProviderReview: (
    providerId: string,
    reviewId: string,
    nextRating?: { ratingAvg: number; reviewCount: number }
  ) => void;
  onApplyBookingPatch: (bookingId: string, patch: AdminBookingPatch) => void;
  onSendLocalChatMessage: (msg: ChatMessageRecord) => void;
}

/**
 * Lazy-loaded Admin route wrapper containing `useAdminData` and `AdminDashboard`
 * so the Admin chunk is never downloaded or preloaded on the public marketplace (`/`).
 */
export const AdminRoute: React.FC<AdminRouteProps> = ({
  lang,
  t,
  onToggleLanguage,
  onExitAdmin,
  onBookFromAdmin,
  firebaseUser,
  authReady,
  onGoogleSignIn,
  onSignOut,
  allProviders,
  firestoreProviders,
  bookings,
  chatThreads,
  systemSettings,
  onUpdateLocalSettings,
  onApplyProviderOverride,
  onRemoveProviderReview,
  onApplyBookingPatch,
  onSendLocalChatMessage,
}) => {
  const [detailProvider, setDetailProvider] = useState<VettedProvider | null>(null);
  const [activeChatBooking, setActiveChatBooking] = useState<BookingRecord | null>(null);

  const {
    isLiveAdmin,
    isCheckingAdmin,
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
    enabled: true,
    firebaseUser,
    authReady,
    allProviders,
    firestoreProviders,
    bookings,
    systemSettings,
    onUpdateLocalSettings,
    onApplyProviderOverride,
    onRemoveProviderReview,
    onApplyBookingPatch,
  });

  const {
    kycDocuments,
    adminDisputes,
    moderationReports,
    moderationToast,
    logKycDocumentViewed,
    reviewProviderKyc,
    updateAdminDispute,
    moderateReport,
    toggleUserAccountSuspension,
  } = useAdminModeration({
    isLiveAdmin,
    firebaseUser,
  });

  const syncedDetailProvider = detailProvider
    ? adminProviders.find((p) => p.id === detailProvider.id) ??
      allProviders.find((p) => p.id === detailProvider.id) ??
      detailProvider
    : null;

  return (
    <>
      <AdminDashboard
        lang={lang}
        t={t}
        onToggleLanguage={onToggleLanguage}
        onExitAdmin={onExitAdmin}
        firebaseUser={firebaseUser}
        authReady={authReady}
        isLiveAdmin={isLiveAdmin}
        isCheckingAdmin={isCheckingAdmin}
        isLoadingAdmin={isLoadingAdmin}
        adminToast={moderationToast || adminToast}
        onGoogleSignIn={onGoogleSignIn}
        onSignOut={onSignOut}
        analytics={analytics}
        providers={adminProviders}
        bookings={adminBookings}
        users={adminUsers}
        reviews={adminReviews}
        withdrawals={withdrawals}
        kycDocuments={kycDocuments}
        disputes={adminDisputes}
        moderationReports={moderationReports}
        systemSettings={systemSettings}
        auditLogs={auditLogs}
        onToggleCinVerification={toggleProviderCinVerification}
        onToggleAvailability={adminToggleProviderAvailability}
        onInspectProvider={setDetailProvider}
        onToggleUserVerified={toggleUserVerifiedBadge}
        onToggleUserSuspension={toggleUserAccountSuspension}
        onLogKycDocumentViewed={logKycDocumentViewed}
        onReviewProviderKyc={reviewProviderKyc}
        onUpdateDispute={updateAdminDispute}
        onModerateReport={moderateReport}
        onReleaseEscrow={releaseCmiEscrow}
        onRefundEscrow={refundCmiEscrow}
        onDisputeSplitEscrow={disputeSplitEscrow}
        onOverrideBookingStatus={overrideBookingStatus}
        onOpenChat={setActiveChatBooking}
        onDeleteReview={deleteModeratedReview}
        onUpdateWithdrawalStatus={updateWithdrawalStatus}
        onSaveSystemSettings={saveSystemSettings}
      />

      <Suspense fallback={null}>
        {syncedDetailProvider && (
          <ProviderDetailModal
            provider={syncedDetailProvider}
            lang={lang}
            t={t}
            onClose={() => setDetailProvider(null)}
            onBookProvider={(p) => {
              setDetailProvider(null);
              onBookFromAdmin(p);
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
            onSendLocalMessage={onSendLocalChatMessage}
            onClose={() => setActiveChatBooking(null)}
          />
        )}
      </Suspense>
    </>
  );
};
