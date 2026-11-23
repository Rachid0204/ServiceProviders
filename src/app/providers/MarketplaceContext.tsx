import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { TRANSLATIONS, type Translations } from '../../i18n/translations';
import {
  buildWhatsAppUrl,
  type BookingRecord,
  type ChatMessageRecord,
  type LanguageCode,
  type UserProfileRecord,
  type UserRole,
  type VettedProvider,
} from '../../utils/marketplace';
import { canExploreMarketplace, getDefaultDashboardForRole } from '../../utils/authHelpers';
import { useMarketplaceAuth } from '../../hooks/useMarketplaceAuth';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import { useAdminAccess } from '../../hooks/useAdminAccess';
import { useProviders } from '../../hooks/useProviders';
import { useBookings } from '../../hooks/useBookings';
import { useJobPosts } from '../../hooks/useJobPosts';
import { useFavorites } from '../../hooks/useFavorites';
import { useNotifications } from '../../hooks/useNotifications';
import { useConversations } from '../../hooks/useConversations';
import { useDisputes } from '../../hooks/useDisputes';
import { ROUTE_PATHS } from '../routePaths';
import type { SystemSettingsRecord } from '../../utils/systemSettings';

export interface MarketplaceContextValue {
  // Localization
  lang: LanguageCode;
  t: Translations;
  isAr: boolean;
  setLang: (next: LanguageCode) => void;
  toggleLanguage: () => void;

  // Auth & Role State
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
  refreshVerificationStatus: () => Promise<boolean>;
  signInWithGoogle: () => Promise<unknown>;
  signOutUser: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  handleSaveProfile: ReturnType<typeof useMarketplaceAuth>['handleSaveProfile'];
  saveFullProviderCard: ReturnType<typeof useMarketplaceAuth>['saveFullProviderCard'];

  // System & Marketplace Data
  systemSettings: SystemSettingsRecord;
  updateLocalSettings: (next: SystemSettingsRecord) => void;
  supportWhatsAppUrl: string;
  allProviders: VettedProvider[];
  firestoreProviders: VettedProvider[];
  ownProvider: VettedProvider | null;
  favoriteProviderIds: string[];
  toggleFavoriteProvider: (providerId: string) => Promise<void>;
  toggleProviderAvailability: ReturnType<typeof useProviders>['toggleProviderAvailability'];
  applyAdminProviderOverride: ReturnType<typeof useProviders>['applyAdminProviderOverride'];
  removeProviderReview: ReturnType<typeof useProviders>['removeProviderReview'];

  // Bookings & Chat
  bookings: BookingRecord[];
  chatThreads: Record<string, ChatMessageRecord[]>;
  bookingActionError: string | null;
  clearBookingActionError: () => void;
  submitBooking: ReturnType<typeof useBookings>['submitBooking'];
  updateBookingStatus: ReturnType<typeof useBookings>['updateBookingStatus'];
  clientConfirmAndReleaseEscrow: ReturnType<typeof useBookings>['clientConfirmAndReleaseEscrow'];
  cancelBookingWithReason: ReturnType<typeof useBookings>['cancelBookingWithReason'];
  rescheduleBooking: ReturnType<typeof useBookings>['rescheduleBooking'];
  submitClientReview: ReturnType<typeof useBookings>['submitClientReview'];
  applyAdminBookingPatch: ReturnType<typeof useBookings>['applyAdminBookingPatch'];
  sendLocalChatMessage: ReturnType<typeof useBookings>['sendLocalChatMessage'];

  // Open Client Job Board & Proposals
  openJobPosts: ReturnType<typeof useJobPosts>['openJobPosts'];
  myClientJobPosts: ReturnType<typeof useJobPosts>['myClientJobPosts'];
  myProposalsByJobId: ReturnType<typeof useJobPosts>['myProposalsByJobId'];
  jobActionError: string | null;
  clearJobActionError: () => void;
  createJobPost: ReturnType<typeof useJobPosts>['createJobPost'];
  cancelJobPost: ReturnType<typeof useJobPosts>['cancelJobPost'];
  submitJobProposal: ReturnType<typeof useJobPosts>['submitJobProposal'];
  withdrawJobProposal: ReturnType<typeof useJobPosts>['withdrawJobProposal'];
  rejectJobProposal: ReturnType<typeof useJobPosts>['rejectJobProposal'];
  acceptProposalAndCreateBooking: ReturnType<typeof useJobPosts>['acceptProposalAndCreateBooking'];

