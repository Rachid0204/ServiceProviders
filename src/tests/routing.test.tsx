import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import fs from 'node:fs';
import path from 'node:path';
import type { User } from 'firebase/auth';
import { TRANSLATIONS } from '../i18n/translations';
import { VETTED_PROVIDERS } from '../data/providers';
import type { UserProfileRecord, UserRole } from '../utils/marketplace';
import { DEFAULT_SYSTEM_SETTINGS } from '../utils/systemSettings';
import { isDemoFixturesEnabled } from '../utils/featureFlags';
import {
  MarketplaceContext,
  type MarketplaceContextValue,
} from '../app/providers/MarketplaceContext';
import { AppRouter } from '../app/router';
import {
  ROUTE_PATHS,
  resolveCategoryFromSlug,
  buildServiceCategoryPath,
  sanitizeRedirectPath,
} from '../app/routePaths';

// Mock heavy dashboard & Firebase-connected leaf modules so route tests run fast and deterministically
vi.mock('../pages/customer/CustomerDashboardPage', () => ({
  CustomerDashboardPage: () => <div data-testid="customer-dashboard-page">Customer Dashboard</div>,
}));

vi.mock('../pages/customer/ProfileSettingsPage', () => ({
  ProfileSettingsPage: () => <div data-testid="profile-settings-page">Profile Settings</div>,
}));

vi.mock('../pages/provider/ProviderDashboardPage', () => ({
  ProviderDashboardPage: () => <div data-testid="provider-dashboard-page">Provider Dashboard</div>,
}));

vi.mock('../pages/admin/AdminDashboardPage', () => ({
  AdminDashboardPage: () => <div data-testid="admin-dashboard-page">Admin Dashboard</div>,
}));

vi.mock('../pages/auth/VerifyEmailPage', () => ({
  VerifyEmailPage: () => <div data-testid="verify-email-page">Verify Email Page</div>,
}));

vi.mock('../firebase', () => ({
  db: {},
  auth: {},
  reportFirestoreError: vi.fn(),
  OperationType: { LIST: 'list', GET: 'get', CREATE: 'create', UPDATE: 'update' },
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  requestPasswordReset: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(() => () => {}),
}));

const LocationObserver: React.FC = () => {
  const location = useLocation();
  return (
    <div data-testid="current-location">
      {location.pathname}
      {location.search}
    </div>
  );
};

function createMockUser(uid: string, email = 'user@moul-lkhedma.ma', emailVerified = true): User {
  return {
    uid,
    email,
    displayName: 'Test User',
    emailVerified,
    phoneNumber: null,
  } as unknown as User;
}

function createMockProfile(uid: string, role: UserRole): UserProfileRecord {
  return {
    uid,
    role,
    fullName: role === 'provider' ? 'Maâlem Karim' : 'Sara Benali',
    phone: '+212661234567',
    city: 'Casablanca',
    neighborhood: 'Maârif',
    languagePref: 'fr',
    verifiedBadge: true,
  };
}

