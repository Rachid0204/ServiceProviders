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
    firebaseUser,
    authReady,
    signInWithGoogle,
    signOutUser,
    allProviders,
    firestoreProviders,
    bookings,
    systemSettings,
    updateLocalSettings,
    applyAdminProviderOverride,
    removeProviderReview,
    applyAdminBookingPatch,
  } = useMarketplace();

  return (
    <AdminRoute
      lang={lang}
      t={t}
      onToggleLanguage={toggleLanguage}
      onExitAdmin={() =>
        navigate(isPureProvider ? ROUTE_PATHS.PROVIDER_DASHBOARD : ROUTE_PATHS.HOME)
      }
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
      systemSettings={systemSettings}
      onUpdateLocalSettings={updateLocalSettings}
      onApplyProviderOverride={applyAdminProviderOverride}
      onRemoveProviderReview={removeProviderReview}
      onApplyBookingPatch={applyAdminBookingPatch}
    />
  );
};
