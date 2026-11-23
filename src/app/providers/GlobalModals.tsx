import React, { useMemo, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMarketplace } from './MarketplaceContext';
import { buildMessageThreadPath, ROUTE_PATHS } from '../routePaths';

const PostJobModal = lazy(() =>
  import('../../components/PostJobModal').then((m) => ({ default: m.PostJobModal }))
);
const AuthModal = lazy(() =>
  import('../../components/AuthModal').then((m) => ({ default: m.AuthModal }))
);
const BookingModal = lazy(() =>
  import('../../components/BookingModal').then((m) => ({ default: m.BookingModal }))
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
  const navigate = useNavigate();
  const {
    lang,
    t,
    firebaseUser,
    isVerified,
    userProfile,
    systemSettings,
    bookings,
    setSignupRoleIntent,
    signInWithGoogle,
    handleAuthSuccess,
    createJobPost,
    submitBooking,
    clientConfirmAndReleaseEscrow,
    cancelBookingWithReason,
    rescheduleBooking,
    submitClientReview,
    authModalIntent,
    setAuthModalIntent,
    isPostJobModalOpen,
    setIsPostJobModalOpen,
    bookingProvider,
    setBookingProvider,
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
          onOpenChat={(b) => {
            setDetailBooking(null);
            navigate(buildMessageThreadPath(b.id));
          }}
          onOpenReschedule={setReschedulingBooking}
          onOpenCancel={setCancellingBooking}
          onOpenReview={setReviewingBooking}
          onOpenDispute={(b) => {
            setDetailBooking(null);
            navigate(`${ROUTE_PATHS.DISPUTES}?bookingId=${encodeURIComponent(b.id)}`);
          }}
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

      {reviewingBooking && (
        <ReviewModal
          booking={reviewingBooking}
          lang={lang}
          t={t}
          userId={firebaseUser?.uid ?? null}
          onClose={() => setReviewingBooking(null)}
          onSubmitReview={submitClientReview}
        />
      )}
    </Suspense>
  );
};
