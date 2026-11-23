import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  limit,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  runTransaction,
  serverTimestamp,
  type DocumentData,
  type Timestamp,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, reportFirestoreError, OperationType } from '../firebase';
import {
  calculateEscrowSplit,
  canTransitionBookingStatus,
  computeCancellationSettlement,
  generateBookingIds,
  getNextPaymentStatus,
  isSafeImageUrl,
  recalculateProviderRating,
  type BookingRecord,
  type BookingStatus,
  type ChatMessageRecord,
  type LanguageCode,
  type MoroccanCity,
  type PaymentMethod,
  type PaymentStatus,
  type ReviewCategoryBreakdown,
  type ServiceCategory,
  type TimeSlot,
  type UserProfileRecord,
  type UserRole,
  type VettedProvider,
} from '../utils/marketplace';
import { buildBootstrapClientProfile, isVerifiedAuthUser } from '../utils/authHelpers';
import { dispatchUserNotification } from './useNotifications';

function mapFirestoreBooking(id: string, data: DocumentData): BookingRecord {
  let createdAtIso = new Date().toISOString().slice(0, 10);
  if (data.createdAt && typeof data.createdAt === 'object' && 'toDate' in data.createdAt) {
    try {
      createdAtIso = (data.createdAt as Timestamp).toDate().toISOString().slice(0, 10);
    } catch {
      // Keep default ISO date
    }
  }
  const paymentMethod: PaymentMethod =
    data.paymentMethod === 'cmi_escrow' ? 'cmi_escrow' : 'cash_on_completion';
  const paymentStatus: PaymentStatus =
    data.paymentStatus === 'paid' ||
    data.paymentStatus === 'escrow_held' ||
    data.paymentStatus === 'unpaid_cod' ||
    data.paymentStatus === 'refunded' ||
    data.paymentStatus === 'disputed_split'
      ? data.paymentStatus
      : paymentMethod === 'cmi_escrow'
      ? 'escrow_held'
      : 'unpaid_cod';

  return {
    id,
    bookingRef: String(data.bookingRef || id.slice(0, 8).toUpperCase()),
    clientId: String(data.clientId),
    clientName: String(data.clientName),
    clientPhone: String(data.clientPhone),
    providerId: String(data.providerId),
    providerName: String(data.providerName),
    providerPhone: String(data.providerPhone || '+212661428910'),
    category: data.category as ServiceCategory,
    serviceType: String(data.serviceType || data.category),
    city: data.city as MoroccanCity,
    neighborhood: String(data.neighborhood),
    addressPin: String(data.addressPin || data.neighborhood),
    description: String(data.description),
    problemPhotoUrl:
      typeof data.problemPhotoUrl === 'string' && isSafeImageUrl(data.problemPhotoUrl)
        ? data.problemPhotoUrl
        : undefined,
    preferredDate: String(data.preferredDate),
    preferredTimeSlot: (data.preferredTimeSlot as TimeSlot) || '09:00 - 12:00',
    paymentMethod,
    paymentStatus,
    estimatedMad: Number(data.estimatedMad),
    providerPayoutMad:
      typeof data.providerPayoutMad === 'number' ? data.providerPayoutMad : undefined,
    platformFeeMad:
      typeof data.platformFeeMad === 'number' ? data.platformFeeMad : undefined,
    refundedClientMad:
      typeof data.refundedClientMad === 'number' ? data.refundedClientMad : undefined,
    status: (data.status as BookingStatus) || 'pending',
    cancellationReason: data.cancellationReason ? String(data.cancellationReason) : undefined,
    cancelledBy:
      data.cancelledBy === 'client' ||
      data.cancelledBy === 'provider' ||
      data.cancelledBy === 'admin'
        ? data.cancelledBy
        : undefined,
    rescheduleNote: data.rescheduleNote ? String(data.rescheduleNote) : undefined,
    reviewRating: data.reviewRating ? Number(data.reviewRating) : undefined,
    reviewComment: data.reviewComment ? String(data.reviewComment) : undefined,
    createdAtIso,
  };
}