  // Badge Counts
  clientActiveCount: number;
  providerPendingCount: number;
  openJobsCount: number;

  // Phase 4: Notifications & Messaging Inbox
  notifications: ReturnType<typeof useNotifications>['notifications'];
  unreadNotificationCount: number;
  notificationPreferences: ReturnType<typeof useNotifications>['notificationPreferences'];
  markNotificationRead: ReturnType<typeof useNotifications>['markNotificationRead'];
  markAllNotificationsRead: ReturnType<typeof useNotifications>['markAllNotificationsRead'];
  deleteNotification: ReturnType<typeof useNotifications>['deleteNotification'];
  saveNotificationPreferences: ReturnType<typeof useNotifications>['saveNotificationPreferences'];
  conversationsByBookingId: ReturnType<typeof useConversations>['conversationsByBookingId'];
  unreadConversationsCount: number;
  markConversationRead: ReturnType<typeof useConversations>['markConversationRead'];
  updateConversationOnMessage: ReturnType<typeof useConversations>['updateConversationOnMessage'];
  toggleBlockConversation: ReturnType<typeof useConversations>['toggleBlockConversation'];
  submitChatReport: ReturnType<typeof useConversations>['submitChatReport'];

  // Phase 5: Structured Disputes
  disputes: ReturnType<typeof useDisputes>['disputes'];
  openDisputesCount: number;
  openDispute: ReturnType<typeof useDisputes>['openDispute'];

  // Global Modal Controls
  authModalIntent: UserRole | null;
  setAuthModalIntent: (intent: UserRole | null) => void;
  isPostJobModalOpen: boolean;
  setIsPostJobModalOpen: (open: boolean) => void;
  detailProvider: VettedProvider | null;
  setDetailProvider: (p: VettedProvider | null) => void;
  bookingProvider: VettedProvider | null;
  setBookingProvider: (p: VettedProvider | null) => void;
  activeChatBooking: BookingRecord | null;
  setActiveChatBooking: (b: BookingRecord | null) => void;
  detailBooking: BookingRecord | null;
  setDetailBooking: (b: BookingRecord | null) => void;
  cancellingBooking: BookingRecord | null;
  setCancellingBooking: (b: BookingRecord | null) => void;
  reschedulingBooking: BookingRecord | null;
  setReschedulingBooking: (b: BookingRecord | null) => void;
  reviewingBooking: BookingRecord | null;
  setReviewingBooking: (b: BookingRecord | null) => void;

  // Shared auth completion handlers
  handleAuthSuccess: (role: UserRole, isNewEmailSignup?: boolean, redirectTo?: string) => void;
  handleEmailVerifiedRedirect: () => void;
}

export const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

export function useMarketplace(): MarketplaceContextValue {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) {
    throw new Error('useMarketplace must be used inside MarketplaceProvider');
  }
  return ctx;
}

