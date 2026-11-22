import React, { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ROUTE_PATHS } from './routePaths';
import {
  PublicDirectoryGuard,
  RequireAdmin,
  RequireAuth,
  RequireRole,
} from './guards/RouteGuards';
import { useMarketplace } from './providers/MarketplaceContext';
import { PublicLayout } from '../layouts/PublicLayout';
import { CustomerLayout } from '../layouts/CustomerLayout';
import { ProviderLayout } from '../layouts/ProviderLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { HomePage } from '../pages/public/HomePage';
import { ServicesPage } from '../pages/public/ServicesPage';
import { NotFoundPage } from '../pages/public/NotFoundPage';
import { UnauthorizedPage } from '../pages/public/UnauthorizedPage';

// Lazy-loaded pages keep the initial landing bundle lean on mobile connections
const ProviderPublicProfilePage = lazy(() =>
  import('../pages/public/ProviderPublicProfilePage').then((m) => ({
    default: m.ProviderPublicProfilePage,
  }))
);
const LoginPage = lazy(() =>
  import('../pages/auth/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = lazy(() =>
  import('../pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage }))
);
const VerifyEmailPage = lazy(() =>
  import('../pages/auth/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage }))
);
const CustomerDashboardPage = lazy(() =>
  import('../pages/customer/CustomerDashboardPage').then((m) => ({
    default: m.CustomerDashboardPage,
  }))
);
const ProfileSettingsPage = lazy(() =>
  import('../pages/customer/ProfileSettingsPage').then((m) => ({
    default: m.ProfileSettingsPage,
  }))
);
const ProviderDashboardPage = lazy(() =>
  import('../pages/provider/ProviderDashboardPage').then((m) => ({
    default: m.ProviderDashboardPage,
  }))
);
const AdminDashboardPage = lazy(() =>
  import('../pages/admin/AdminDashboardPage').then((m) => ({
    default: m.AdminDashboardPage,
  }))
);
const TermsPage = lazy(() =>
  import('../pages/public/LegalPages').then((m) => ({ default: m.TermsPage }))
);
const PrivacyPage = lazy(() =>
  import('../pages/public/LegalPages').then((m) => ({ default: m.PrivacyPage }))
);

const LazyPageFallback: React.FC = () => {
  const { t } = useMarketplace();
  return (
    <div
      role="status"
      className="min-h-[40vh] flex items-center justify-center px-4 py-16 text-xs font-medium text-slate-500"
    >
      {t.routeLoadingLabel}
    </div>
  );
};

/**
 * Single centralized route tree for Moul L'Khedma.
 * Never mount BrowserRouter here — BrowserRouter is mounted once in src/main.tsx
 * so tests can mount AppRouter cleanly inside MemoryRouter.
 */
export const AppRouter: React.FC = () => {
  return (
    <Suspense fallback={<LazyPageFallback />}>
      <Routes>
        {/* 1. Public Marketplace, Directory, Auth & Error Routes */}
        <Route element={<PublicLayout />}>
          <Route element={<PublicDirectoryGuard />}>
            <Route path={ROUTE_PATHS.HOME} element={<HomePage />} />
            <Route path={ROUTE_PATHS.SERVICES} element={<ServicesPage />} />
            <Route path={ROUTE_PATHS.SERVICE_CATEGORY} element={<ServicesPage />} />
            <Route path={ROUTE_PATHS.PROVIDER_DETAIL} element={<ProviderPublicProfilePage />} />
          </Route>

          <Route path={ROUTE_PATHS.TERMS} element={<TermsPage />} />
          <Route path={ROUTE_PATHS.PRIVACY} element={<PrivacyPage />} />
          <Route path={ROUTE_PATHS.LOGIN} element={<LoginPage />} />
          <Route path={ROUTE_PATHS.REGISTER} element={<RegisterPage />} />
          <Route path={ROUTE_PATHS.VERIFY_EMAIL} element={<VerifyEmailPage />} />
          <Route path={ROUTE_PATHS.UNAUTHORIZED} element={<UnauthorizedPage />} />
          <Route path={ROUTE_PATHS.NOT_FOUND} element={<NotFoundPage />} />
        </Route>

        {/* 2. Customer Workspace Routes (Customer & Double Accounts only) */}
        <Route element={<RequireRole allowedRoles={['client', 'both']} />}>
          <Route element={<CustomerLayout />}>
            <Route path={ROUTE_PATHS.CUSTOMER_DASHBOARD} element={<CustomerDashboardPage />} />
            <Route path={ROUTE_PATHS.CUSTOMER_ALT_DASHBOARD} element={<CustomerDashboardPage />} />
            <Route path={ROUTE_PATHS.CUSTOMER_REQUESTS} element={<CustomerDashboardPage />} />
            <Route path={ROUTE_PATHS.CUSTOMER_ALT_PROFILE} element={<ProfileSettingsPage />} />
          </Route>
        </Route>

        {/* 3. Shared Authenticated Profile & Security Route (All Verified Roles) */}
        <Route element={<RequireAuth requireVerified={true} />}>
          <Route element={<CustomerLayout />}>
            <Route path={ROUTE_PATHS.CUSTOMER_PROFILE} element={<ProfileSettingsPage />} />
          </Route>
        </Route>

        {/* 4. Service Provider Workspace Routes (Maâlem & Double Accounts only) */}
        <Route element={<RequireRole allowedRoles={['provider', 'both']} />}>
          <Route element={<ProviderLayout />}>
            <Route path={ROUTE_PATHS.PROVIDER_ROOT} element={<ProviderDashboardPage />} />
            <Route path={ROUTE_PATHS.PROVIDER_DASHBOARD} element={<ProviderDashboardPage />} />
            <Route path={ROUTE_PATHS.PROVIDER_JOBS} element={<ProviderDashboardPage />} />
            <Route path={ROUTE_PATHS.PROVIDER_MISSIONS} element={<ProviderDashboardPage />} />
            <Route path={ROUTE_PATHS.PROVIDER_CARD} element={<ProviderDashboardPage />} />
            <Route path={ROUTE_PATHS.PROVIDER_SERVICES} element={<ProviderDashboardPage />} />
            <Route path={ROUTE_PATHS.PROVIDER_VERIFICATION} element={<ProviderDashboardPage />} />
            <Route path={ROUTE_PATHS.PROVIDER_EARNINGS} element={<ProviderDashboardPage />} />
          </Route>
        </Route>

        {/* 5. Administration Portal Routes (Verified Admins only) */}
        <Route element={<RequireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route path={ROUTE_PATHS.ADMIN_ROOT} element={<AdminDashboardPage />} />
            <Route path={ROUTE_PATHS.ADMIN_DASHBOARD} element={<AdminDashboardPage />} />
            <Route path={ROUTE_PATHS.ADMIN_WILDCARD} element={<AdminDashboardPage />} />
          </Route>
        </Route>

        {/* 6. Catch-all 404 Fallback */}
        <Route element={<PublicLayout />}>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
};
