import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert, LogOut } from 'lucide-react';
import type { UserRole } from '../../utils/marketplace';
import { isSuspendedUserProfile } from '../../utils/authHelpers';
import { useMarketplace } from '../providers/MarketplaceContext';
import { ROUTE_PATHS, buildLoginRedirectPath } from '../routePaths';

const RouteLoadingFallback: React.FC<{ label: string }> = ({ label }) => (
  <div
    role="status"
    className="min-h-[40vh] flex items-center justify-center px-4 py-16 text-xs font-medium text-slate-500"
  >
    {label}
  </div>
);

const SuspendedAccountScreen: React.FC = () => {
  const { isAr, signOutUser } = useMarketplace();
  return (
    <div
      role="alert"
      data-testid="suspended-account-screen"
      className="max-w-lg mx-auto px-4 py-16"
    >
      <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center space-y-4 shadow-2xs">
        <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">
          {isAr ? 'تم تعليق حسابك مؤقتاً' : 'Compte temporairement suspendu'}
        </h1>
        <p className="text-xs text-slate-600 leading-relaxed">
          {isAr
            ? 'تم تعليق صلاحيات هذا الحساب من طرف إدارة مول الخدمة لمراجعة الامتثال لشروط الاستخدام. يرجى التواصل مع فريق الدعم للمزيد من المعلومات.'
            : 'L’accès à votre espace Moul L’Khedma a été suspendu par l’administration. Veuillez contacter le support pour toute réclamation.'}
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => void signOutUser()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isAr ? 'تسجيل الخروج' : 'Se déconnecter'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Guards any route requiring a signed-in (and optionally email-verified) user.
 * Unauthenticated visitors are redirected to /login?redirect=<requested-url>.
 * Suspended non-admin accounts see a dedicated suspended-account screen (AUD-003).
 */
export const RequireAuth: React.FC<{ requireVerified?: boolean }> = ({
  requireVerified = true,
}) => {
  const { authReady, firebaseUser, isVerified, userProfile, hasAdminAccess, t } = useMarketplace();
  const location = useLocation();

  if (!authReady) {
    return <RouteLoadingFallback label={t.routeLoadingLabel} />;
  }

  if (!firebaseUser) {
    const requested = `${location.pathname}${location.search}`;
    return <Navigate to={buildLoginRedirectPath(requested)} replace />;
  }

  if (requireVerified && !isVerified) {
    return <Navigate to={ROUTE_PATHS.VERIFY_EMAIL} replace />;
  }

  if (!hasAdminAccess && isSuspendedUserProfile(userProfile)) {
    return <SuspendedAccountScreen />;
  }

  return <Outlet />;
};

/**
 * Enforces role-based access control for Customer vs Provider workspaces.
 * - Customer accounts ('client') cannot access /provider/* routes -> /unauthorized
 * - Pure Provider accounts ('provider') cannot access /dashboard or /customer/* -> /unauthorized
 * - Double accounts ('both') can access both Customer and Provider workspaces.
 * - Suspended non-admin accounts are blocked with SuspendedAccountScreen (AUD-003).
 */
export const RequireRole: React.FC<{ allowedRoles: UserRole[] }> = ({ allowedRoles }) => {
  const {
    authReady,
    firebaseUser,
    isVerified,
    profileLoaded,
    userProfile,
    effectiveRole,
    hasAdminAccess,
    t,
  } = useMarketplace();
  const location = useLocation();

  if (!authReady) {
    return <RouteLoadingFallback label={t.routeLoadingLabel} />;
  }

  if (!firebaseUser) {
    const requested = `${location.pathname}${location.search}`;
    return <Navigate to={buildLoginRedirectPath(requested)} replace />;
  }

  if (!isVerified) {
    return <Navigate to={ROUTE_PATHS.VERIFY_EMAIL} replace />;
  }

  if (!profileLoaded) {
    return <RouteLoadingFallback label={t.routeLoadingLabel} />;
  }

  if (!hasAdminAccess && isSuspendedUserProfile(userProfile)) {
    return <SuspendedAccountScreen />;
  }

  const resolvedRole: UserRole = effectiveRole ?? 'client';
  if (allowedRoles.includes(resolvedRole) || hasAdminAccess) {
    return <Outlet />;
  }

  return <Navigate to={ROUTE_PATHS.UNAUTHORIZED} replace />;
};

/**
 * Guards /admin and /admin/* routes.
 * Waits for Firebase Auth + async admin claim / admins/{uid} check so direct refreshes
 * on /admin/dashboard work seamlessly for admins while blocking customers & providers.
 */
export const RequireAdmin: React.FC = () => {
  const { authReady, firebaseUser, isVerified, hasAdminAccess, isCheckingAdmin, t } =
    useMarketplace();
  const location = useLocation();

  if (!authReady || isCheckingAdmin) {
    return <RouteLoadingFallback label={t.routeLoadingLabel} />;
  }

  if (!firebaseUser) {
    const requested = `${location.pathname}${location.search}`;
    return <Navigate to={buildLoginRedirectPath(requested)} replace />;
  }

  if (!isVerified) {
    return <Navigate to={ROUTE_PATHS.VERIFY_EMAIL} replace />;
  }

  if (!hasAdminAccess) {
    return <Navigate to={ROUTE_PATHS.UNAUTHORIZED} replace />;
  }

  return <Outlet />;
};

/**
 * Pure Maâlem accounts ('provider') stay strictly inside their provider workspace
 * rather than browsing competing Maâlems on public directory pages.
 * Visitors, clients, and double accounts ('both') explore freely.
 */
export const PublicDirectoryGuard: React.FC = () => {
  const { authReady, firebaseUser, isVerified, profileLoaded, isPureProvider } = useMarketplace();

  if (authReady && firebaseUser && isVerified && profileLoaded && isPureProvider) {
    return <Navigate to={ROUTE_PATHS.PROVIDER_DASHBOARD} replace />;
  }

  return <Outlet />;
};
