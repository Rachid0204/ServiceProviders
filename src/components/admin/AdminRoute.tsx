import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from 'firebase/auth';
import type { Translations } from '../../i18n/translations';
import type {
  BookingRecord,
  LanguageCode,
  VettedProvider,
} from '../../utils/marketplace';
import type { SystemSettingsRecord } from '../../utils/systemSettings';
import type { ProviderOverride } from '../../hooks/useProviders';
import type { AdminBookingPatch } from '../../hooks/useBookings';
import { useAdminData } from '../../hooks/useAdminData';
import { useAdminModeration } from '../../hooks/useAdminModeration';
import { buildMessageThreadPath, buildProviderDetailPath } from '../../app/routePaths';
import { AdminDashboard } from './AdminDashboard';

interface AdminRouteProps {
  lang: LanguageCode;
  t: Translations;
  onToggleLanguage: () => void;
  onExitAdmin: () => void;
  firebaseUser: User | null;
  authReady: boolean;
  onGoogleSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  allProviders: VettedProvider[];
  firestoreProviders: VettedProvider[];
  bookings: BookingRecord[];
  systemSettings: SystemSettingsRecord;
  onUpdateLocalSettings: (next: SystemSettingsRecord) => void;
  onApplyProviderOverride: (providerId: string, patch: ProviderOverride) => void;
  onRemoveProviderReview: (
    providerId: string,
    reviewId: string,
    nextRating?: { ratingAvg: number; reviewCount: number }
  ) => void;
  onApplyBookingPatch: (bookingId: string, patch: AdminBookingPatch) => void;
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
  firebaseUser,
  authReady,
  onGoogleSignIn,
  onSignOut,
  allProviders,
  firestoreProviders,
  bookings,
  systemSettings,
  onUpdateLocalSettings,
  onApplyProviderOverride,
  onRemoveProviderReview,
  onApplyBookingPatch,
}) => {
  const navigate = useNavigate();

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

  return (
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
      onInspectProvider={(p) => navigate(buildProviderDetailPath(p.id))}
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
      onOpenChat={(b) => navigate(buildMessageThreadPath(b.id))}
      onDeleteReview={deleteModeratedReview}
      onUpdateWithdrawalStatus={updateWithdrawalStatus}
      onSaveSystemSettings={saveSystemSettings}
    />
  );
};
