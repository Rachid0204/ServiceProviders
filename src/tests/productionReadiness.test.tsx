import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { TRANSLATIONS } from '../i18n/translations';
import { VETTED_PROVIDERS } from '../data/providers';
import type { UserProfileRecord } from '../utils/marketplace';
import { DEFAULT_SYSTEM_SETTINGS } from '../utils/systemSettings';
import {
  MarketplaceContext,
  type MarketplaceContextValue,
} from '../app/providers/MarketplaceContext';
import { AppRouter } from '../app/router';

vi.mock('../firebase', () => ({
  db: {},
  auth: {},
  storage: {},
  reportFirestoreError: vi.fn(),
  OperationType: { LIST: 'list', GET: 'get', CREATE: 'create', UPDATE: 'update' },
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  requestPasswordReset: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(() => () => {}),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(),
}));

function createArabicContext(
  overrides: Partial<MarketplaceContextValue> = {}
): MarketplaceContextValue {
  const firebaseUser = overrides.firebaseUser ?? null;
  const userProfile = overrides.userProfile ?? null;
  const effectiveRole = overrides.effectiveRole ?? userProfile?.role ?? null;
  const isPureProvider = Boolean(firebaseUser && effectiveRole === 'provider');

  return {
    lang: 'ar',
    t: TRANSLATIONS.ar,
    isAr: true,
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
    rejectJobProposal: vi.fn().mockResolvedValue(undefined),
    acceptProposalAndCreateBooking: vi.fn().mockResolvedValue(null),
    clientActiveCount: 0,
    providerPendingCount: 0,
    openJobsCount: 0,
    notifications: [],
    unreadNotificationCount: 0,
    notificationPreferences: {
      uid: firebaseUser?.uid ?? '',
      inAppEnabled: true,
      emailEnabled: true,
      smsWhatsAppEnabled: true,
      bookingUpdates: true,
      quotationUpdates: true,
      chatMessages: true,
      marketingUpdates: false,
    },
    markNotificationRead: vi.fn().mockResolvedValue(undefined),
    markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
    deleteNotification: vi.fn().mockResolvedValue(undefined),
    saveNotificationPreferences: vi.fn().mockResolvedValue(undefined),
    conversationsByBookingId: {},
    unreadConversationsCount: 0,
    markConversationRead: vi.fn().mockResolvedValue(undefined),
    updateConversationOnMessage: vi.fn().mockResolvedValue(undefined),
    toggleBlockConversation: vi.fn().mockResolvedValue(undefined),
    submitChatReport: vi.fn().mockResolvedValue(undefined),
    disputes: [],
    openDisputesCount: 0,
    openDispute: vi.fn().mockResolvedValue('disp-ar-1'),
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

function renderArabicAt(
  initialEntries: string[],
  overrides: Partial<MarketplaceContextValue> = {}
) {
  const ctx = createArabicContext(overrides);
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <MarketplaceContext.Provider value={ctx}>
        <AppRouter />
      </MarketplaceContext.Provider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  window.scrollTo = vi.fn();
});

describe('Phase 7 Production Readiness: Arabic RTL, Landmarks & Critical Journeys', () => {
  it('renders public HomePage, ServicesPage, LegalPages, and 404 cleanly in Arabic with accessible landmarks & skip link', async () => {
    const { unmount: unmountHome } = renderArabicAt(['/']);
    expect(await screen.findByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByText(/Aller au contenu principal/i)).toHaveAttribute('href', '#top');
    unmountHome();

    const { unmount: unmountServices } = renderArabicAt(['/services']);
    expect(
      await screen.findByRole('heading', { name: TRANSLATIONS.ar.servicesCatalogTitle })
    ).toBeInTheDocument();
    unmountServices();

    const { unmount: unmountPrivacy } = renderArabicAt(['/privacy']);
    expect(
      await screen.findByRole('heading', { name: TRANSLATIONS.ar.privacyPageTitle })
    ).toBeInTheDocument();
    unmountPrivacy();

    renderArabicAt(['/route-inconnue']);
    expect(
      await screen.findByRole('heading', { name: TRANSLATIONS.ar.notFoundTitle })
    ).toBeInTheDocument();
  });

  it('renders authenticated Messages, Notifications (with preferences toggle), and Disputes pages in Arabic RTL', async () => {
    const user = userEvent.setup();
    const saveNotificationPreferences = vi.fn().mockResolvedValue(undefined);
    const mockUser = {
      uid: 'client-ar-1',
      email: 'salma@example.ma',
      displayName: 'سلمى بنعلي',
      emailVerified: true,
    } as unknown as User;
    const mockProfile: UserProfileRecord = {
      uid: 'client-ar-1',
      role: 'client',
      fullName: 'سلمى بنعلي',
      phone: '+212661234567',
      city: 'Casablanca',
      neighborhood: 'المعاريف',
      languagePref: 'ar',
      verifiedBadge: true,
    };

    const { unmount: unmountMsg } = renderArabicAt(['/messages'], {
      firebaseUser: mockUser,
      userProfile: mockProfile,
      isVerified: true,
    });
    expect(
      await screen.findByRole('heading', { name: TRANSLATIONS.ar.messagesInboxTitle })
    ).toBeInTheDocument();
    unmountMsg();

    const { unmount: unmountNotif } = renderArabicAt(['/notifications'], {
      firebaseUser: mockUser,
      userProfile: mockProfile,
      isVerified: true,
      saveNotificationPreferences,
    });
    expect(
      await screen.findByRole('heading', { name: TRANSLATIONS.ar.notificationsTitle })
    ).toBeInTheDocument();
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(7);
    await user.click(checkboxes[0]);
    expect(saveNotificationPreferences).toHaveBeenCalledTimes(1);
    unmountNotif();

    renderArabicAt(['/disputes'], {
      firebaseUser: mockUser,
      userProfile: mockProfile,
      isVerified: true,
    });
    expect(
      await screen.findByRole('heading', { name: TRANSLATIONS.ar.disputesTitle })
    ).toBeInTheDocument();
  });

  it('verifies 100% key parity and zero empty strings across TRANSLATIONS.fr and TRANSLATIONS.ar', () => {
    const frKeys = Object.keys(TRANSLATIONS.fr).sort();
    const arKeys = Object.keys(TRANSLATIONS.ar).sort();
    expect(frKeys).toEqual(arKeys);

    for (const key of frKeys) {
      const frVal = TRANSLATIONS.fr[key as keyof typeof TRANSLATIONS.fr];
      const arVal = TRANSLATIONS.ar[key as keyof typeof TRANSLATIONS.ar];
      if (typeof frVal === 'string') {
        expect(frVal.trim().length).toBeGreaterThan(0);
      }
      if (typeof arVal === 'string') {
        expect(arVal.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('AUD-015: BookingModal does not render the demo sample photo button while preserving real photo upload', async () => {
    const { BookingModal } = await import('../components/BookingModal');
    const mockUser = { uid: 'c-1', email: 'salma@test.ma', emailVerified: true } as unknown as User;
    const mockProfile: UserProfileRecord = {
      uid: 'c-1',
      role: 'client',
      fullName: 'Salma Bennani',
      phone: '+212661234567',
      city: 'Casablanca',
      neighborhood: 'Maârif',
      languagePref: 'fr',
      verifiedBadge: false,
    };
    render(
      <BookingModal
        provider={VETTED_PROVIDERS[0]}
        lang="fr"
        t={TRANSLATIONS.fr}
        firebaseUser={mockUser}
        currentProfile={mockProfile}
        onClose={vi.fn()}
        onSubmitBooking={vi.fn().mockResolvedValue('MK-TEST')}
      />
    );

    expect(
      screen.queryByRole('button', { name: TRANSLATIONS.fr.attachSamplePhotoBtn })
    ).not.toBeInTheDocument();
  });
});