export const MarketplaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [lang, setLang] = useState<LanguageCode>('fr');
  const t = TRANSLATIONS[lang];
  const isAr = lang === 'ar';

  // Synchronize document direction and lang attribute for FR (LTR) / AR (RTL)
  useEffect(() => {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const handleLanguageSync = useCallback((nextLang: LanguageCode) => {
    setLang(nextLang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLang((prev) => (prev === 'fr' ? 'ar' : 'fr'));
  }, []);

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
  } = useMarketplaceAuth(handleLanguageSync);

  const { systemSettings, updateLocalSettings } = useSystemSettings(firebaseUser, authReady);
  const { hasAdminAccess, isCheckingAdmin } = useAdminAccess(firebaseUser, authReady);

  const {
    allProviders,
    firestoreProviders,
    toggleProviderAvailability,
    applyLocalReviewOverride,
    applyAdminProviderOverride,
    removeProviderReview,
  } = useProviders(firebaseUser, userProfile, t);

  const {
    bookings,
    chatThreads,
    bookingActionError,
    clearBookingActionError,
    submitBooking,
    updateBookingStatus,
    clientConfirmAndReleaseEscrow,
    cancelBookingWithReason,
    rescheduleBooking,
    submitClientReview,
    applyAdminBookingPatch,
    sendLocalChatMessage,
  } = useBookings({
    firebaseUser,
    authReady,
    userProfile,
    onBootstrapUserProfile: hydrateUserProfile,
    lang,
    allProviders,
    platformFeePct: systemSettings.platformFeePct,
    autoRefundOnProviderCancel: systemSettings.autoRefundOnProviderCancel,
    onApplyReviewOverride: applyLocalReviewOverride,
  });

  const ownProvider = useMemo(
    () => (firebaseUser ? allProviders.find((p) => p.uid === firebaseUser.uid) ?? null : null),
    [firebaseUser, allProviders]
  );

  const {
    openJobPosts,
    myClientJobPosts,
    myProposalsByJobId,
    jobActionError,
    clearJobActionError,
    createJobPost,
    cancelJobPost,
    submitJobProposal,
    withdrawJobProposal,
    rejectJobProposal,
    acceptProposalAndCreateBooking,
  } = useJobPosts({
    firebaseUser,
    authReady,
    isVerified,
    userProfile,
    ownProvider,
    lang,
    onBootstrapUserProfile: hydrateUserProfile,
  });

  const { favoriteProviderIds, toggleFavoriteProvider } = useFavorites(
    firebaseUser,
    authReady,
    isVerified
  );

  const {
    notifications,
    unreadNotificationCount,
    notificationPreferences,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    saveNotificationPreferences,
  } = useNotifications(firebaseUser, authReady, isVerified);

  const {
    conversationsByBookingId,
    unreadConversationsCount,
    markConversationRead,
    updateConversationOnMessage,
    toggleBlockConversation,
    submitChatReport,
  } = useConversations(firebaseUser, authReady, isVerified);

  const { disputes, openDisputesCount, openDispute } = useDisputes(
    firebaseUser,
    authReady,
    isVerified,
    lang
  );

  const effectiveRole: UserRole | null = userProfile?.role ?? signupRoleIntent ?? null;
  const isPureProvider = Boolean(firebaseUser && effectiveRole === 'provider');
  const canExplore = !firebaseUser || canExploreMarketplace(effectiveRole);
  const mustVerifyEmail = Boolean(authReady && firebaseUser && !isVerified);

  // Global modal state
  const [authModalIntent, setAuthModalIntent] = useState<UserRole | null>(null);
  const [isPostJobModalOpen, setIsPostJobModalOpen] = useState(false);
  const [detailProvider, setDetailProvider] = useState<VettedProvider | null>(null);
  const [bookingProvider, setBookingProvider] = useState<VettedProvider | null>(null);
  const [activeChatBooking, setActiveChatBooking] = useState<BookingRecord | null>(null);
  const [detailBooking, setDetailBooking] = useState<BookingRecord | null>(null);
  const [cancellingBooking, setCancellingBooking] = useState<BookingRecord | null>(null);
  const [reschedulingBooking, setReschedulingBooking] = useState<BookingRecord | null>(null);
  const [reviewingBooking, setReviewingBooking] = useState<BookingRecord | null>(null);

  // Wipe user-scoped modals on sign-out or account switch to prevent stale PII display
  useEffect(() => {
    setIsPostJobModalOpen(false);
    setBookingProvider(null);
    setActiveChatBooking(null);
    setDetailBooking(null);
    setCancellingBooking(null);
    setReschedulingBooking(null);
    setReviewingBooking(null);
  }, [firebaseUser?.uid]);

  // Auto-redirect verified users arriving via email verification (?verified=1) or pure Maâlem landing on '/'
  const redirectedUidRef = useRef<string | null>(null);
  useEffect(() => {
    if (!authReady || !firebaseUser) {
      redirectedUidRef.current = null;
      return;
    }

    if (!isVerified) {
      if (location.pathname !== ROUTE_PATHS.VERIFY_EMAIL) {
        navigate(ROUTE_PATHS.VERIFY_EMAIL, { replace: true });
      }
      return;
    }

    if (!profileLoaded) return;

    const targetDashboard = getDefaultDashboardForRole(userProfile?.role, signupRoleIntent);
    const targetPath =
      targetDashboard === 'provider'
        ? ownProvider
          ? ROUTE_PATHS.PROVIDER_DASHBOARD
          : ROUTE_PATHS.PROVIDER_CARD
        : ROUTE_PATHS.CUSTOMER_DASHBOARD;

    const returnedFromVerification = location.search.includes('verified=1');
    if (
      returnedFromVerification ||
      location.pathname === ROUTE_PATHS.VERIFY_EMAIL ||
      (redirectedUidRef.current !== firebaseUser.uid &&
        (location.pathname === ROUTE_PATHS.HOME ||
          location.pathname === ROUTE_PATHS.LOGIN ||
          location.pathname === ROUTE_PATHS.REGISTER))
    ) {
      redirectedUidRef.current = firebaseUser.uid;
      navigate(targetPath, { replace: true });
    }
  }, [
    authReady,
    firebaseUser,
    isVerified,
    profileLoaded,
    userProfile?.role,
    signupRoleIntent,
    ownProvider,
    location.pathname,
    location.search,
    navigate,
  ]);

  const handleAuthSuccess = useCallback(
    (role: UserRole, isNewEmailSignup?: boolean, redirectTo?: string) => {
      if (isNewEmailSignup) {
        navigate(ROUTE_PATHS.VERIFY_EMAIL, { replace: true });
        return;
      }
      if (redirectTo) {
        navigate(redirectTo, { replace: true });
        return;
      }
      const target = getDefaultDashboardForRole(userProfile?.role, role);
      if (target === 'provider') {
        navigate(ownProvider ? ROUTE_PATHS.PROVIDER_DASHBOARD : ROUTE_PATHS.PROVIDER_CARD, {
          replace: true,
        });
      } else {
        navigate(ROUTE_PATHS.CUSTOMER_DASHBOARD, { replace: true });
      }
    },
    [navigate, userProfile?.role, ownProvider]
  );

  const handleEmailVerifiedRedirect = useCallback(() => {
    const target = getDefaultDashboardForRole(userProfile?.role, signupRoleIntent);
    if (target === 'provider') {
      navigate(ownProvider ? ROUTE_PATHS.PROVIDER_DASHBOARD : ROUTE_PATHS.PROVIDER_CARD, {
        replace: true,
      });
    } else {
      navigate(ROUTE_PATHS.CUSTOMER_DASHBOARD, { replace: true });
    }
  }, [navigate, userProfile?.role, signupRoleIntent, ownProvider]);

  const clientActiveCount = useMemo(() => {
    if (!firebaseUser) return 0;
    return bookings.filter(
      (b) =>
        b.clientId === firebaseUser.uid &&
        (b.status === 'pending' || b.status === 'accepted' || b.status === 'in_progress')
    ).length;
  }, [firebaseUser, bookings]);

  const providerPendingCount = useMemo(() => {
    if (!firebaseUser) return 0;
    return bookings.filter(
      (b) => b.providerId === firebaseUser.uid && b.status === 'pending'
    ).length;
  }, [firebaseUser, bookings]);

  const openJobsCount = useMemo(() => {
    if (!firebaseUser) return 0;
    return openJobPosts.filter((j) => j.clientId !== firebaseUser.uid).length;
  }, [firebaseUser, openJobPosts]);

  const supportWhatsAppUrl = useMemo(
    () =>
      buildWhatsAppUrl({
        phone: systemSettings.supportWhatsAppPhone || '+212661428910',
        lang,
        providerName: isAr ? 'مول الخدمة' : "Moul L'Khedma",
        category: isAr ? 'خدمة منزلية' : 'Service à domicile',
      }),
    [systemSettings.supportWhatsAppPhone, lang, isAr]
  );

  const value = useMemo<MarketplaceContextValue>(
    () => ({
      lang,
      t,
      isAr,
      setLang,
      toggleLanguage,
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
      refreshVerificationStatus,
      signInWithGoogle,
      signOutUser,
      deleteAccount,
      handleSaveProfile,
      saveFullProviderCard,
      systemSettings,
      updateLocalSettings,
      supportWhatsAppUrl,
      allProviders,
      firestoreProviders,
      ownProvider,
      favoriteProviderIds,
      toggleFavoriteProvider,
      toggleProviderAvailability,
      applyAdminProviderOverride,
      removeProviderReview,
      bookings,
      chatThreads,
      bookingActionError,
      clearBookingActionError,
      submitBooking,
      updateBookingStatus,
      clientConfirmAndReleaseEscrow,
      cancelBookingWithReason,
      rescheduleBooking,
      submitClientReview,
      applyAdminBookingPatch,
      sendLocalChatMessage,
      openJobPosts,
      myClientJobPosts,
      myProposalsByJobId,
      jobActionError,
      clearJobActionError,
      createJobPost,
      cancelJobPost,
      submitJobProposal,
      withdrawJobProposal,
      rejectJobProposal,
      acceptProposalAndCreateBooking,
      clientActiveCount,
      providerPendingCount,
      openJobsCount,
      notifications,
      unreadNotificationCount,
      notificationPreferences,
      markNotificationRead,
      markAllNotificationsRead,
      deleteNotification,
      saveNotificationPreferences,
      conversationsByBookingId,
      unreadConversationsCount,
      markConversationRead,
      updateConversationOnMessage,
      toggleBlockConversation,
      submitChatReport,
      disputes,
      openDisputesCount,
      openDispute,
      authModalIntent,
      setAuthModalIntent,
      isPostJobModalOpen,
      setIsPostJobModalOpen,
      detailProvider,
      setDetailProvider,
      bookingProvider,
      setBookingProvider,
      activeChatBooking,
      setActiveChatBooking,
      detailBooking,
      setDetailBooking,
      cancellingBooking,
      setCancellingBooking,
      reschedulingBooking,
      setReschedulingBooking,
      reviewingBooking,
      setReviewingBooking,
      handleAuthSuccess,
      handleEmailVerifiedRedirect,
    }),
    [
      lang,
      t,
      isAr,
      toggleLanguage,
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
      refreshVerificationStatus,
      signInWithGoogle,
      signOutUser,
      deleteAccount,
      handleSaveProfile,
      saveFullProviderCard,
      systemSettings,
      updateLocalSettings,
      supportWhatsAppUrl,
      allProviders,
      firestoreProviders,
      ownProvider,
      favoriteProviderIds,
      toggleFavoriteProvider,
      toggleProviderAvailability,
      applyAdminProviderOverride,
      removeProviderReview,
      bookings,
      chatThreads,
      bookingActionError,
      clearBookingActionError,
      submitBooking,
      updateBookingStatus,
      clientConfirmAndReleaseEscrow,
      cancelBookingWithReason,
      rescheduleBooking,
      submitClientReview,
      applyAdminBookingPatch,
      sendLocalChatMessage,
      openJobPosts,
      myClientJobPosts,
      myProposalsByJobId,
      jobActionError,
      clearJobActionError,
      createJobPost,
      cancelJobPost,
      submitJobProposal,
      withdrawJobProposal,
      rejectJobProposal,
      acceptProposalAndCreateBooking,
      clientActiveCount,
      providerPendingCount,
      openJobsCount,
      notifications,
      unreadNotificationCount,
      notificationPreferences,
      markNotificationRead,
      markAllNotificationsRead,
      deleteNotification,
      saveNotificationPreferences,
      conversationsByBookingId,
      unreadConversationsCount,
      markConversationRead,
      updateConversationOnMessage,
      toggleBlockConversation,
      submitChatReport,
      disputes,
      openDisputesCount,
      openDispute,
      authModalIntent,
      isPostJobModalOpen,
      detailProvider,
      bookingProvider,
      activeChatBooking,
      detailBooking,
      cancellingBooking,
      reschedulingBooking,
      reviewingBooking,
      handleAuthSuccess,
      handleEmailVerifiedRedirect,
    ]
  );

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
};
