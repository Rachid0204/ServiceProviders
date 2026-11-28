import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  query,
  where,
  limit,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  type DocumentData,
  type Timestamp,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, reportFirestoreError, OperationType } from '../firebase';
import {
  createDefaultNotificationPreferences,
  sanitizeNotificationLinkPath,
  type NotificationPreferencesRecord,
  type NotificationRecord,
  type NotificationType,
} from '../utils/marketplace';
import { isVerifiedAuthUser } from '../utils/authHelpers';
import { shouldShowNotificationForPreferences } from '../utils/bookingLogic';

function parseTimestampMs(ts: unknown): { ms: number; iso: string } {
  if (ts && typeof ts === 'object' && 'toDate' in ts) {
    try {
      const date = (ts as Timestamp).toDate();
      return { ms: date.getTime(), iso: date.toISOString() };
    } catch {
      // fallback
    }
  }
  const now = new Date();
  return { ms: now.getTime(), iso: now.toISOString() };
}

function mapFirestoreNotification(
  id: string,
  data: DocumentData
): NotificationRecord & { createdAtMs: number } {
  const { ms, iso } = parseTimestampMs(data.createdAt);
  return {
    id,
    userId: String(data.userId || ''),
    actorId: String(data.actorId || ''),
    type: (data.type as NotificationType) || 'system',
    titleFr: String(data.titleFr || ''),
    titleAr: String(data.titleAr || ''),
    bodyFr: String(data.bodyFr || ''),
    bodyAr: String(data.bodyAr || ''),
    linkPath: sanitizeNotificationLinkPath(typeof data.linkPath === 'string' ? data.linkPath : '/dashboard'),
    isRead: Boolean(data.isRead),
    createdAtIso: iso,
    createdAtMs: ms,
  };
}

export interface DispatchNotificationPayload {
  recipientUserId: string;
  actorUserId: string;
  type: NotificationType;
  titleFr: string;
  titleAr: string;
  bodyFr: string;
  bodyAr: string;
  linkPath: string;
}

/**
 * Non-blocking helper to create a bilingual in-app notification for a counterparty.
 * Safely no-ops if recipient == actor or on invalid IDs so primary workflows never fail.
 */
