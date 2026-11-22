import React from 'react';
import { Navigate } from 'react-router-dom';
import { VerifyEmailView } from '../../components/VerifyEmailView';
import { useMarketplace } from '../../app/providers/MarketplaceContext';
import { ROUTE_PATHS } from '../../app/routePaths';
import { getDefaultDashboardForRole } from '../../utils/authHelpers';

export const VerifyEmailPage: React.FC = () => {
  const {
    lang,
    firebaseUser,
    isVerified,
    userProfile,
    signupRoleIntent,
    refreshVerificationStatus,
    handleEmailVerifiedRedirect,
    signOutUser,
  } = useMarketplace();

  if (!firebaseUser) {
    return <Navigate to={ROUTE_PATHS.LOGIN} replace />;
  }

  if (isVerified) {
    const target = getDefaultDashboardForRole(userProfile?.role, signupRoleIntent);
    return (
      <Navigate
        to={target === 'provider' ? ROUTE_PATHS.PROVIDER_DASHBOARD : ROUTE_PATHS.CUSTOMER_DASHBOARD}
        replace
      />
    );
  }

  return (
    <VerifyEmailView
      lang={lang}
      firebaseUser={firebaseUser}
      roleIntent={signupRoleIntent}
      onRefreshVerification={refreshVerificationStatus}
      onVerified={handleEmailVerifiedRedirect}
      onSignOut={signOutUser}
    />
  );
};
