import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  query,
  where,
  limit,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  type DocumentData,
  type Timestamp,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, reportFirestoreError, OperationType } from '../firebase';
import {
  isSafeImageUrl,
  validateDisputeInput,
  type BookingRecord,
  type DisputeReason,
  type DisputeRecord,
  type DisputeStatus,
  type LanguageCode,
} from '../utils/marketplace';
import { isVerifiedAuthUser } from '../utils/authHelpers';
import { dispatchUserNotification } from './useNotifications';

function formatTs(ts: unknown): string {
  if (ts && typeof ts === 'object' && 'toDate' in ts) {
    try {
      return (ts as Timestamp).toDate().toISOString();
    } catch {
      // fallback
    }
  }
  return new Date().toISOString();
}

function mapFirestoreDispute(id: string, data: DocumentData): DisputeRecord {
  const rawEvidence = Array.isArray(data.evidenceUrls) ? data.evidenceUrls : [];
  return {
    id,
    bookingId: String(data.bookingId || ''),
    bookingRef: String(data.bookingRef || ''),
    clientId: String(data.clientId || ''),
    providerId: String(data.providerId || ''),
    openedByUid: String(data.openedByUid || ''),
    openedByRole: data.openedByRole === 'provider' ? 'provider' : 'client',
    reason: (data.reason as DisputeReason) || 'other',
    description: String(data.description || ''),
    evidenceUrls: rawEvidence.filter(
      (u): u is string => typeof u === 'string' && isSafeImageUrl(u)
    ),
    status: (data.status as DisputeStatus) || 'open',
    resolutionSummary: data.resolutionSummary ? String(data.resolutionSummary) : undefined,
    resolvedByUid: data.resolvedByUid ? String(data.resolvedByUid) : undefined,
    createdAtIso: formatTs(data.createdAt),
    updatedAtIso: data.updatedAt ? formatTs(data.updatedAt) : undefined,
  };
}

/**
 * Submits a verified-user moderation report on a public review to `/reviewReports/{reportId}`.
 */
export async function submitReviewModerationReport(params: {
  reviewId: string;
  providerId: string;
  reporterId: string;
  reason: string;
  details: string;
}): Promise<void> {
  const safeReason = params.reason.trim().slice(0, 80);
  const safeDetails = params.details.trim().slice(0, 400);
  if (safeReason.length < 3 || safeDetails.length < 5) {
    throw new Error('Invalid review report input');
  }
  const reportId = `revrpt-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  await setDoc(doc(db, 'reviewReports', reportId), {
    reviewId: params.reviewId,
    providerId: params.providerId,
    reporterId: params.reporterId,
    reason: safeReason,
    details: safeDetails,
    status: 'open',
    createdAt: serverTimestamp(),
  });
}

export function useDisputes(
  firebaseUser: User | null,
  authReady: boolean,
  isVerified: boolean,
  lang: LanguageCode
) {
  const [clientDisputes, setClientDisputes] = useState<DisputeRecord[]>([]);
  const [providerDisputes, setProviderDisputes] = useState<DisputeRecord[]>([]);

  useEffect(() => {
    if (!authReady || !firebaseUser || !isVerified || !isVerifiedAuthUser(firebaseUser)) {
      setClientDisputes([]);
      setProviderDisputes([]);
      return;
    }

    const uid = firebaseUser.uid;
    const clientQ = query(collection(db, 'disputes'), where('clientId', '==', uid), limit(50));
    const providerQ = query(collection(db, 'disputes'), where('providerId', '==', uid), limit(50));

    const unsubClient = onSnapshot(
      clientQ,
      (snap) => setClientDisputes(snap.docs.map((d) => mapFirestoreDispute(d.id, d.data()))),
      (err) => reportFirestoreError(err, OperationType.LIST, 'disputes')
    );

    const unsubProvider = onSnapshot(
      providerQ,
      (snap) => setProviderDisputes(snap.docs.map((d) => mapFirestoreDispute(d.id, d.data()))),
      (err) => reportFirestoreError(err, OperationType.LIST, 'disputes')
    );

    return () => {
      unsubClient();
      unsubProvider();
    };
  }, [authReady, firebaseUser, isVerified]);

  const disputes = useMemo(() => {
    const byId = new Map<string, DisputeRecord>();
    clientDisputes.forEach((d) => byId.set(d.id, d));
    providerDisputes.forEach((d) => byId.set(d.id, d));
    return Array.from(byId.values()).sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
  }, [clientDisputes, providerDisputes]);

  const openDisputesCount = useMemo(
    () => disputes.filter((d) => d.status !== 'resolved' && d.status !== 'closed').length,
    [disputes]
  );

  const openDispute = useCallback(
    async (params: {
      booking: BookingRecord;
      reason: DisputeReason;
      description: string;
      evidenceUrls: string[];
    }): Promise<string> => {
      if (!firebaseUser || !isVerified) {
        throw new Error(
          lang === 'ar' ? 'يرجى تسجيل الدخول أولاً.' : 'Veuillez vous connecter pour ouvrir un litige.'
        );
      }

      const check = validateDisputeInput(
        {
          bookingId: params.booking.id,
          reason: params.reason,
          description: params.description,
          evidenceUrls: params.evidenceUrls,
        },
        lang
      );
      if (!check.valid) {
        const firstErr = Object.values(check.errors)[0];
        throw new Error(firstErr || 'Invalid dispute input');
      }

      const uid = firebaseUser.uid;
      const openedByRole: 'client' | 'provider' =
        uid === params.booking.providerId ? 'provider' : 'client';
      const safeEvidence = params.evidenceUrls.filter((u) => isSafeImageUrl(u)).slice(0, 4);
      const disputeId = `disp-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      await setDoc(doc(db, 'disputes', disputeId), {
        bookingId: params.booking.id,
        bookingRef: params.booking.bookingRef,
        clientId: params.booking.clientId,
        providerId: params.booking.providerId,
        openedByUid: uid,
        openedByRole,
        reason: params.reason,
        description: params.description.trim().slice(0, 1000),
        evidenceUrls: safeEvidence,
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const counterpartyId =
        uid === params.booking.clientId ? params.booking.providerId : params.booking.clientId;
      void dispatchUserNotification({
        recipientUserId: counterpartyId,
        actorUserId: uid,
        type: 'system',
        titleFr: `Litige ouvert sur #${params.booking.bookingRef}`,
        titleAr: `تم فتح نزاع بخصوص الحجز #${params.booking.bookingRef}`,
        bodyFr: 'Un dossier de médiation a été ouvert. Consultez le centre de litiges pour suivre son traitement.',
        bodyAr: 'تم فتح ملف وساطة. يرجى مراجعة مركز النزاعات لمتابعة المعالجة.',
        linkPath: '/disputes',
      });

      return disputeId;
    },
    [firebaseUser, isVerified, lang]
  );

  return {
    disputes,
    openDisputesCount,
    openDispute,
  };
}