export interface SubmitBookingPayload {
  bookingId?: string;
  bookingRef?: string;
  provider: VettedProvider;
  clientName: string;
  clientPhone: string;
  serviceType: string;
  neighborhood: string;
  addressPin: string;
  description: string;
  problemPhotoUrl?: string;
  preferredDate: string;
  preferredTimeSlot: TimeSlot;
  paymentMethod: PaymentMethod;
  estimatedMad: number;
}

export type AdminBookingPatch = Partial<
  Pick<
    BookingRecord,
    | 'status'
    | 'paymentStatus'
    | 'providerPayoutMad'
    | 'platformFeeMad'
    | 'refundedClientMad'
    | 'cancellationReason'
    | 'cancelledBy'
  >
>;

export function useBookings(params: {
  firebaseUser: User | null;
  authReady: boolean;
  userProfile: UserProfileRecord | null;
  onBootstrapUserProfile?: (profile: UserProfileRecord) => void;
  lang: LanguageCode;
  allProviders: VettedProvider[];
  platformFeePct: number;
  autoRefundOnProviderCancel: boolean;
  onApplyReviewOverride: (
    providerId: string,
    update: {
      ratingAvg: number;
      reviewCount: number;
      review: VettedProvider['reviews'][number];
    }
  ) => void;
}) {
  const {
    firebaseUser,
    authReady,
    userProfile,
    onBootstrapUserProfile,
    lang,
    allProviders,
    platformFeePct,
    autoRefundOnProviderCancel,
    onApplyReviewOverride,
  } = params;

  const [clientLiveBookings, setClientLiveBookings] = useState<BookingRecord[]>([]);
  const [providerLiveBookings, setProviderLiveBookings] = useState<BookingRecord[]>([]);
  const [adminOverrides, setAdminOverrides] = useState<Record<string, AdminBookingPatch>>({});
  const [chatThreads, setChatThreads] = useState<Record<string, ChatMessageRecord[]>>({});
  const [bookingActionError, setBookingActionError] = useState<string | null>(null);

  // Dual real-time Firestore listeners: clientId == uid AND providerId == uid (strictly scoped to signed-in user)
  useEffect(() => {
    if (!authReady || !firebaseUser || !isVerifiedAuthUser(firebaseUser)) {
      setClientLiveBookings([]);
      setProviderLiveBookings([]);
      setChatThreads({});
      return;
    }

    const bookingsPath = 'bookings';
    const clientQuery = query(
      collection(db, bookingsPath),
      where('clientId', '==', firebaseUser.uid),
      limit(100)
    );
    const providerQuery = query(
      collection(db, bookingsPath),
      where('providerId', '==', firebaseUser.uid),
      limit(100)
    );

    const unsubClient = onSnapshot(
      clientQuery,
      (snapshot) => {
        setClientLiveBookings(snapshot.docs.map((d) => mapFirestoreBooking(d.id, d.data())));
      },
      (err) => {
        reportFirestoreError(err, OperationType.LIST, bookingsPath);
      }
    );

    const unsubProvider = onSnapshot(
      providerQuery,
      (snapshot) => {
        setProviderLiveBookings(snapshot.docs.map((d) => mapFirestoreBooking(d.id, d.data())));
      },
      (err) => {
        reportFirestoreError(err, OperationType.LIST, bookingsPath);
      }
    );

    return () => {
      unsubClient();
      unsubProvider();
    };
  }, [authReady, firebaseUser]);

  // Signed-out users see zero bookings; authenticated users strictly see their own live Firestore bookings
  const bookings = useMemo(() => {
    if (!firebaseUser) return [];
    const byId = new Map<string, BookingRecord>();
    clientLiveBookings.forEach((b) => byId.set(b.id, b));
    providerLiveBookings.forEach((b) => byId.set(b.id, b));
    return Array.from(byId.values())
      .map((b) => (adminOverrides[b.id] ? { ...b, ...adminOverrides[b.id] } : b))
      .sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
  }, [firebaseUser, clientLiveBookings, providerLiveBookings, adminOverrides]);

  const submitBooking = async (payload: SubmitBookingPayload): Promise<string> => {
    setBookingActionError(null);
    if (!firebaseUser) {
      throw new Error(
        lang === 'ar'
          ? 'يرجى تسجيل الدخول أولاً لإرسال طلب حجز.'
          : 'Veuillez vous connecter pour envoyer une demande de réservation.'
      );
    }
    if (!isVerifiedAuthUser(firebaseUser)) {
      throw new Error(
        lang === 'ar'
          ? 'يرجى تأكيد بريدك الإلكتروني أولاً قبل إرسال طلب حجز.'
          : 'Veuillez vérifier votre adresse e-mail avant d’envoyer une réservation.'
      );
    }
    if (payload.provider.id === firebaseUser.uid) {
      throw new Error(
        lang === 'ar'
          ? 'لا يمكنك حجز خدمتك الخاصة.'
          : 'Vous ne pouvez pas réserver votre propre profil Maâlem.'
      );
    }

    const generated = generateBookingIds();
    const bookingId = payload.bookingId || generated.bookingId;
    const bookingRef = payload.bookingRef || generated.bookingRef;
    const providerDisplayName =
      lang === 'ar' ? payload.provider.fullNameAr : payload.provider.fullNameFr;
    const paymentStatus: PaymentStatus =
      payload.paymentMethod === 'cmi_escrow' ? 'escrow_held' : 'unpaid_cod';

    const safePhotoUrl = isSafeImageUrl(payload.problemPhotoUrl)
      ? payload.problemPhotoUrl
      : undefined;

    const path = `bookings/${bookingId}`;
    const bookingPayload = {
      bookingRef,
      clientId: firebaseUser.uid,
      clientName: payload.clientName,
      clientPhone: payload.clientPhone,
      providerId: payload.provider.id,
      providerName: providerDisplayName,
      providerPhone: payload.provider.phone,
      category: payload.provider.category,
      serviceType: payload.serviceType,
      city: payload.provider.location.city,
      neighborhood: payload.neighborhood,
      addressPin: payload.addressPin,
      description: payload.description,
      ...(safePhotoUrl ? { problemPhotoUrl: safePhotoUrl } : {}),
      preferredDate: payload.preferredDate,
      preferredTimeSlot: payload.preferredTimeSlot,
      paymentMethod: payload.paymentMethod,
      paymentStatus,
      estimatedMad: Math.round(payload.estimatedMad),
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      let needsBootstrapProfile = !userProfile || userProfile.uid !== firebaseUser.uid;
      if (needsBootstrapProfile) {
        const existingUserSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
        needsBootstrapProfile = !existingUserSnap.exists();
      }

      if (needsBootstrapProfile) {
        const bootstrapProfile = buildBootstrapClientProfile({
          uid: firebaseUser.uid,
          fullName: payload.clientName,
          phone: payload.clientPhone,
          city: payload.provider.location.city,
          neighborhood: payload.neighborhood,
          languagePref: lang,
        });
        const batch = writeBatch(db);
        batch.set(doc(db, 'users', firebaseUser.uid), {
          ...bootstrapProfile,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(db, 'bookings', bookingId), bookingPayload);
        await batch.commit();
        onBootstrapUserProfile?.(bootstrapProfile);
      } else {
        await setDoc(doc(db, 'bookings', bookingId), bookingPayload);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }

    void dispatchUserNotification({
      recipientUserId: payload.provider.id,
      actorUserId: firebaseUser.uid,
      type: 'booking_created',
      titleFr: `Nouvelle demande (${bookingRef})`,
      titleAr: `طلب حجز جديد (${bookingRef})`,
      bodyFr: `${payload.clientName} demande une intervention (${payload.serviceType}) à ${payload.neighborhood}.`,
      bodyAr: `طلب ${payload.clientName} تدخلاً (${payload.serviceType}) في حي ${payload.neighborhood}.`,
      linkPath: '/provider/missions',
    });

    return bookingRef;
  };

  // Enforces strict sequential booking state machine, payment status transitions, and atomic completedJobs increment
  const updateBookingStatus = async (
    bookingId: string,
    nextStatus: BookingStatus,
    actorRole: UserRole
  ) => {
    setBookingActionError(null);
    if (!firebaseUser) return;
    const target = bookings.find((b) => b.id === bookingId);
    if (!target) return;
    if (!canTransitionBookingStatus(target.status, nextStatus, actorRole)) {
      return;
    }

    if (nextStatus === 'cancelled') {
      await cancelBookingWithReason(
        bookingId,
        actorRole === 'client'
          ? 'Annulation par le client avant intervention'
          : 'Indisponibilité signalée par le Maâlem — Remboursement automatique CMI',
        actorRole
      );
      return;
    }

    const nextPaymentStatus = getNextPaymentStatus(
      target.paymentMethod,
      target.paymentStatus,
      nextStatus
    );

    const notifyStatusChange = () => {
      const recipientIsClient = firebaseUser.uid === target.providerId;
      const recipientUserId = recipientIsClient ? target.clientId : target.providerId;
      const statusFr =
        nextStatus === 'accepted'
          ? 'confirmée'
          : nextStatus === 'in_progress'
          ? 'en cours'
          : 'terminée';
      const statusAr =
        nextStatus === 'accepted'
          ? 'مقبول'
          : nextStatus === 'in_progress'
          ? 'قيد الإنجاز'
          : 'مكتمل';
      void dispatchUserNotification({
        recipientUserId,
        actorUserId: firebaseUser.uid,
        type: 'booking_status',
        titleFr: `Réservation ${target.bookingRef} ${statusFr}`,
        titleAr: `تحديث الحجز ${target.bookingRef}: ${statusAr}`,
        bodyFr: `Le statut de votre intervention (${target.serviceType}) est désormais : ${statusFr}.`,
        bodyAr: `أصبحت حالة طلب التدخل (${target.serviceType}) الآن: ${statusAr}.`,
        linkPath: recipientIsClient ? '/dashboard' : '/provider/missions',
      });
    };

    const path = `bookings/${bookingId}`;
    try {
      const updatePayload: Record<string, unknown> = {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      };
      if (nextStatus === 'completed' && nextPaymentStatus !== target.paymentStatus) {
        updatePayload.paymentStatus = nextPaymentStatus;
      }

      if (nextStatus === 'completed' && target.providerId === firebaseUser.uid) {
        const providerRef = doc(db, 'providers', firebaseUser.uid);
        const providerSnap = await getDoc(providerRef);
        if (providerSnap.exists()) {
          const pData = providerSnap.data();
          const currentJobs =
            typeof pData.completedJobs === 'number' ? Math.round(pData.completedJobs) : 0;
          const batch = writeBatch(db);
          batch.update(doc(db, 'bookings', bookingId), updatePayload);
          batch.update(providerRef, {
            completedJobs: currentJobs + 1,
            lastCompletedBookingId: bookingId,
            updatedAt: serverTimestamp(),
          });
          await batch.commit();
          notifyStatusChange();
          return;
        }
      }

      await updateDoc(doc(db, 'bookings', bookingId), updatePayload);
      notifyStatusChange();
    } catch (err) {
      reportFirestoreError(err, OperationType.UPDATE, path);
      setBookingActionError(
        lang === 'ar'
          ? 'تعذر تحديث حالة الطلب. تحقق من صلاحيات حسابك وحاول مرة أخرى.'
          : 'Impossible de mettre à jour le statut de la réservation. Vérifiez vos permissions.'
      );
    }
  };

  // Client confirms job completion & releases CMI Escrow (respecting configured platformFeePct)
  const clientConfirmAndReleaseEscrow = async (bookingId: string) => {
    setBookingActionError(null);
    if (!firebaseUser) return;
    const target = bookings.find((b) => b.id === bookingId);
    if (!target || target.clientId !== firebaseUser.uid) return;
    if (
      target.paymentMethod !== 'cmi_escrow' ||
      target.paymentStatus !== 'escrow_held' ||
      (target.status !== 'completed' && target.status !== 'reviewed')
    ) {
      return;
    }

    const split = calculateEscrowSplit(target.estimatedMad, platformFeePct, 100);
    const path = `bookings/${bookingId}`;
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        paymentStatus: 'paid',
        providerPayoutMad: split.providerPayoutMad,
        platformFeeMad: split.platformFeeMad,
        refundedClientMad: 0,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      reportFirestoreError(err, OperationType.UPDATE, path);
      setBookingActionError(
        lang === 'ar'
          ? 'تعذر صرف ضمان CMI. يرجى المحاولة مجدداً.'
          : 'Impossible de libérer le séquestre CMI. Veuillez réessayer.'
      );
    }
  };

  // Cancellation with explicit reason + automatic 100% CMI escrow refund when escrow_held
  const cancelBookingWithReason = async (
    bookingId: string,
    reason: string,
    actorRole: UserRole
  ) => {
    setBookingActionError(null);
    if (!firebaseUser) return;
    const target = bookings.find((b) => b.id === bookingId);
    if (!target) return;
    const effectiveRole: 'client' | 'provider' =
      actorRole === 'client' ? 'client' : 'provider';
    if (!canTransitionBookingStatus(target.status, 'cancelled', effectiveRole)) {
      return;
    }

    const settlement = computeCancellationSettlement(
      target,
      effectiveRole,
      reason,
      autoRefundOnProviderCancel
    );

    const path = `bookings/${bookingId}`;
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        ...settlement,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      reportFirestoreError(err, OperationType.UPDATE, path);
      setBookingActionError(
        lang === 'ar'
          ? 'تعذر إلغاء الحجز في قاعدة البيانات.'
          : 'Impossible d’annuler la réservation.'
      );
      throw err;
    }
  };

  // Reschedule pending or accepted booking to a new date & time slot
  const rescheduleBooking = async (
    bookingId: string,
    newDate: string,
    newSlot: TimeSlot,
    note: string
  ) => {
    setBookingActionError(null);
    if (!firebaseUser) return;
    const target = bookings.find((b) => b.id === bookingId);
    if (!target) return;
    if (target.status !== 'pending' && target.status !== 'accepted') return;
    const safeNote = note.trim().slice(0, 200);

    const path = `bookings/${bookingId}`;
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        preferredDate: newDate,
        preferredTimeSlot: newSlot,
        ...(safeNote ? { rescheduleNote: safeNote } : {}),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      reportFirestoreError(err, OperationType.UPDATE, path);
      setBookingActionError(
        lang === 'ar'
          ? 'تعذر إعادة جدولة الموعد.'
          : 'Impossible de reprogrammer le créneau.'
      );
      throw err;
    }
  };

  // Transactional review write: bookings/{bookingId} -> 'reviewed' + reviews/{bookingId} + providers/{uid} rating aggregation
  const submitClientReview = async (
    bookingId: string,
    rating: number,
    comment: string,
    _reviewCategories?: ReviewCategoryBreakdown
  ) => {
    setBookingActionError(null);
    if (!firebaseUser) return;
    const targetBooking = bookings.find((b) => b.id === bookingId);
    if (
      !targetBooking ||
      targetBooking.clientId !== firebaseUser.uid ||
      !canTransitionBookingStatus(targetBooking.status, 'reviewed', 'client')
    ) {
      return;
    }

    const safeRating = Math.max(1, Math.min(5, Math.round(rating)));
    const safeComment = comment.trim().slice(0, 500);
    if (safeComment.length < 2) {
      throw new Error(
        lang === 'ar'
          ? 'يرجى كتابة تعليق لا يقل عن حرفين.'
          : 'Veuillez saisir un commentaire d’au moins 2 caractères.'
      );
    }

    const targetProvider = allProviders.find((p) => p.id === targetBooking.providerId);
    const newReview = {
      id: bookingId,
      authorName: targetBooking.clientName,
      quartier: targetBooking.neighborhood,
      rating: safeRating,
      date: new Date().toISOString().slice(0, 10),
      commentFr: safeComment,
      commentAr: safeComment,
    };

    const reviewPath = `reviews/${bookingId}`;
    let committedRating: { ratingAvg: number; reviewCount: number } | null = null;
    try {
      committedRating = await runTransaction(db, async (tx) => {
        const bookingRef = doc(db, 'bookings', bookingId);
        const reviewRef = doc(db, 'reviews', bookingId);
        const shouldUpdateProvider = targetBooking.providerId !== firebaseUser.uid;
        const providerRef = doc(db, 'providers', targetBooking.providerId);

        const providerSnap = shouldUpdateProvider ? await tx.get(providerRef) : null;

        tx.update(bookingRef, {
          status: 'reviewed',
          reviewRating: safeRating,
          reviewComment: safeComment,
          updatedAt: serverTimestamp(),
        });

        tx.set(reviewRef, {
          bookingId,
          providerId: targetBooking.providerId,
          clientId: firebaseUser.uid,
          authorName: targetBooking.clientName,
          quartier: targetBooking.neighborhood,
          rating: safeRating,
          comment: safeComment,
          createdAt: serverTimestamp(),
        });

        if (providerSnap && providerSnap.exists()) {
          const pData = providerSnap.data();
          const liveCalc = recalculateProviderRating(
            Number(pData.ratingAvg ?? 5.0),
            Number(pData.reviewCount ?? 0),
            safeRating
          );
          tx.update(providerRef, {
            ratingAvg: liveCalc.ratingAvg,
            reviewCount: liveCalc.reviewCount,
            lastReviewBookingId: bookingId,
            updatedAt: serverTimestamp(),
          });
          return liveCalc;
        }
        return null;
      });
    } catch (err) {
      reportFirestoreError(err, OperationType.WRITE, reviewPath);
      throw err;
    }

    if (targetProvider && committedRating) {
      onApplyReviewOverride(targetProvider.id, {
        ratingAvg: committedRating.ratingAvg,
        reviewCount: committedRating.reviewCount,
        review: newReview,
      });
    }

    void dispatchUserNotification({
      recipientUserId: targetBooking.providerId,
      actorUserId: firebaseUser.uid,
      type: 'review_received',
      titleFr: `Nouvel avis client (${safeRating}/5 ★)`,
      titleAr: `تقييم زبون جديد (${safeRating}/5 ★)`,
      bodyFr: `${targetBooking.clientName} a évalué votre intervention (${targetBooking.bookingRef}).`,
      bodyAr: `قام ${targetBooking.clientName} بتقييم تدخلك (${targetBooking.bookingRef}).`,
      linkPath: '/provider/missions',
    });
  };

  const applyAdminBookingPatch = (bookingId: string, patch: AdminBookingPatch) => {
    setAdminOverrides((prev) => ({
      ...prev,
      [bookingId]: { ...(prev[bookingId] || {}), ...patch },
    }));
  };

  const sendLocalChatMessage = (msg: ChatMessageRecord) => {
    setChatThreads((prev) => ({
      ...prev,
      [msg.bookingId]: [...(prev[msg.bookingId] || []), msg],
    }));
  };

  return {
    bookings,
    chatThreads,
    bookingActionError,
    clearBookingActionError: () => setBookingActionError(null),
    submitBooking,
    updateBookingStatus,
    clientConfirmAndReleaseEscrow,
    cancelBookingWithReason,
    rescheduleBooking,
    submitClientReview,
    applyAdminBookingPatch,
    sendLocalChatMessage,
  };
}
