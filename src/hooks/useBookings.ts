import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  type DocumentData,
  type Timestamp,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  calculateEscrowSplit,
  canTransitionBookingStatus,
  computeCancellationSettlement,
  getNextPaymentStatus,
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
  type UserRole,
  type VettedProvider,
} from '../utils/marketplace';

// Consistent demo bookings matching seeded providers in src/data/providers.ts
const INITIAL_DEMO_BOOKINGS: BookingRecord[] = [
  {
    id: 'booking-demo-101',
    bookingRef: 'MK-101',
    clientId: 'demo-client',
    clientName: 'Karim Tazi',
    clientPhone: '+212661234567',
    providerId: 'maalem-driss-casa',
    providerName: 'Maâlem Driss Berrada',
    providerPhone: '+212661428910',
    category: 'Plomberie',
    serviceType: 'Détection de fuite sans casse',
    city: 'Casablanca',
    neighborhood: 'Maârif',
    addressPin: 'Rue Normandie, Rés. Al Yassamine Appt 8, Maârif (33.5883, -7.6325)',
    description: 'Remplacement mitigeur thermostatique et contrôle pression chauffe-eau.',
    problemPhotoUrl: '/src/assets/images/service_plumbing_repair_1794980477189.jpg',
    preferredDate: '2026-11-22',
    preferredTimeSlot: '09:00 - 12:00',
    paymentMethod: 'cmi_escrow',
    paymentStatus: 'escrow_held',
    estimatedMad: 230,
    status: 'pending',
    createdAtIso: '2026-11-17',
  },
  {
    id: 'booking-demo-102',
    bookingRef: 'MK-102',
    clientId: 'demo-client',
    clientName: 'Karim Tazi',
    clientPhone: '+212661234567',
    providerId: 'maalem-youssef-rabat',
    providerName: 'Maâlem Youssef El Amrani',
    providerPhone: '+212662845120',
    category: 'Électricité',
    serviceType: 'Tableaux électriques Schneider',
    city: 'Rabat',
    neighborhood: 'Agdal',
    addressPin: 'Avenue de France, Imm 24 Appt 3, Agdal (33.9985, -6.8479)',
    description: 'Mise aux normes tableau électrique différentiel et pose prises étanches.',
    preferredDate: '2026-11-18',
    preferredTimeSlot: '14:00 - 17:00',
    paymentMethod: 'cmi_escrow',
    paymentStatus: 'escrow_held',
    estimatedMad: 260,
    status: 'completed',
    createdAtIso: '2026-11-16',
  },
  {
    id: 'booking-demo-103',
    bookingRef: 'MK-103',
    clientId: 'demo-client',
    clientName: 'Karim Tazi',
    clientPhone: '+212661234567',
    providerId: 'maalem-driss-casa',
    providerName: 'Maâlem Driss Berrada',
    providerPhone: '+212661428910',
    category: 'Plomberie',
    serviceType: 'Installation chauffe-eau thermodynamique',
    city: 'Casablanca',
    neighborhood: 'Gauthier',
    addressPin: 'Rue Jean Jaurès, Imm 12 Appt 4, Gauthier (33.5912, -7.6285)',
    description: 'Pose complète chauffe-eau 150L avec raccordement cuivre et purge circuit.',
    preferredDate: '2026-11-24',
    preferredTimeSlot: '14:00 - 17:00',
    paymentMethod: 'cmi_escrow',
    paymentStatus: 'escrow_held',
    estimatedMad: 400,
    status: 'in_progress',
    createdAtIso: '2026-11-18',
  },
];

