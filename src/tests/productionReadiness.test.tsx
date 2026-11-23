import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
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
  appCheckStatus: { configured: false, active: false, siteKeyPresent: false },
  handleFirestoreError: vi.fn((err: unknown) => {
    throw err;
  }),
  reportFirestoreError: vi.fn(),
  OperationType: {
    LIST: 'list',
    GET: 'get',
    CREATE: 'create',
    UPDATE: 'update',
    WRITE: 'write',
    DELETE: 'delete',
  },
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  requestPasswordReset: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn((_db, ...segments: string[]) => ({ path: segments.join('/') })),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(() => () => {}),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  runTransaction: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  updateDoc: vi.fn(),
  writeBatch: vi.fn(),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
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

  it('saveSystemSettings accepts empty supportWhatsAppPhone, normalizes valid Moroccan phones, and rejects malformed non-empty phones', async () => {
    const { setDoc } = await import('firebase/firestore');
    const { useAdminData } = await import('../hooks/useAdminData');
    const setDocMock = vi.mocked(setDoc);
    setDocMock.mockClear();

    const adminUser = {
      uid: 'admin-1',
      email: 'admin@moul-lkhedma.ma',
      emailVerified: true,
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: { admin: true } }),
    } as unknown as User;
    const onUpdateLocalSettings = vi.fn();
    const emptyProviders: typeof VETTED_PROVIDERS = [];
    const emptyBookings: never[] = [];
    const noopOverride = vi.fn();
    const noopRemove = vi.fn();
    const noopPatch = vi.fn();

    let latestApi: ReturnType<typeof useAdminData> | null = null;
    const Harness: React.FC = () => {
      latestApi = useAdminData({
        enabled: true,
        firebaseUser: adminUser,
        authReady: true,
        allProviders: emptyProviders,
        firestoreProviders: emptyProviders,
        bookings: emptyBookings,
        systemSettings: DEFAULT_SYSTEM_SETTINGS,
        onUpdateLocalSettings,
        onApplyProviderOverride: noopOverride,
        onRemoveProviderReview: noopRemove,
        onApplyBookingPatch: noopPatch,
      });
      return <div data-testid="admin-ready">{latestApi.isLiveAdmin ? 'ready' : 'loading'}</div>;
    };

    render(<Harness />);
    await waitFor(() => {
      expect(screen.getByTestId('admin-ready')).toHaveTextContent('ready');
    });

    // 1. Empty supportWhatsAppPhone is accepted and persisted as ''
    await act(async () => {
      await latestApi!.saveSystemSettings({ supportWhatsAppPhone: '', platformFeePct: 5 });
    });
    expect(setDocMock).toHaveBeenCalledWith(
      { path: 'systemSettings/global' },
      expect.objectContaining({
        platformFeePct: 5,
        minWithdrawalMad: DEFAULT_SYSTEM_SETTINGS.minWithdrawalMad,
        supportWhatsAppPhone: '',
      })
    );
    expect(onUpdateLocalSettings).toHaveBeenLastCalledWith(
      expect.objectContaining({ supportWhatsAppPhone: '', platformFeePct: 5 })
    );

    // 2. Valid Moroccan number is normalized and persisted as +212...
    setDocMock.mockClear();
    await act(async () => {
      await latestApi!.saveSystemSettings({ supportWhatsAppPhone: '06 61 23 45 67' });
    });
    expect(setDocMock).toHaveBeenCalledWith(
      { path: 'systemSettings/global' },
      expect.objectContaining({
        supportWhatsAppPhone: '+212661234567',
      })
    );

    // 3. Invalid non-empty number is rejected without writing to Firestore
    setDocMock.mockClear();
    onUpdateLocalSettings.mockClear();
    await act(async () => {
      await latestApi!.saveSystemSettings({ supportWhatsAppPhone: '+33612345678' });
    });
    expect(setDocMock).not.toHaveBeenCalled();
    expect(onUpdateLocalSettings).not.toHaveBeenCalled();
  });

  it('Footer hides WhatsApp support CTAs when supportWhatsAppUrl is empty and shows them when configured', async () => {
    const { Footer } = await import('../components/Footer');
    const { unmount } = render(
      <MemoryRouter>
        <MarketplaceContext.Provider
          value={createArabicContext({ lang: 'fr', t: TRANSLATIONS.fr, isAr: false, supportWhatsAppUrl: '' })}
        >
          <Footer />
        </MarketplaceContext.Provider>
      </MemoryRouter>
    );
    expect(screen.queryByRole('link', { name: /Support WhatsApp/i })).not.toBeInTheDocument();
    unmount();

    render(
      <MemoryRouter>
        <MarketplaceContext.Provider
          value={createArabicContext({
            lang: 'fr',
            t: TRANSLATIONS.fr,
            isAr: false,
            supportWhatsAppUrl: 'https://wa.me/212661234567?text=Bonjour',
          })}
        >
          <Footer />
        </MarketplaceContext.Provider>
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /Support WhatsApp/i })).toHaveAttribute(
      'href',
      'https://wa.me/212661234567?text=Bonjour'
    );
  });

  it('AUD-011: AuthModal requires Law 09-08 terms checkbox in signup mode before creating an account', async () => {
    const user = userEvent.setup();
    const { AuthModal } = await import('../components/AuthModal');
    const { signUpWithEmail } = await import('../firebase');
    const { hasPendingTermsAcceptedIntent, clearTermsAcceptedIntent } = await import(
      '../utils/authHelpers'
    );
    clearTermsAcceptedIntent();
    const signUpMock = vi.mocked(signUpWithEmail);
    signUpMock.mockReset();
    signUpMock.mockResolvedValue({ user: { uid: 'u-signup' } } as never);

    render(
      <AuthModal
        intent="provider"
        lang="fr"
        t={TRANSLATIONS.fr}
        onClose={vi.fn()}
        onGoogleSignIn={vi.fn().mockResolvedValue(undefined)}
        onSelectRoleIntent={vi.fn()}
        onAuthSuccess={vi.fn()}
      />
    );

    const emailInput = screen.getByLabelText('Adresse e-mail');
    const passwordInput = screen.getByLabelText('Mot de passe');
    await user.type(emailInput, 'nadia@example.ma');
    await user.type(passwordInput, 'Password123!');

    // Submit without accepting Terms -> blocked
    const submitBtn = screen.getByRole('button', { name: 'Créer mon compte' });
    await user.click(submitBtn);
    expect(signUpMock).not.toHaveBeenCalled();
    expect(screen.getByText(TRANSLATIONS.fr.termsConsentRequiredError)).toBeInTheDocument();
    expect(hasPendingTermsAcceptedIntent()).toBe(false);

    // Check consent checkbox and resubmit -> succeeds & records pending consent intent
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);
    await user.click(submitBtn);

    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalledWith('nadia@example.ma', 'Password123!', 'provider');
    });
    expect(hasPendingTermsAcceptedIntent()).toBe(true);
    clearTermsAcceptedIntent();
  });

  it('AUD-013: acceptProposalAndCreateBooking auto-rejects competing pending proposals and notifies competing providers', async () => {
    const { getDocs, runTransaction, writeBatch, setDoc } = await import('firebase/firestore');
    const { useJobPosts } = await import('../hooks/useJobPosts');

    const runTxMock = vi.mocked(runTransaction);
    const getDocsMock = vi.mocked(getDocs);
    const writeBatchMock = vi.mocked(writeBatch);
    const setDocMock = vi.mocked(setDoc);
    runTxMock.mockReset();
    getDocsMock.mockReset();
    writeBatchMock.mockReset();
    setDocMock.mockClear();

    const batchUpdate = vi.fn();
    const batchCommit = vi.fn().mockResolvedValue(undefined);
    writeBatchMock.mockReturnValue({
      update: batchUpdate,
      set: vi.fn(),
      delete: vi.fn(),
      commit: batchCommit,
    } as never);

    const mockJob = {
      id: 'job-aud13',
      jobRef: 'JOB-AUD13',
      clientId: 'client-1',
      clientName: 'Salma',
      clientPhone: '+212661234567',
      title: 'Fuite tuyau cuisine',
      category: 'Plomberie' as const,
      city: 'Casablanca' as const,
      neighborhood: 'Maârif',
      description: 'Remplacement urgent du tuyau sous évier.',
      budgetMad: 400,
      urgency: 'urgent' as const,
      preferredDate: '2026-12-15',
      preferredTimeSlot: '09:00 - 12:00' as const,
      status: 'open' as const,
      proposalCount: 3,
      createdAtIso: '2026-11-23',
    };

    const winningProposal = {
      id: 'prov-1',
      jobId: 'job-aud13',
      clientId: 'client-1',
      providerId: 'prov-1',
      providerName: 'Maâlem Karim',
      providerPhone: '+212661111111',
      providerCategory: 'Plomberie' as const,
      providerCity: 'Casablanca' as const,
      providerRating: 4.9,
      providerVerified: true,
      proposedPriceMad: 350,
      estimatedDuration: '2h',
      message: 'Intervention rapide.',
      status: 'pending' as const,
      createdAtIso: '2026-11-23',
    };

    runTxMock.mockImplementation(async (_db, updater) => {
      const tx = {
        get: vi.fn(async (ref: { path: string }) => {
          if (ref.path === 'jobPosts/job-aud13') {
            return { exists: () => true, data: () => ({ ...mockJob, status: 'open' }) };
          }
          if (ref.path === 'jobPosts/job-aud13/proposals/prov-1') {
            return { exists: () => true, data: () => ({ ...winningProposal, status: 'pending' }) };
          }
          return { exists: () => false, data: () => undefined };
        }),
        update: vi.fn(),
        set: vi.fn(),
      };
      return updater(tx as never);
    });

    const competingRef2 = { path: 'jobPosts/job-aud13/proposals/prov-2' };
    const competingRef3 = { path: 'jobPosts/job-aud13/proposals/prov-3' };
    const withdrawnRef4 = { path: 'jobPosts/job-aud13/proposals/prov-4' };
    const winnerRef1 = { path: 'jobPosts/job-aud13/proposals/prov-1' };

    getDocsMock.mockResolvedValue({
      docs: [
        { id: 'prov-1', ref: winnerRef1, data: () => ({ providerId: 'prov-1', status: 'pending' }) },
        { id: 'prov-2', ref: competingRef2, data: () => ({ providerId: 'prov-2', status: 'pending' }) },
        { id: 'prov-3', ref: competingRef3, data: () => ({ providerId: 'prov-3', status: 'pending' }) },
        { id: 'prov-4', ref: withdrawnRef4, data: () => ({ providerId: 'prov-4', status: 'withdrawn' }) },
      ],
    } as never);

    const clientUser = { uid: 'client-1', email: 'salma@test.ma', emailVerified: true } as unknown as User;
    const clientProfile: UserProfileRecord = {
      uid: 'client-1',
      role: 'client',
      fullName: 'Salma',
      phone: '+212661234567',
      city: 'Casablanca',
      neighborhood: 'Maârif',
      languagePref: 'fr',
      verifiedBadge: false,
    };

    let hookApi: ReturnType<typeof useJobPosts> | null = null;
    const Harness: React.FC = () => {
      hookApi = useJobPosts({
        firebaseUser: clientUser,
        authReady: false,
        isVerified: true,
        userProfile: clientProfile,
        ownProvider: null,
        lang: 'fr',
      });
      return <div data-testid="job-posts-ready">ready</div>;
    };

    render(<Harness />);
    expect(screen.getByTestId('job-posts-ready')).toHaveTextContent('ready');

    let bookingRef = '';
    await act(async () => {
      bookingRef = await hookApi!.acceptProposalAndCreateBooking(mockJob, winningProposal);
    });
    expect(bookingRef).toMatch(/^MK-/);

    // Only competing pending proposals (prov-2 & prov-3) are rejected in a single writeBatch
    expect(batchUpdate).toHaveBeenCalledTimes(2);
    expect(batchUpdate).toHaveBeenCalledWith(competingRef2, {
      status: 'rejected',
      updatedAt: 'SERVER_TIMESTAMP',
    });
    expect(batchUpdate).toHaveBeenCalledWith(competingRef3, {
      status: 'rejected',
      updatedAt: 'SERVER_TIMESTAMP',
    });
    expect(batchCommit).toHaveBeenCalledTimes(1);

    // Notifications dispatched: quote_accepted for prov-1 and quote_rejected for prov-2 & prov-3
    const notificationPayloads = setDocMock.mock.calls
      .filter(([ref]) => String((ref as { path?: string })?.path || '').startsWith('notifications/'))
      .map(([, data]) => data as Record<string, unknown>);
    expect(
      notificationPayloads.some((n) => n.userId === 'prov-1' && n.type === 'quote_accepted')
    ).toBe(true);
    expect(
      notificationPayloads.some((n) => n.userId === 'prov-2' && n.type === 'quote_rejected')
    ).toBe(true);
    expect(
      notificationPayloads.some((n) => n.userId === 'prov-3' && n.type === 'quote_rejected')
    ).toBe(true);
  });

  it('AUD-016: ProviderCard masks phone numbers until explicit click-to-reveal and AdminSettingsSection displays App Check status', async () => {
    const user = userEvent.setup();
    const { ProviderCard } = await import('../components/ProviderCard');
    const { AdminSettingsSection } = await import(
      '../components/admin/AdminUsersReviewsSection'
    );

    const providerWithPhone = {
      ...VETTED_PROVIDERS[0],
      phone: '+212661428910',
    };

    const { container, unmount } = render(
      <ProviderCard
        provider={providerWithPhone}
        lang="fr"
        t={TRANSLATIONS.fr}
        onViewDetails={vi.fn()}
        onBookProvider={vi.fn()}
      />
    );

    // Initial public DOM must NOT expose raw phone or tel:/wa.me links
    expect(container.innerHTML).not.toContain('+212661428910');
    expect(container.innerHTML).not.toContain('tel:');
    expect(container.innerHTML).not.toContain('https://wa.me/');

    const revealBtn = screen.getByTestId('reveal-provider-phone-btn');
    expect(revealBtn).toHaveTextContent('+212 6•• ••• •10');

    // Clicking reveal exposes direct call + WhatsApp links
    await user.click(revealBtn);
    expect(screen.queryByTestId('reveal-provider-phone-btn')).not.toBeInTheDocument();
    const callLink = screen.getByRole('link', { name: /Appeler/i });
    expect(callLink).toHaveAttribute('href', 'tel:+212661428910');
    const waLink = screen.getByRole('link', { name: /WhatsApp/i });
    expect(waLink.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/212661428910\?text=/);
    unmount();

    // Provider without a valid phone renders neither reveal button nor links
    const { unmount: unmountEmpty } = render(
      <ProviderCard
        provider={{ ...VETTED_PROVIDERS[0], phone: '' }}
        lang="fr"
        t={TRANSLATIONS.fr}
        onViewDetails={vi.fn()}
        onBookProvider={vi.fn()}
      />
    );
    expect(screen.queryByTestId('reveal-provider-phone-btn')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /WhatsApp/i })).not.toBeInTheDocument();
    unmountEmpty();

    // Admin settings displays read-only Firebase App Check readiness status
    render(
      <AdminSettingsSection
        lang="fr"
        settings={DEFAULT_SYSTEM_SETTINGS}
        onSaveSettings={vi.fn().mockResolvedValue(undefined)}
      />
    );
    expect(screen.getByTestId('admin-app-check-status')).toHaveTextContent(/Firebase App Check/i);
  });
});

