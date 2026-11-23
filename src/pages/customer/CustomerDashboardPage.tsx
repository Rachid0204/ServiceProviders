import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ClientDashboard } from '../../components/dashboards/ClientDashboard';
import { useMarketplace } from '../../app/providers/MarketplaceContext';
import { ROUTE_PATHS, buildMessageThreadPath } from '../../app/routePaths';

export const CustomerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    lang,
    t,
    firebaseUser,
    userProfile,
    systemSettings,
    bookingActionError,
    clearBookingActionError,
    bookings,
    myClientJobPosts,
    jobActionError,
    clearJobActionError,
    setIsPostJobModalOpen,
    cancelJobPost,
    rejectJobProposal,
    acceptProposalAndCreateBooking,
    handleSaveProfile,
    setAuthModalIntent,
    setDetailBooking,
    setReschedulingBooking,
    setCancellingBooking,
    clientConfirmAndReleaseEscrow,
    setReviewingBooking,
  } = useMarketplace();

  return (
    <ClientDashboard
      lang={lang}
      t={t}
      firebaseUser={firebaseUser}
      userProfile={userProfile}
      platformFeePct={systemSettings.platformFeePct}
      bookingActionError={bookingActionError}
      onDismissError={clearBookingActionError}
      bookings={bookings}
      myClientJobPosts={myClientJobPosts}
      jobActionError={jobActionError}
      onDismissJobError={clearJobActionError}
      onOpenPostJob={() => setIsPostJobModalOpen(true)}
      onCancelJobPost={cancelJobPost}
      onRejectProposal={rejectJobProposal}
      onAcceptProposal={acceptProposalAndCreateBooking}
      onQuickSaveClientProfile={handleSaveProfile}
      onExploreProviders={() => navigate(ROUTE_PATHS.SERVICES)}
      onOpenAuth={() => setAuthModalIntent('client')}
      onOpenChat={(b) => navigate(buildMessageThreadPath(b.id))}
      onOpenBookingDetail={setDetailBooking}
      onOpenReschedule={setReschedulingBooking}
      onOpenCancel={setCancellingBooking}
      onConfirmAndReleaseEscrow={(id) => {
        void clientConfirmAndReleaseEscrow(id);
      }}
      onOpenReview={setReviewingBooking}
    />
  );
};
