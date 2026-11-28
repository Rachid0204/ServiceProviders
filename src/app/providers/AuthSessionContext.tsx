import React, { createContext, useContext, useMemo } from 'react';
import type { User } from 'firebase/auth';
import type { LanguageCode, UserProfileRecord, UserRole } from '../../utils/marketplace';
import { canExploreMarketplace } from '../../utils/authHelpers';
import { useMarketplaceAuth } from '../../hooks/useMarketplaceAuth';
import { useAdminAccess } from '../../hooks/useAdminAccess';

export interface AuthSessionContextValue {
  firebaseUser: User | null;
  authReady: boolean;
  profileLoaded: boolean;
  isVerified: boolean;
  mustVerifyEmail: boolean;
  userProfile: UserProfileRecord | null;
  signupRoleIntent: UserRole | null;
  setSignupRoleIntent: (role: UserRole | null) => void;
  effectiveRole: UserRole | null;
  isPureProvider: boolean;
  canExplore: boolean;
  hasAdminAccess: boolean;
  isCheckingAdmin: boolean;
  hydrateUserProfile: (profile: UserProfileRecord) => void;
  refreshVerificationStatus: () => Promise<boolean>;
  signInWithGoogle: () => Promise<unknown>;
  signOutUser: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  handleSaveProfile: ReturnType<typeof useMarketplaceAuth>['handleSaveProfile'];
  saveFullProviderCard: ReturnType<typeof useMarketplaceAuth>['saveFullProviderCard'];
}

export const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function useAuthSession(): AuthSessionContextValue {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) {
    throw new Error('useAuthSession must be used inside AuthSessionProvider');
  }
  return ctx;
}

export const AuthSessionProvider: React.FC<{
  onLanguageSync: (lang: LanguageCode) => void;
  children: React.ReactNode;
}> = ({ onLanguageSync, children }) => {
  const {
    firebaseUser,
    authReady,
    profileLoaded,
    isVerified,
    signupRoleIntent,
    setSignupRoleIntent,
    refreshVerificationStatus,
    userProfile,
    hydrateUserProfile,
    signInWithGoogle,
    signOutUser,
    deleteAccount,
    handleSaveProfile,
    saveFullProviderCard,
  } = useMarketplaceAuth(onLanguageSync);

  const { hasAdminAccess, isCheckingAdmin } = useAdminAccess(firebaseUser, authReady);

  const effectiveRole: UserRole | null = userProfile?.role ?? signupRoleIntent ?? null;
  const isPureProvider = Boolean(firebaseUser && effectiveRole === 'provider');
  const canExplore = !firebaseUser || canExploreMarketplace(effectiveRole);
  const mustVerifyEmail = Boolean(authReady && firebaseUser && !isVerified);

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      firebaseUser,
      authReady,
      profileLoaded,
      isVerified,
      mustVerifyEmail,
      userProfile,
      signupRoleIntent,
      setSignupRoleIntent,
      effectiveRole,
      isPureProvider,
      canExplore,
      hasAdminAccess,
      isCheckingAdmin,
      hydrateUserProfile,
      refreshVerificationStatus,
      signInWithGoogle,
      signOutUser,
      deleteAccount,
      handleSaveProfile,
      saveFullProviderCard,
    }),
    [
      firebaseUser,
      authReady,
      profileLoaded,
      isVerified,
      mustVerifyEmail,
      userProfile,
      signupRoleIntent,
      setSignupRoleIntent,
      effectiveRole,
      isPureProvider,
      canExplore,
      hasAdminAccess,
      isCheckingAdmin,
      hydrateUserProfile,
      refreshVerificationStatus,
      signInWithGoogle,
      signOutUser,
      deleteAccount,
      handleSaveProfile,
      saveFullProviderCard,
    ]
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
};