export async function dispatchUserNotification(
  payload: DispatchNotificationPayload
): Promise<void> {
  if (
    !payload.recipientUserId ||
    !payload.actorUserId ||
    payload.recipientUserId === payload.actorUserId
  ) {
    return;
  }

  const notificationId = `notif-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const safeTitleFr = payload.titleFr.trim().slice(0, 120);
  const safeTitleAr = payload.titleAr.trim().slice(0, 120);
  const safeBodyFr = payload.bodyFr.trim().slice(0, 300);
  const safeBodyAr = payload.bodyAr.trim().slice(0, 300);
  if (
    safeTitleFr.length < 2 ||
    safeTitleAr.length < 2 ||
    safeBodyFr.length < 2 ||
    safeBodyAr.length < 2
  ) {
    return;
  }

  try {
    await setDoc(doc(db, 'notifications', notificationId), {
      userId: payload.recipientUserId,
      actorId: payload.actorUserId,
      type: payload.type,
      titleFr: safeTitleFr,
      titleAr: safeTitleAr,
      bodyFr: safeBodyFr,
      bodyAr: safeBodyAr,
      linkPath: sanitizeNotificationLinkPath(payload.linkPath),
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Non-blocking: never break primary booking/quote/chat actions if notification write fails
  }
}

export function useNotifications(
  firebaseUser: User | null,
  authReady: boolean,
  isVerified: boolean
) {
  const [rawNotifications, setRawNotifications] = useState<
    Array<NotificationRecord & { createdAtMs: number }>
  >([]);
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferencesRecord>(() => createDefaultNotificationPreferences(''));

  useEffect(() => {
    if (!authReady || !firebaseUser || !isVerified || !isVerifiedAuthUser(firebaseUser)) {
      setRawNotifications([]);
      setNotificationPreferences(createDefaultNotificationPreferences(''));
      return;
    }

    const uid = firebaseUser.uid;
    setNotificationPreferences(createDefaultNotificationPreferences(uid));

    const notifQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', uid),
      limit(60)
    );

    const unsubNotifs = onSnapshot(
      notifQuery,
      (snapshot) => {
        const items = snapshot.docs
          .map((d) => mapFirestoreNotification(d.id, d.data()))
          .sort((a, b) => b.createdAtMs - a.createdAtMs);
        setRawNotifications(items);
      },
      (err) => {
        reportFirestoreError(err, OperationType.LIST, 'notifications');
      }
    );

    const prefRef = doc(db, 'notificationPreferences', uid);
    const unsubPrefs = onSnapshot(
      prefRef,
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setNotificationPreferences({
            uid,
            inAppEnabled: Boolean(d.inAppEnabled ?? true),
            emailEnabled: Boolean(d.emailEnabled ?? true),
            smsWhatsAppEnabled: Boolean(d.smsWhatsAppEnabled ?? true),
            bookingUpdates: Boolean(d.bookingUpdates ?? true),
            quotationUpdates: Boolean(d.quotationUpdates ?? true),
            chatMessages: Boolean(d.chatMessages ?? true),
            marketingUpdates: Boolean(d.marketingUpdates ?? false),
          });
        } else {
          setNotificationPreferences(createDefaultNotificationPreferences(uid));
        }
      },
      (err) => {
        reportFirestoreError(err, OperationType.GET, `notificationPreferences/${uid}`);
      }
    );

    return () => {
      unsubNotifs();
      unsubPrefs();
    };
  }, [authReady, firebaseUser, isVerified]);

  const notifications = useMemo<NotificationRecord[]>(
    () =>
      rawNotifications
        .filter((record) => shouldShowNotificationForPreferences(record, notificationPreferences))
        .map(({ createdAtMs: _ms, ...record }) => record),
    [rawNotifications, notificationPreferences]
  );

  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const markNotificationRead = useCallback(
    async (notificationId: string) => {
      if (!firebaseUser || !isVerified) return;
      try {
        await updateDoc(doc(db, 'notifications', notificationId), { isRead: true });
      } catch (err) {
        reportFirestoreError(err, OperationType.UPDATE, `notifications/${notificationId}`);
      }
    },
    [firebaseUser, isVerified]
  );

  const markAllNotificationsRead = useCallback(async () => {
    if (!firebaseUser || !isVerified) return;
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;
    try {
      const batch = writeBatch(db);
      unread.forEach((n) => {
        batch.update(doc(db, 'notifications', n.id), { isRead: true });
      });
      await batch.commit();
    } catch (err) {
      reportFirestoreError(err, OperationType.UPDATE, 'notifications');
    }
  }, [firebaseUser, isVerified, notifications]);

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      if (!firebaseUser || !isVerified) return;
      try {
        await deleteDoc(doc(db, 'notifications', notificationId));
      } catch (err) {
        reportFirestoreError(err, OperationType.DELETE, `notifications/${notificationId}`);
      }
    },
    [firebaseUser, isVerified]
  );

  const saveNotificationPreferences = useCallback(
    async (next: Omit<NotificationPreferencesRecord, 'uid'>) => {
      if (!firebaseUser || !isVerified) return;
      const uid = firebaseUser.uid;
      const payload = {
        uid,
        inAppEnabled: Boolean(next.inAppEnabled),
        emailEnabled: Boolean(next.emailEnabled),
        smsWhatsAppEnabled: Boolean(next.smsWhatsAppEnabled),
        bookingUpdates: Boolean(next.bookingUpdates),
        quotationUpdates: Boolean(next.quotationUpdates),
        chatMessages: Boolean(next.chatMessages),
        marketingUpdates: Boolean(next.marketingUpdates),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'notificationPreferences', uid), payload);
      setNotificationPreferences({ uid, ...next });
    },
    [firebaseUser, isVerified]
  );

  return {
    notifications,
    unreadNotificationCount,
    notificationPreferences,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    saveNotificationPreferences,
  };
}
