import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminRoute } from '../../components/admin/AdminRoute';
import { useMarketplace } from '../../app/providers/MarketplaceContext';
import { ROUTE_PATHS } from '../../app/routePaths';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    lang,
    t,
    toggleLanguage,
    isPureProvider,
    setBookingProvider,
    firebaseUser,
    authReady,
    signInWithGoogle,
    signOutUser,
    allProviders,
    firestoreProviders,
    bookings,
    chatThreads,
    systemSettings,
    updateLocalSettings,
    applyAdminProviderOverride,
    removeProviderReview,
    applyAdminBookingPatch,
    sendLocalChatMessage,
  } = useMarketplace();

  return (
    <AdminRoute
      lang={lang}
      t={t}
      onToggleLanguage={toggleLanguage}
      onExitAdmin={() =>
        navigate(isPureProvider ? ROUTE_PATHS.PROVIDER_DASHBOARD : ROUTE_PATHS.HOME)
      }
      onBookFromAdmin={(p) => {
        navigate(ROUTE_PATHS.HOME);
        setBookingProvider(p);
      }}
      firebaseUser={firebaseUser}
      authReady={authReady}
      onGoogleSignIn={async () => {
        await signInWithGoogle();
      }}
      onSignOut={async () => {
        await signOutUser();
        navigate(ROUTE_PATHS.HOME, { replace: true });
      }}
      allProviders={allProviders}
      firestoreProviders={firestoreProviders}
      bookings={bookings}
      chatThreads={chatThreads}
      systemSettings={systemSettings}
      onUpdateLocalSettings={updateLocalSettings}
      onApplyProviderOverride={applyAdminProviderOverride}
      onRemoveProviderReview={removeProviderReview}
      onApplyBookingPatch={applyAdminBookingPatch}
      onSendLocalChatMessage={sendLocalChatMessage}
    />
  );
};
