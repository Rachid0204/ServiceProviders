import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { UserRole } from '../../utils/marketplace';
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

/**
 * Guards any route requiring a signed-in (and optionally email-verified) user.
 * Unauthenticated visitors are redirected to /login?redirect=<requested-url>.
 */
export const RequireAuth: React.FC<{ requireVerified?: boolean }> = ({
  requireVerified = true,
}) => {
  const { authReady, firebaseUser, isVerified, t } = useMarketplace();
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

  return <Outlet />;
};

/**
 * Enforces role-based access control for Customer vs Provider workspaces.
 * - Customer accounts ('client') cannot access /provider/* routes -> /unauthorized
 * - Pure Provider accounts ('provider') cannot access /dashboard or /customer/* -> /unauthorized
 * - Double accounts ('both') can access both Customer and Provider workspaces.
 */
export const RequireRole: React.FC<{ allowedRoles: UserRole[] }> = ({ allowedRoles }) => {
  const { authReady, firebaseUser, isVerified, profileLoaded, effectiveRole, hasAdminAccess, t } =
    useMarketplace();
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
