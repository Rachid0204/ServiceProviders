import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ProviderDashboard,
  type ProviderTab,
} from '../../components/dashboards/ProviderDashboard';
import { useMarketplace } from '../../app/providers/MarketplaceContext';
import {
  buildMessageThreadPath,
  getPathForProviderTab,
  getProviderTabFromPathname,
} from '../../app/routePaths';

export const ProviderDashboardPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    lang,
    t,
    firebaseUser,
    userProfile,
    signupRoleIntent,
    ownProvider,
    systemSettings,
    bookingActionError,
    clearBookingActionError,
    bookings,
    openJobPosts,
    myProposalsByJobId,
    jobActionError,
    clearJobActionError,
    submitJobProposal,
    withdrawJobProposal,
    toggleProviderAvailability,
    saveFullProviderCard,
    setAuthModalIntent,
    setDetailBooking,
    setCancellingBooking,
    updateBookingStatus,
  } = useMarketplace();

  const activeTab = getProviderTabFromPathname(location.pathname);

  const handleChangeTab = (nextTab: ProviderTab) => {
    navigate(getPathForProviderTab(nextTab));
  };

  return (
    <ProviderDashboard
      lang={lang}
      t={t}
      firebaseUser={firebaseUser}
      userProfile={userProfile}
      signupRoleIntent={signupRoleIntent}
      ownProvider={ownProvider}
      systemSettings={systemSettings}
      activeTab={activeTab}
      onChangeTab={handleChangeTab}
      bookingActionError={bookingActionError}
      onDismissError={clearBookingActionError}
      bookings={bookings}
      openJobPosts={openJobPosts}
      myProposalsByJobId={myProposalsByJobId}
      jobActionError={jobActionError}
      onDismissJobError={clearJobActionError}
      onSubmitJobProposal={submitJobProposal}
      onWithdrawJobProposal={withdrawJobProposal}
      onToggleProviderAvailability={toggleProviderAvailability}
      onSaveFullProviderCard={saveFullProviderCard}
      onOpenAuth={() => setAuthModalIntent('provider')}
      onOpenChat={(b) => navigate(buildMessageThreadPath(b.id))}
      onOpenBookingDetail={setDetailBooking}
      onOpenCancel={setCancellingBooking}
      onUpdateBookingStatus={updateBookingStatus}
    />
  );
};