function createMockContext(
  overrides: Partial<MarketplaceContextValue> = {}
): MarketplaceContextValue {
  const firebaseUser = overrides.firebaseUser ?? null;
  const userProfile = overrides.userProfile ?? null;
  const effectiveRole = overrides.effectiveRole ?? userProfile?.role ?? null;
  const isPureProvider =
    overrides.isPureProvider ?? Boolean(firebaseUser && effectiveRole === 'provider');

  return {
    lang: 'fr',
    t: TRANSLATIONS.fr,
    isAr: false,
    setLang: vi.fn(),
    toggleLanguage: vi.fn(),
    firebaseUser,
    authReady: true,
    profileLoaded: true,
    isVerified: Boolean(firebaseUser),
    mustVerifyEmail: false,
    userProfile,
    signupRoleIntent: null,
    setSignupRoleIntent: vi.fn(),
    effectiveRole,
    isPureProvider,
    canExplore: !isPureProvider,
    hasAdminAccess: false,
    isCheckingAdmin: false,
    refreshVerificationStatus: vi.fn().mockResolvedValue(true),
    signInWithGoogle: vi.fn().mockResolvedValue(null),
    signOutUser: vi.fn().mockResolvedValue(undefined),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
    handleSaveProfile: vi.fn().mockResolvedValue(undefined),
    saveFullProviderCard: vi.fn().mockResolvedValue(undefined),
    systemSettings: DEFAULT_SYSTEM_SETTINGS,
    updateLocalSettings: vi.fn(),
    supportWhatsAppUrl: 'https://wa.me/212661428910',
    allProviders: VETTED_PROVIDERS,
    firestoreProviders: VETTED_PROVIDERS,
    ownProvider: null,
    favoriteProviderIds: [],
    toggleFavoriteProvider: vi.fn().mockResolvedValue(undefined),
    toggleProviderAvailability: vi.fn().mockResolvedValue(undefined),
    applyAdminProviderOverride: vi.fn(),
    removeProviderReview: vi.fn(),
    bookings: [],
    chatThreads: {},
    bookingActionError: null,
    clearBookingActionError: vi.fn(),
    submitBooking: vi.fn().mockResolvedValue(null),
    updateBookingStatus: vi.fn().mockResolvedValue(undefined),
    clientConfirmAndReleaseEscrow: vi.fn().mockResolvedValue(undefined),
    cancelBookingWithReason: vi.fn().mockResolvedValue(undefined),
    rescheduleBooking: vi.fn().mockResolvedValue(undefined),
    submitClientReview: vi.fn().mockResolvedValue(undefined),
    applyAdminBookingPatch: vi.fn(),
    sendLocalChatMessage: vi.fn(),
    openJobPosts: [],
    myClientJobPosts: [],
    myProposalsByJobId: {},
    jobActionError: null,
    clearJobActionError: vi.fn(),
    createJobPost: vi.fn().mockResolvedValue(null),
    cancelJobPost: vi.fn().mockResolvedValue(undefined),
    submitJobProposal: vi.fn().mockResolvedValue(null),
    withdrawJobProposal: vi.fn().mockResolvedValue(undefined),
    acceptProposalAndCreateBooking: vi.fn().mockResolvedValue(null),
    clientActiveCount: 0,
    providerPendingCount: 0,
    openJobsCount: 0,
    authModalIntent: null,
    setAuthModalIntent: vi.fn(),
    isPostJobModalOpen: false,
    setIsPostJobModalOpen: vi.fn(),
    detailProvider: null,
    setDetailProvider: vi.fn(),
    bookingProvider: null,
    setBookingProvider: vi.fn(),
    activeChatBooking: null,
    setActiveChatBooking: vi.fn(),
    detailBooking: null,
    setDetailBooking: vi.fn(),
    cancellingBooking: null,
    setCancellingBooking: vi.fn(),
    reschedulingBooking: null,
    setReschedulingBooking: vi.fn(),
    reviewingBooking: null,
    setReviewingBooking: vi.fn(),
    handleAuthSuccess: vi.fn(),
    handleEmailVerifiedRedirect: vi.fn(),
    ...overrides,
  };
}

function renderAtRoute(
  initialEntries: string[],
  ctxOverrides: Partial<MarketplaceContextValue> = {}
) {
  const ctx = createMockContext(ctxOverrides);
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <MarketplaceContext.Provider value={ctx}>
        <AppRouter />
        <LocationObserver />
      </MarketplaceContext.Provider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  window.scrollTo = vi.fn();
});

describe('Route Paths & Slug Helpers', () => {
  it('resolves both English and French category slugs cleanly', () => {
    expect(resolveCategoryFromSlug('plumbing')).toBe('Plomberie');
    expect(resolveCategoryFromSlug('plomberie')).toBe('Plomberie');
    expect(resolveCategoryFromSlug('electricity')).toBe('Électricité');
    expect(resolveCategoryFromSlug('electricite')).toBe('Électricité');
    expect(resolveCategoryFromSlug('hvac')).toBe('Climatisation');
    expect(resolveCategoryFromSlug('unknown-slug')).toBeNull();
    expect(buildServiceCategoryPath('Plomberie')).toBe('/services/plumbing');
  });

  it('sanitizes redirect paths to prevent open-redirect vulnerabilities', () => {
    expect(sanitizeRedirectPath('/provider/dashboard')).toBe('/provider/dashboard');
    expect(sanitizeRedirectPath('https://evil.example')).toBe('/');
    expect(sanitizeRedirectPath('//evil.example')).toBe('/');
    expect(sanitizeRedirectPath('/login')).toBe('/');
  });
});

