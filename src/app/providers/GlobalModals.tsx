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

import { resolveBookingActorRole } from '../../utils/bookingLogic';

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
    allProviders,
    bookings,
    setSignupRoleIntent,
    signInWithGoogle,
    handleAuthSuccess,
    createJobPost,
    submitBooking,
    submitRevisedQuote,
    respondToRevisedQuote,
    clientConfirmAndReleaseEscrow,
    cancelBookingWithReason,
    rescheduleBooking,
    submitClientReview,
    authModalIntent,
    setAuthModalIntent,
    isPostJobModalOpen,
    setIsPostJobModalOpen,
    bookingProvider,
    bookingServiceItem,
    setBookingProvider,
    openBookingModal,
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

  const isProviderRoute = location.pathname.startsWith(ROUTE_PATHS.PROVIDER_ROOT);

  const detailActorRole = syncedDetailBooking
    ? resolveBookingActorRole(syncedDetailBooking, firebaseUser?.uid, isProviderRoute)
    : 'client';

  const cancelActorRole = cancellingBooking
    ? resolveBookingActorRole(cancellingBooking, firebaseUser?.uid, isProviderRoute)
    : 'client';

  const rebookProvider = useMemo(() => {
    if (!syncedDetailBooking) return null;
    return allProviders.find((p) => p.id === syncedDetailBooking.providerId) ?? null;
  }, [syncedDetailBooking, allProviders]);

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
          initialService={bookingServiceItem}
          cmiEscrowEnabled={systemSettings.cmiEscrowEnabled}
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
          activeRole={detailActorRole}
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
          onSubmitRevisedQuote={submitRevisedQuote}
          onRespondToRevisedQuote={respondToRevisedQuote}
          onRebookProvider={
            rebookProvider && detailActorRole === 'client'
              ? () => {
                  setDetailBooking(null);
                  openBookingModal(rebookProvider, null);
                }
              : undefined
          }
        />
      )}

      {cancellingBooking && (
        <CancellationModal
          booking={cancellingBooking}
          lang={lang}
          t={t}
          actorRole={cancelActorRole}
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