const INITIAL_DEMO_CHATS: Record<string, ChatMessageRecord[]> = {
  'booking-demo-101': [
    {
      id: 'msg-demo-1',
      bookingId: 'booking-demo-101',
      clientId: 'demo-client',
      providerId: 'maalem-driss-casa',
      senderId: 'demo-client',
      senderName: 'Karim Tazi',
      senderRole: 'client',
      text: 'Bonjour Maâlem Driss, le chauffe-eau goutte sous la soupape de sécurité. Êtes-vous disponible sur le créneau 09:00 - 12:00 ?',
      createdAtIso: '09:15',
    },
    {
      id: 'msg-demo-2',
      bookingId: 'booking-demo-101',
      clientId: 'demo-client',
      providerId: 'maalem-driss-casa',
      senderId: 'maalem-driss-casa',
      senderName: 'Maâlem Driss Berrada',
      senderRole: 'provider',
      text: 'Salam Sidi Karim, oui tout à fait ! J’apporte un groupe de sécurité neuf certifié et un joint fibre.',
      createdAtIso: '09:18',
    },
  ],
  'booking-demo-102': [
    {
      id: 'msg-demo-3',
      bookingId: 'booking-demo-102',
      clientId: 'demo-client',
      providerId: 'maalem-youssef-rabat',
      senderId: 'maalem-youssef-rabat',
      senderName: 'Maâlem Youssef El Amrani',
      senderRole: 'provider',
      text: 'Intervention terminée et disjoncteur différentiel 30mA testé avec succès. Merci pour votre confiance !',
      createdAtIso: '16:40',
    },
  ],
  'booking-demo-103': [
    {
      id: 'msg-demo-4',
      bookingId: 'booking-demo-103',
      clientId: 'demo-client',
      providerId: 'maalem-driss-casa',
      senderId: 'demo-client',
      senderName: 'Karim Tazi',
      senderRole: 'client',
      text: 'Bonjour Maâlem Driss, pour le second chantier à Gauthier (#MK-103), le ballon 150L est déjà livré sur place.',
      createdAtIso: '11:05',
    },
    {
      id: 'msg-demo-5',
      bookingId: 'booking-demo-103',
      clientId: 'demo-client',
      providerId: 'maalem-driss-casa',
      senderId: 'maalem-driss-casa',
      senderName: 'Maâlem Driss Berrada',
      senderRole: 'provider',
      text: 'Parfait Sidi Karim, je suis en route avec le chalumeau et les raccords diélectriques.',
      createdAtIso: '11:12',
    },
  ],
};

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
    problemPhotoUrl: data.problemPhotoUrl ? String(data.problemPhotoUrl) : undefined,
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
  lang: LanguageCode;
  allProviders: VettedProvider[];
  onApplyReviewOverride: (
    providerId: string,
    update: {
      ratingAvg: number;
      reviewCount: number;
      review: VettedProvider['reviews'][number];
    }
  ) => void;
}) {
  const { firebaseUser, authReady, lang, allProviders, onApplyReviewOverride } = params;

  const [localBookings, setLocalBookings] = useState<BookingRecord[]>(INITIAL_DEMO_BOOKINGS);
  const [clientLiveBookings, setClientLiveBookings] = useState<BookingRecord[]>([]);
  const [providerLiveBookings, setProviderLiveBookings] = useState<BookingRecord[]>([]);
  const [chatThreads, setChatThreads] = useState<Record<string, ChatMessageRecord[]>>(
    INITIAL_DEMO_CHATS
  );

  // Dual real-time Firestore listeners: clientId == uid AND providerId == uid
  useEffect(() => {
    if (!authReady || !firebaseUser) {
      setClientLiveBookings([]);
      setProviderLiveBookings([]);
      return;
    }

    const bookingsPath = 'bookings';
    const clientQuery = query(
      collection(db, bookingsPath),
      where('clientId', '==', firebaseUser.uid)
    );
    const providerQuery = query(
      collection(db, bookingsPath),
      where('providerId', '==', firebaseUser.uid)
    );

    const unsubClient = onSnapshot(
      clientQuery,
      (snapshot) => {
        setClientLiveBookings(snapshot.docs.map((d) => mapFirestoreBooking(d.id, d.data())));
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, bookingsPath);
      }
    );

    const unsubProvider = onSnapshot(
      providerQuery,
      (snapshot) => {
        setProviderLiveBookings(snapshot.docs.map((d) => mapFirestoreBooking(d.id, d.data())));
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, bookingsPath);
      }
    );

    return () => {
      unsubClient();
      unsubProvider();
    };
  }, [authReady, firebaseUser]);

  // Deduplicated bookings list combining live Firestore records and local/demo items
  const bookings = useMemo(() => {
    const byId = new Map<string, BookingRecord>();
    clientLiveBookings.forEach((b) => byId.set(b.id, b));
    providerLiveBookings.forEach((b) => byId.set(b.id, b));
    localBookings.forEach((b) => {
      if (!byId.has(b.id)) byId.set(b.id, b);
    });
    return Array.from(byId.values());
  }, [clientLiveBookings, providerLiveBookings, localBookings]);

  const submitBooking = async (payload: SubmitBookingPayload): Promise<string> => {
    const bookingId = `booking-${Date.now()}`;
    const bookingRef = `MK-${Math.floor(100 + (Date.now() % 900))}`;
    const providerDisplayName =
      lang === 'ar' ? payload.provider.fullNameAr : payload.provider.fullNameFr;
    const paymentStatus: PaymentStatus =
      payload.paymentMethod === 'cmi_escrow' ? 'escrow_held' : 'unpaid_cod';

    const safePhotoUrl =
      payload.problemPhotoUrl && payload.problemPhotoUrl.length <= 2048
        ? payload.problemPhotoUrl
        : undefined;

    const newBooking: BookingRecord = {
      id: bookingId,
      bookingRef,
      clientId: firebaseUser?.uid ?? 'local-client',
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
      problemPhotoUrl: payload.problemPhotoUrl,
      preferredDate: payload.preferredDate,
      preferredTimeSlot: payload.preferredTimeSlot,
      paymentMethod: payload.paymentMethod,
      paymentStatus,
      estimatedMad: Math.round(payload.estimatedMad),
      status: 'pending',
      createdAtIso: new Date().toISOString().slice(0, 10),
    };

    if (firebaseUser) {
      const path = `bookings/${bookingId}`;
      try {
        await setDoc(doc(db, 'bookings', bookingId), {
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
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    }

    setLocalBookings((prev) => [newBooking, ...prev]);
    setChatThreads((prev) => ({
      ...prev,
      [bookingId]: [
        {
          id: `msg-init-${Date.now()}`,
          bookingId,
          clientId: newBooking.clientId,
          providerId: newBooking.providerId,
          senderId: newBooking.clientId,
          senderName: newBooking.clientName,
          senderRole: 'client',
          text: `${payload.serviceType} — ${payload.description}`,
          photoUrl: payload.problemPhotoUrl,
          createdAtIso: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ],
    }));

    return bookingRef;
  };

  // Enforces strict sequential booking state machine & payment status transitions (including provider cancel auto-refund)
  const updateBookingStatus = async (
    bookingId: string,
    nextStatus: BookingStatus,
    actorRole: UserRole
  ) => {
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

    if (firebaseUser && !bookingId.startsWith('booking-demo-')) {
      const path = `bookings/${bookingId}`;
      try {
        const updatePayload: Record<string, unknown> = {
          status: nextStatus,
          updatedAt: serverTimestamp(),
        };
        if (nextStatus === 'completed' && nextPaymentStatus !== target.paymentStatus) {
          updatePayload.paymentStatus = nextPaymentStatus;
        }
        await updateDoc(doc(db, 'bookings', bookingId), updatePayload);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }

    setLocalBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? { ...b, status: nextStatus, paymentStatus: nextPaymentStatus }
          : b
      )
    );
  };

  // Client confirms job completion & releases CMI Escrow (90% provider payout + 10% platform fee)
  const clientConfirmAndReleaseEscrow = async (bookingId: string) => {
    const target = bookings.find((b) => b.id === bookingId);
    if (!target) return;
    if (
      target.paymentMethod !== 'cmi_escrow' ||
      target.paymentStatus !== 'escrow_held' ||
      (target.status !== 'completed' && target.status !== 'reviewed')
    ) {
      return;
    }

    const split = calculateEscrowSplit(target.estimatedMad, 10, 100);

    if (firebaseUser && !bookingId.startsWith('booking-demo-')) {
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
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }

    setLocalBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              paymentStatus: 'paid',
              providerPayoutMad: split.providerPayoutMad,
              platformFeeMad: split.platformFeeMad,
              refundedClientMad: 0,
            }
          : b
      )
    );
  };

  // Cancellation with explicit reason + automatic 100% CMI escrow refund when escrow_held
  const cancelBookingWithReason = async (
    bookingId: string,
    reason: string,
    actorRole: UserRole
  ) => {
    const target = bookings.find((b) => b.id === bookingId);
    if (!target) return;
    const effectiveRole: 'client' | 'provider' =
      actorRole === 'client' ? 'client' : 'provider';
    if (!canTransitionBookingStatus(target.status, 'cancelled', effectiveRole)) {
      return;
    }

    const settlement = computeCancellationSettlement(target, effectiveRole, reason);

    if (firebaseUser && !bookingId.startsWith('booking-demo-')) {
      const path = `bookings/${bookingId}`;
      try {
        await updateDoc(doc(db, 'bookings', bookingId), {
          ...settlement,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }

    setLocalBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, ...settlement } : b))
    );
  };

  // Reschedule pending or accepted booking to a new date & time slot
  const rescheduleBooking = async (
    bookingId: string,
    newDate: string,
    newSlot: TimeSlot,
    note: string
  ) => {
    const target = bookings.find((b) => b.id === bookingId);
    if (!target) return;
    if (target.status !== 'pending' && target.status !== 'accepted') return;
    const safeNote = note.trim().slice(0, 200);

    if (firebaseUser && !bookingId.startsWith('booking-demo-')) {
      const path = `bookings/${bookingId}`;
      try {
        await updateDoc(doc(db, 'bookings', bookingId), {
          preferredDate: newDate,
          preferredTimeSlot: newSlot,
          ...(safeNote ? { rescheduleNote: safeNote } : {}),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }

    setLocalBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              preferredDate: newDate,
              preferredTimeSlot: newSlot,
              rescheduleNote: safeNote || b.rescheduleNote,
            }
          : b
      )
    );
  };

  // Atomic review write: bookings/{bookingId} -> 'reviewed' + reviews/{bookingId} + optional providers/{uid} rating aggregation
  const submitClientReview = async (
    bookingId: string,
    rating: number,
    comment: string,
    reviewCategories?: ReviewCategoryBreakdown
  ) => {
    const targetBooking = bookings.find((b) => b.id === bookingId);
    if (!targetBooking || !canTransitionBookingStatus(targetBooking.status, 'reviewed', 'client')) {
      return;
    }

    const targetProvider = allProviders.find((p) => p.id === targetBooking.providerId);
    const recalculated = targetProvider
      ? recalculateProviderRating(targetProvider.ratingAvg, targetProvider.reviewCount, rating)
      : { ratingAvg: rating, reviewCount: 1 };

    const newReview = {
      id: bookingId,
      authorName: targetBooking.clientName,
      quartier: targetBooking.neighborhood,
      rating,
      date: new Date().toISOString().slice(0, 10),
      commentFr: comment,
      commentAr: comment,
    };

    if (targetProvider) {
      onApplyReviewOverride(targetProvider.id, {
        ratingAvg: recalculated.ratingAvg,
        reviewCount: recalculated.reviewCount,
        review: newReview,
      });
    }

    if (firebaseUser && !bookingId.startsWith('booking-demo-')) {
      const reviewPath = `reviews/${bookingId}`;
      try {
        const batch = writeBatch(db);
        const bookingRef = doc(db, 'bookings', bookingId);
        const reviewRef = doc(db, 'reviews', bookingId);

        batch.update(bookingRef, {
          status: 'reviewed',
          reviewRating: rating,
          reviewComment: comment,
          updatedAt: serverTimestamp(),
        });

        batch.set(reviewRef, {
          bookingId,
          providerId: targetBooking.providerId,
          clientId: firebaseUser.uid,
          authorName: targetBooking.clientName,
          quartier: targetBooking.neighborhood,
          rating,
          comment,
          createdAt: serverTimestamp(),
        });

        if (targetBooking.providerId !== firebaseUser.uid) {
          const providerRef = doc(db, 'providers', targetBooking.providerId);
          const providerSnap = await getDoc(providerRef);
          if (providerSnap.exists()) {
            const pData = providerSnap.data();
            const liveCalc = recalculateProviderRating(
              Number(pData.ratingAvg ?? 5.0),
              Number(pData.reviewCount ?? 0),
              rating
            );
            batch.update(providerRef, {
              ratingAvg: liveCalc.ratingAvg,
              reviewCount: liveCalc.reviewCount,
              lastReviewBookingId: bookingId,
              updatedAt: serverTimestamp(),
            });
          }
        }

        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, reviewPath);
      }
    }

    setLocalBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              status: 'reviewed',
              reviewRating: rating,
              reviewComment: comment,
              reviewCategories,
            }
          : b
      )
    );
  };

  const applyAdminBookingPatch = (bookingId: string, patch: AdminBookingPatch) => {
    setLocalBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, ...patch } : b))
    );
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
