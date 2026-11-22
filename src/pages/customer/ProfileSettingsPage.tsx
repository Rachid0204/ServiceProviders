import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileSettingsView } from '../../components/dashboards/ProfileSettingsView';
import { useMarketplace } from '../../app/providers/MarketplaceContext';
import { ROUTE_PATHS } from '../../app/routePaths';

export const ProfileSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    lang,
    t,
    firebaseUser,
    userProfile,
    isPureProvider,
    signInWithGoogle,
    signOutUser,
    deleteAccount,
    handleSaveProfile,
    setAuthModalIntent,
  } = useMarketplace();

  return (
    <ProfileSettingsView
      lang={lang}
      t={t}
      firebaseUser={firebaseUser}
      currentProfile={userProfile}
      isPureProvider={isPureProvider}
      onGoogleSignIn={async () => {
        await signInWithGoogle();
      }}
      onSignOut={async () => {
        await signOutUser();
        navigate(ROUTE_PATHS.HOME, { replace: true });
      }}
      onDeleteAccount={deleteAccount}
      onSaveProfile={handleSaveProfile}
      onOpenAuth={() => setAuthModalIntent('client')}
      onBack={() =>
        navigate(
          isPureProvider
            ? ROUTE_PATHS.PROVIDER_DASHBOARD
            : firebaseUser
            ? ROUTE_PATHS.CUSTOMER_DASHBOARD
            : ROUTE_PATHS.HOME
        )
      }
    />
  );
};
