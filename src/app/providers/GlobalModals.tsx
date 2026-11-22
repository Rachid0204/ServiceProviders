import React, { useMemo, lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { useMarketplace } from './MarketplaceContext';
import { ROUTE_PATHS } from '../routePaths';

const PostJobModal = lazy(() =>
  import('../../components/PostJobModal').then((m) => ({ default: m.PostJobModal }))
);
const AuthModal = lazy(() =>
  import('../../components/AuthModal').then((m) => ({ default: m.AuthModal }))
);
const BookingModal = lazy(() =>
  import('../../components/BookingModal').then((m) => ({ default: m.BookingModal }))
);
const ProviderDetailModal = lazy(() =>
  import('../../components/ProviderDetailModal').then((m) => ({ default: m.ProviderDetailModal }))
);
const ChatDrawerModal = lazy(() =>
  import('../../components/ChatDrawerModal').then((m) => ({ default: m.ChatDrawerModal }))
);
const ReviewModal = lazy(() =>
  import('../../components/ReviewModal').then((m) => ({ default: m.ReviewModal }))
);
const BookingDetailModal = lazy(() =>
  import('../../components/BookingLifecycleModals').then((m) => ({
    default: m.BookingDetailModal,
  }))
);
const CancellationModal = lazy(() =>
  import('../../components/BookingLifecycleModals').then((m) => ({
    default: m.CancellationModal,
  }))
);
const RescheduleModal = lazy(() =>
  import('../../components/BookingLifecycleModals').then((m) => ({ default: m.RescheduleModal }))
);

export const GlobalModals: React.FC = () => {
  const location = useLocation();
  const {
    lang,
    t,
    firebaseUser,
    isVerified,
    userProfile,
    systemSettings,
    allProviders,
    bookings,
    chatThreads,
    setSignupRoleIntent,
    signInWithGoogle,
    handleAuthSuccess,
    createJobPost,
    submitBooking,
    clientConfirmAndReleaseEscrow,
    cancelBookingWithReason,
    rescheduleBooking,
    submitClientReview,
    sendLocalChatMessage,
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
  } = useMarketplace();

  const syncedDetailBooking = useMemo(
    () => (detailBooking ? bookings.find((b) => b.id === detailBooking.id) || detailBooking : null),
    [bookings, detailBooking]
  );

  const syncedDetailProvider = useMemo(
    () =>
      detailProvider
        ? allProviders.find((p) => p.id === detailProvider.id) || detailProvider
        : null,
    [allProviders, detailProvider]
  );

  const activeModalRole: 'client' | 'provider' = location.pathname.startsWith(
    ROUTE_PATHS.PROVIDER_ROOT
  )
    ? 'provider'
    : 'client';

  return (
    <Suspense fallback={null}>
      {authModalIntent && (
        <AuthModal
          lang={lang}
          t={t}
          intent={authModalIntent}
          onSelectRoleIntent={setSignupRoleIntent}
          onGoogleSignIn={async () => {
            await signInWithGoogle();
          }}
          onAuthSuccess={(role, isNewEmailSignup) => {
            handleAuthSuccess(role, isNewEmailSignup);
          }}
          onClose={() => setAuthModalIntent(null)}
        />
      )}

      {isPostJobModalOpen && firebaseUser && isVerified && (
        <PostJobModal
          lang={lang}
          t={t}
          firebaseUser={firebaseUser}
          userProfile={userProfile}
          onCreateJobPost={createJobPost}
          onClose={() => setIsPostJobModalOpen(false)}
        />
      )}

      {syncedDetailProvider && (
        <ProviderDetailModal
          provider={syncedDetailProvider}
          lang={lang}
          t={t}
          onClose={() => setDetailProvider(null)}
          onBookProvider={setBookingProvider}
        />
      )}

      {bookingProvider && (
        <BookingModal
          provider={bookingProvider}
          lang={lang}
          t={t}
          firebaseUser={firebaseUser}
          currentProfile={userProfile}
          onGoogleSignIn={async () => {
            await signInWithGoogle();
          }}
          onOpenAuthModal={() => setAuthModalIntent('client')}
          onClose={() => setBookingProvider(null)}
          onSubmitBooking={submitBooking}
        />
      )}

      {syncedDetailBooking && (
        <BookingDetailModal
          booking={syncedDetailBooking}
          lang={lang}
          t={t}
          activeRole={activeModalRole}
          platformFeePct={systemSettings.platformFeePct}
          onClose={() => setDetailBooking(null)}
          onOpenChat={setActiveChatBooking}
          onOpenReschedule={setReschedulingBooking}
          onOpenCancel={setCancellingBooking}
          onOpenReview={setReviewingBooking}
          onConfirmAndReleaseEscrow={clientConfirmAndReleaseEscrow}
        />
      )}

      {cancellingBooking && (
        <CancellationModal
          booking={cancellingBooking}
          lang={lang}
          t={t}
          actorRole={activeModalRole}
          onClose={() => setCancellingBooking(null)}
          onConfirmCancel={cancelBookingWithReason}
        />
      )}

      {reschedulingBooking && (
        <RescheduleModal
          booking={reschedulingBooking}
          lang={lang}
          t={t}
          onClose={() => setReschedulingBooking(null)}
          onConfirmReschedule={rescheduleBooking}
        />
      )}

      {activeChatBooking && (
        <ChatDrawerModal
          booking={activeChatBooking}
          relatedBookings={bookings}
          onSwitchBooking={setActiveChatBooking}
          lang={lang}
          t={t}
          firebaseUser={firebaseUser}
          activeRole={activeModalRole}
          activeUserName={
            userProfile?.fullName ||
            (activeModalRole === 'provider'
              ? activeChatBooking.providerName
              : activeChatBooking.clientName)
          }
          localMessages={chatThreads[activeChatBooking.id] || []}
          onSendLocalMessage={sendLocalChatMessage}
          onClose={() => setActiveChatBooking(null)}
        />
      )}

      {reviewingBooking && (
        <ReviewModal
          booking={reviewingBooking}
          lang={lang}
          t={t}
          onClose={() => setReviewingBooking(null)}
          onSubmitReview={submitClientReview}
        />
      )}
    </Suspense>
  );
};
