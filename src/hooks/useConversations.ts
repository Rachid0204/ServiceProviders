import { useState, useEffect, useCallback, useMemo } from 'react';
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
  serverTimestamp,
  type DocumentData,
  type Timestamp,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, reportFirestoreError, OperationType } from '../firebase';
import {
  isConversationUnreadForUser,
  type BookingRecord,
  type ConversationMetadataRecord,
} from '../utils/marketplace';
import { isVerifiedAuthUser } from '../utils/authHelpers';

function toMillis(ts: unknown): number {
  if (ts && typeof ts === 'object' && 'toMillis' in ts) {
    try {
      return (ts as Timestamp).toMillis();
    } catch {
      return 0;
    }
  }
  return 0;
}

function mapFirestoreConversation(id: string, data: DocumentData): ConversationMetadataRecord {
  return {
    bookingId: String(data.bookingId || id),
    clientId: String(data.clientId || ''),
    providerId: String(data.providerId || ''),
    lastMessageText: String(data.lastMessageText || ''),
    lastSenderId: String(data.lastSenderId || ''),
    lastMessageAtMs: toMillis(data.lastMessageAt),
    clientLastReadAtMs: data.clientLastReadAt ? toMillis(data.clientLastReadAt) : undefined,
    providerLastReadAtMs: data.providerLastReadAt ? toMillis(data.providerLastReadAt) : undefined,
    blockedByUid:
      typeof data.blockedByUid === 'string' && data.blockedByUid.length > 0
        ? data.blockedByUid
        : undefined,
  };
}

export function useConversations(
  firebaseUser: User | null,
  authReady: boolean,
  isVerified: boolean
) {
  const [clientConvos, setClientConvos] = useState<ConversationMetadataRecord[]>([]);
  const [providerConvos, setProviderConvos] = useState<ConversationMetadataRecord[]>([]);

  useEffect(() => {
    if (!authReady || !firebaseUser || !isVerified || !isVerifiedAuthUser(firebaseUser)) {
      setClientConvos([]);
      setProviderConvos([]);
      return;
    }

    const uid = firebaseUser.uid;
    const clientQ = query(
      collection(db, 'conversations'),
      where('clientId', '==', uid),
      limit(100)
    );
    const providerQ = query(
      collection(db, 'conversations'),
      where('providerId', '==', uid),
      limit(100)
    );

    const unsubClient = onSnapshot(
      clientQ,
      (snap) => {
        setClientConvos(snap.docs.map((d) => mapFirestoreConversation(d.id, d.data())));
      },
      (err) => {
        reportFirestoreError(err, OperationType.LIST, 'conversations');
      }
    );

    const unsubProvider = onSnapshot(
      providerQ,
      (snap) => {
        setProviderConvos(snap.docs.map((d) => mapFirestoreConversation(d.id, d.data())));
      },
      (err) => {
        reportFirestoreError(err, OperationType.LIST, 'conversations');
      }
    );

    return () => {
      unsubClient();
      unsubProvider();
    };
  }, [authReady, firebaseUser, isVerified]);

  const conversationsByBookingId = useMemo(() => {
    const map: Record<string, ConversationMetadataRecord> = {};
    clientConvos.forEach((c) => {
      map[c.bookingId] = c;
    });
    providerConvos.forEach((c) => {
      map[c.bookingId] = c;
    });
    return map;
  }, [clientConvos, providerConvos]);

  const unreadConversationsCount = useMemo(() => {
    if (!firebaseUser) return 0;
    return Object.values(conversationsByBookingId).filter((meta) =>
      isConversationUnreadForUser(meta, firebaseUser.uid)
    ).length;
  }, [conversationsByBookingId, firebaseUser]);

  const markConversationRead = useCallback(
    async (booking: BookingRecord) => {
      if (!firebaseUser || !isVerified || booking.id.startsWith('booking-demo-')) return;
      const uid = firebaseUser.uid;
      if (uid !== booking.clientId && uid !== booking.providerId) return;

      const convRef = doc(db, 'conversations', booking.id);
      const readField = uid === booking.clientId ? 'clientLastReadAt' : 'providerLastReadAt';

      try {
        const snap = await getDoc(convRef);
        if (snap.exists()) {
          await updateDoc(convRef, {
            [readField]: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch {
        // Non-blocking read receipt sync
      }
    },
    [firebaseUser, isVerified]
  );

  const updateConversationOnMessage = useCallback(
    async (booking: BookingRecord, messageText: string) => {
      if (!firebaseUser || !isVerified || booking.id.startsWith('booking-demo-')) return;
      const uid = firebaseUser.uid;
      if (uid !== booking.clientId && uid !== booking.providerId) return;

      const convRef = doc(db, 'conversations', booking.id);
      const readField = uid === booking.clientId ? 'clientLastReadAt' : 'providerLastReadAt';
      const safePreview = messageText.trim().slice(0, 500);

      try {
        const snap = await getDoc(convRef);
        if (snap.exists()) {
          await updateDoc(convRef, {
            lastMessageText: safePreview,
            lastSenderId: uid,
            lastMessageAt: serverTimestamp(),
            [readField]: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(convRef, {
            bookingId: booking.id,
            clientId: booking.clientId,
            providerId: booking.providerId,
            lastMessageText: safePreview,
            lastSenderId: uid,
            lastMessageAt: serverTimestamp(),
            [readField]: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch {
        // Non-blocking metadata update
      }
    },
    [firebaseUser, isVerified]
  );

  const toggleBlockConversation = useCallback(
    async (booking: BookingRecord) => {
      if (!firebaseUser || !isVerified || booking.id.startsWith('booking-demo-')) return;
      const uid = firebaseUser.uid;
      if (uid !== booking.clientId && uid !== booking.providerId) return;

      const existingMeta = conversationsByBookingId[booking.id];
      const nextBlockedBy = existingMeta?.blockedByUid === uid ? '' : uid;
      const convRef = doc(db, 'conversations', booking.id);

      const snap = await getDoc(convRef);
      if (snap.exists()) {
        await updateDoc(convRef, {
          blockedByUid: nextBlockedBy,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(convRef, {
          bookingId: booking.id,
          clientId: booking.clientId,
          providerId: booking.providerId,
          lastMessageText: '',
          lastSenderId: uid,
          lastMessageAt: serverTimestamp(),
          blockedByUid: nextBlockedBy,
          updatedAt: serverTimestamp(),
        });
      }
    },
    [firebaseUser, isVerified, conversationsByBookingId]
  );

  const submitChatReport = useCallback(
    async (booking: BookingRecord, reason: string, details: string) => {
      if (!firebaseUser || !isVerified || booking.id.startsWith('booking-demo-')) return;
      const uid = firebaseUser.uid;
      if (uid !== booking.clientId && uid !== booking.providerId) return;

      const reportedUserId = uid === booking.clientId ? booking.providerId : booking.clientId;
      const safeReason = reason.trim().slice(0, 80);
      const safeDetails = details.trim().slice(0, 500);
      if (safeReason.length < 3 || safeDetails.length < 5) {
        throw new Error('Invalid report input');
      }

      const reportId = `rpt-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      await setDoc(doc(db, 'chatReports', reportId), {
        bookingId: booking.id,
        reporterId: uid,
        reportedUserId,
        reason: safeReason,
        details: safeDetails,
        status: 'open',
        createdAt: serverTimestamp(),
      });
    },
    [firebaseUser, isVerified]
  );

  return {
    conversationsByBookingId,
    unreadConversationsCount,
    markConversationRead,
    updateConversationOnMessage,
    toggleBlockConversation,
    submitChatReport,
  };
}