describe('Phase 1 Routing Acceptance Tests (Spec §2B)', () => {
  it('directly opening /services works and renders the services directory', async () => {
    renderAtRoute(['/services']);
    expect(
      await screen.findByRole('heading', { name: TRANSLATIONS.fr.servicesCatalogTitle })
    ).toBeInTheDocument();
    expect(screen.getByTestId('current-location')).toHaveTextContent('/services');
  });

  it('directly opening /services/plumbing works and filters to Plomberie providers', async () => {
    renderAtRoute(['/services/plumbing']);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Plomberie' })
    ).toBeInTheDocument();

    const plumbingProviders = VETTED_PROVIDERS.filter((p) => p.category === 'Plomberie');
    const nonPlumbingProvider = VETTED_PROVIDERS.find((p) => p.category !== 'Plomberie');

    expect(screen.getByText(plumbingProviders[0].fullNameFr)).toBeInTheDocument();
    if (nonPlumbingProvider) {
      expect(screen.queryByText(nonPlumbingProvider.fullNameFr)).not.toBeInTheDocument();
    }
  });

  it('directly opening /providers/:id renders the provider public profile', async () => {
    const firstProvider = VETTED_PROVIDERS[0];
    renderAtRoute([`/providers/${firstProvider.id}`]);
    expect(
      await screen.findByRole('heading', { level: 1, name: firstProvider.fullNameFr })
    ).toBeInTheDocument();
  });

  it('refreshing /provider/dashboard works for an authenticated verified provider', async () => {
    const providerUser = createMockUser('prov-1', 'maalem@example.ma', true);
    renderAtRoute(['/provider/dashboard'], {
      firebaseUser: providerUser,
      userProfile: createMockProfile('prov-1', 'provider'),
      isVerified: true,
    });
    expect(await screen.findByTestId('provider-dashboard-page')).toBeInTheDocument();
    expect(document.querySelector('[data-layout="provider"]')).toBeInTheDocument();
  });

  it('refreshing /admin/dashboard works for an authenticated verified admin', async () => {
    const adminUser = createMockUser('admin-1', 'admin@moul-lkhedma.ma', true);
    renderAtRoute(['/admin/dashboard'], {
      firebaseUser: adminUser,
      userProfile: createMockProfile('admin-1', 'client'),
      isVerified: true,
      hasAdminAccess: true,
      isCheckingAdmin: false,
    });
    expect(await screen.findByTestId('admin-dashboard-page')).toBeInTheDocument();
    expect(document.querySelector('[data-layout="admin"]')).toBeInTheDocument();
  });

  it('waits while admin status is still loading on /admin/dashboard refresh instead of flashing /unauthorized', () => {
    const adminUser = createMockUser('admin-1', 'admin@moul-lkhedma.ma', true);
    renderAtRoute(['/admin/dashboard'], {
      firebaseUser: adminUser,
      isVerified: true,
      hasAdminAccess: false,
      isCheckingAdmin: true,
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText(TRANSLATIONS.fr.unauthorizedTitle)).not.toBeInTheDocument();
  });

  it('blocks unauthenticated users from protected pages and redirects to /login with redirect query', async () => {
    for (const protectedPath of [
      '/dashboard',
      '/customer/dashboard',
      '/provider/dashboard',
      '/profile',
      '/admin/dashboard',
    ]) {
      const { unmount } = renderAtRoute([protectedPath], { firebaseUser: null });
      expect(
        await screen.findByRole('heading', { name: TRANSLATIONS.fr.loginPageTitle })
      ).toBeInTheDocument();
      expect(screen.getByTestId('current-location').textContent).toBe(
        `/login?redirect=${encodeURIComponent(protectedPath)}`
      );
      unmount();
    }
  });

  it('redirects unverified signed-in users away from protected routes to /verify-email', async () => {
    const unverifiedUser = createMockUser('u-unverified', 'new@example.ma', false);
    renderAtRoute(['/dashboard'], {
      firebaseUser: unverifiedUser,
      isVerified: false,
      mustVerifyEmail: true,
    });
    expect(await screen.findByTestId('verify-email-page')).toBeInTheDocument();
    expect(screen.getByTestId('current-location')).toHaveTextContent(ROUTE_PATHS.VERIFY_EMAIL);
  });

  it('prevents Customer accounts from accessing Provider workspace or Admin routes', async () => {
    const clientUser = createMockUser('client-1', 'client@example.ma', true);
    const clientProfile = createMockProfile('client-1', 'client');

    for (const forbiddenPath of ['/provider/dashboard', '/provider/card', '/admin/dashboard']) {
      const { unmount } = renderAtRoute([forbiddenPath], {
        firebaseUser: clientUser,
        userProfile: clientProfile,
        isVerified: true,
        hasAdminAccess: false,
      });
      expect(
        await screen.findByRole('heading', { name: TRANSLATIONS.fr.unauthorizedTitle })
      ).toBeInTheDocument();
      expect(screen.getByTestId('current-location')).toHaveTextContent(ROUTE_PATHS.UNAUTHORIZED);
      unmount();
    }
  });

  it('prevents Provider accounts from accessing Admin routes and Customer dashboard', async () => {
    const providerUser = createMockUser('prov-2', 'prov@example.ma', true);
    const providerProfile = createMockProfile('prov-2', 'provider');

    for (const forbiddenPath of ['/admin/dashboard', '/admin', '/dashboard', '/customer/dashboard']) {
      const { unmount } = renderAtRoute([forbiddenPath], {
        firebaseUser: providerUser,
        userProfile: providerProfile,
        isVerified: true,
        hasAdminAccess: false,
      });
      expect(
        await screen.findByRole('heading', { name: TRANSLATIONS.fr.unauthorizedTitle })
      ).toBeInTheDocument();
      expect(screen.getByTestId('current-location')).toHaveTextContent(ROUTE_PATHS.UNAUTHORIZED);
      unmount();
    }
  });

  it('redirects pure Provider accounts away from public directory to /provider/dashboard', async () => {
    const providerUser = createMockUser('prov-3', 'prov3@example.ma', true);
    renderAtRoute(['/services'], {
      firebaseUser: providerUser,
      userProfile: createMockProfile('prov-3', 'provider'),
      isVerified: true,
      hasAdminAccess: false,
    });
    expect(await screen.findByTestId('provider-dashboard-page')).toBeInTheDocument();
    expect(screen.getByTestId('current-location')).toHaveTextContent(ROUTE_PATHS.PROVIDER_DASHBOARD);
  });

  it('allows Double Accounts (both) into Customer & Provider workspaces while blocking Admin', async () => {
    const doubleUser = createMockUser('double-1', 'both@example.ma', true);
    const doubleProfile = createMockProfile('double-1', 'both');

    const { unmount: unmountClient } = renderAtRoute(['/dashboard'], {
      firebaseUser: doubleUser,
      userProfile: doubleProfile,
      isVerified: true,
      hasAdminAccess: false,
    });
    expect(await screen.findByTestId('customer-dashboard-page')).toBeInTheDocument();
    unmountClient();

    const { unmount: unmountProvider } = renderAtRoute(['/provider/dashboard'], {
      firebaseUser: doubleUser,
      userProfile: doubleProfile,
      isVerified: true,
      hasAdminAccess: false,
    });
    expect(await screen.findByTestId('provider-dashboard-page')).toBeInTheDocument();
    unmountProvider();

    renderAtRoute(['/admin/dashboard'], {
      firebaseUser: doubleUser,
      userProfile: doubleProfile,
      isVerified: true,
      hasAdminAccess: false,
    });
    expect(
      await screen.findByRole('heading', { name: TRANSLATIONS.fr.unauthorizedTitle })
    ).toBeInTheDocument();
  });

  it('renders 404 NotFoundPage for unknown nested URLs and invalid service slugs', async () => {
    const { unmount } = renderAtRoute(['/unknown/nested/route']);
    expect(
      await screen.findByRole('heading', { name: TRANSLATIONS.fr.notFoundTitle })
    ).toBeInTheDocument();
    unmount();

    renderAtRoute(['/services/does-not-exist']);
    expect(
      await screen.findByRole('heading', { name: TRANSLATIONS.fr.notFoundTitle })
    ).toBeInTheDocument();
  });

  it('preserves query parameters during internal Link navigation without full-page reload', async () => {
    const user = userEvent.setup();
    renderAtRoute(['/services?city=Casablanca']);

    expect(
      await screen.findByRole('heading', { name: TRANSLATIONS.fr.servicesCatalogTitle })
    ).toBeInTheDocument();

    const categoriesGroup = screen.getByRole('group', { name: 'Service Categories' });
    const plumbingLink = within(categoriesGroup).getByRole('link', { name: 'Plomberie' });
    await user.click(plumbingLink);

    await waitFor(() => {
      expect(screen.getByTestId('current-location')).toHaveTextContent(
        '/services/plumbing?city=Casablanca'
      );
    });
    expect(screen.getByRole('heading', { level: 1, name: 'Plomberie' })).toBeInTheDocument();
  });

  it('keeps demo fixtures disabled by default unless explicitly opted in', () => {
    expect(isDemoFixturesEnabled()).toBe(false);
  });

  it('supports all 12 bilingual service categories including new Phase 2 slugs (/services/carpentry, /services/locksmith)', async () => {
    expect(resolveCategoryFromSlug('carpentry')).toBe('Menuiserie');
    expect(resolveCategoryFromSlug('locksmith')).toBe('Serrurerie');
    expect(resolveCategoryFromSlug('appliance-repair')).toBe('Électroménager');
    expect(resolveCategoryFromSlug('gardening')).toBe('Jardinage');
    expect(resolveCategoryFromSlug('moving')).toBe('Déménagement');
    expect(resolveCategoryFromSlug('masonry')).toBe('Maçonnerie');

    renderAtRoute(['/services/carpentry']);
    expect(
      await screen.findByRole('heading', { level: 1, name: TRANSLATIONS.fr.categories.Menuiserie })
    ).toBeInTheDocument();
  });

  it('renders /terms and /privacy Law 09-08 legal pages and enforces consent checkbox on /register', async () => {
    const user = userEvent.setup();
    const { unmount: unmountTerms } = renderAtRoute(['/terms']);
    expect(
      await screen.findByRole('heading', { name: TRANSLATIONS.fr.termsPageTitle })
    ).toBeInTheDocument();
    unmountTerms();

    const { unmount: unmountPrivacy } = renderAtRoute(['/privacy']);
    expect(
      await screen.findByRole('heading', { name: TRANSLATIONS.fr.privacyPageTitle })
    ).toBeInTheDocument();
    unmountPrivacy();

    renderAtRoute(['/register']);
    expect(
      await screen.findByRole('heading', { name: TRANSLATIONS.fr.registerPageTitle })
    ).toBeInTheDocument();

    // Attempting Google signup without accepting Law 09-08 terms shows consent error
    await user.click(screen.getByRole('button', { name: TRANSLATIONS.fr.googleSignInBtn }));
    expect(screen.getByRole('alert')).toHaveTextContent(TRANSLATIONS.fr.termsConsentRequiredError);
  });

  it('allows authenticated providers to directly open /provider/services and /provider/verification', async () => {
    const providerUser = createMockUser('prov-p2', 'maalem-p2@example.ma', true);
    const providerProfile = createMockProfile('prov-p2', 'provider');

    for (const p of ['/provider/services', '/provider/verification']) {
      const { unmount } = renderAtRoute([p], {
        firebaseUser: providerUser,
        userProfile: providerProfile,
        isVerified: true,
      });
      expect(await screen.findByTestId('provider-dashboard-page')).toBeInTheDocument();
      expect(screen.getByTestId('current-location')).toHaveTextContent(p);
      unmount();
    }
  });

  it('enforces single <BrowserRouter> mount in src/main.tsx and zero manual window.history.pushState in src/', () => {
    const srcRoot = path.resolve(process.cwd(), 'src');
    const files: string[] = [];

    function walk(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'tests') walk(full);
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          files.push(full);
        }
      }
    }
    walk(srcRoot);

    const browserRouterFiles = files
      .filter((f) => /<BrowserRouter\b/.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(srcRoot, f));

    expect(browserRouterFiles).toEqual(['main.tsx']);

    const pushStateFiles = files
      .filter((f) => fs.readFileSync(f, 'utf8').includes('history.pushState'))
      .map((f) => path.relative(srcRoot, f));

    expect(pushStateFiles).toEqual([]);
  });
});
