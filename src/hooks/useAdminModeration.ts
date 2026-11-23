import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  query,
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
  isSafeImageUrl,
  type DisputeReason,
  type DisputeRecord,
  type DisputeStatus,
  type KycVerificationStatus,
  type ProviderKycDocumentRecord,
  type UserProfileRecord,
} from '../utils/marketplace';
import {
  DEFAULT_ADMIN_EMAIL_PLACEHOLDER,
  type AdminActionType,
  type AdminModerationReportItem,
  type AdminTargetCollection,
} from '../utils/adminMetrics';
import { dispatchUserNotification } from './useNotifications';

function formatTs(ts: unknown): string {
  if (ts && typeof ts === 'object' && 'toDate' in ts) {
    try {
      const d = (ts as Timestamp).toDate();
      return `${d.toISOString().slice(0, 10)} ${d.toTimeString().slice(0, 5)}`;
    } catch {
      // fallback
    }
  }
  return '';
}

function mapKycDoc(uid: string, data: DocumentData): ProviderKycDocumentRecord {
  return {
    uid: String(data.uid || uid),
    cinNumberMasked: String(data.cinNumberMasked || ''),
    cinFrontUrl: String(data.cinFrontUrl || ''),
    cinBackUrl: String(data.cinBackUrl || ''),
    certificateUrl: typeof data.certificateUrl === 'string' ? data.certificateUrl : undefined,
    businessLicenseUrl:
      typeof data.businessLicenseUrl === 'string' ? data.businessLicenseUrl : undefined,
    status: (data.status as KycVerificationStatus) || 'submitted',
    rejectionReason: typeof data.rejectionReason === 'string' ? data.rejectionReason : undefined,
    reviewedByUid: typeof data.reviewedByUid === 'string' ? data.reviewedByUid : undefined,
    submittedAtIso: formatTs(data.submittedAt),
    reviewedAtIso: data.reviewedAt ? formatTs(data.reviewedAt) : undefined,
  };
}

function mapAdminDispute(id: string, data: DocumentData): DisputeRecord {
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
    resolutionSummary: typeof data.resolutionSummary === 'string' ? data.resolutionSummary : undefined,
    resolvedByUid: typeof data.resolvedByUid === 'string' ? data.resolvedByUid : undefined,
    createdAtIso: formatTs(data.createdAt),
    updatedAtIso: data.updatedAt ? formatTs(data.updatedAt) : undefined,
  };
}

/**
 * Modular Admin Phase 6 hook for private KYC inspection (with CNDP audit logging),
 * structured Dispute resolution, Review/Chat moderation queues, and User account suspension.
 */
export function useAdminModeration(params: {
  isLiveAdmin: boolean;
  firebaseUser: User | null;
}) {
  const { isLiveAdmin, firebaseUser } = params;

  const [kycDocuments, setKycDocuments] = useState<ProviderKycDocumentRecord[]>([]);
  const [adminDisputes, setAdminDisputes] = useState<DisputeRecord[]>([]);
  const [reviewReports, setReviewReports] = useState<AdminModerationReportItem[]>([]);
  const [chatReports, setChatReports] = useState<AdminModerationReportItem[]>([]);
  const [moderationToast, setModerationToast] = useState<{
    fr: string;
    ar: string;
    variant?: 'success' | 'error';
  } | null>(null);

  const flashToast = useCallback(
    (msg: { fr: string; ar: string; variant?: 'success' | 'error' }) => {
      setModerationToast(msg);
      setTimeout(() => setModerationToast(null), 4500);
    },
    []
  );

  const writeAuditLog = useCallback(
    async (
      actionType: AdminActionType,
      targetCollection: AdminTargetCollection,
      targetId: string,
      summary: string
    ) => {
      if (!isLiveAdmin || !firebaseUser) return;
      const logId = `log-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      try {
        await setDoc(doc(db, 'adminLogs', logId), {
          adminUid: firebaseUser.uid,
          adminEmail: (firebaseUser.email || DEFAULT_ADMIN_EMAIL_PLACEHOLDER).slice(0, 160),
          actionType,
          targetCollection,
          targetId: targetId.slice(0, 128),
          summary: summary.trim().slice(0, 300),
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        reportFirestoreError(err, OperationType.CREATE, `adminLogs/${logId}`);
      }
    },
    [isLiveAdmin, firebaseUser]
  );

  useEffect(() => {
    if (!isLiveAdmin || !firebaseUser) {
      setKycDocuments([]);
      setAdminDisputes([]);
      setReviewReports([]);
      setChatReports([]);
      return;
    }

    const unsubKyc = onSnapshot(
      query(collection(db, 'providerDocuments'), limit(100)),
      (snap) => {
        const list = snap.docs
          .map((d) => mapKycDoc(d.id, d.data()))
          .sort((a, b) => (b.submittedAtIso || '').localeCompare(a.submittedAtIso || ''));
        setKycDocuments(list);
      },
      (err) => reportFirestoreError(err, OperationType.LIST, 'providerDocuments')
    );

    const unsubDisputes = onSnapshot(
      query(collection(db, 'disputes'), limit(100)),
      (snap) => {
        const list = snap.docs
          .map((d) => mapAdminDispute(d.id, d.data()))
          .sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
        setAdminDisputes(list);
      },
      (err) => reportFirestoreError(err, OperationType.LIST, 'disputes')
    );

    const unsubReviewReports = onSnapshot(
      query(collection(db, 'reviewReports'), limit(100)),
      (snap) => {
        const list: AdminModerationReportItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            source: 'reviewReports',
            targetId: String(data.reviewId || ''),
            reporterId: String(data.reporterId || ''),
            reason: String(data.reason || ''),
            details: String(data.details || ''),
            status:
              data.status === 'reviewed' || data.status === 'dismissed' ? data.status : 'open',
            createdAtIso: formatTs(data.createdAt),
          };
        });
        setReviewReports(list);
      },
      (err) => reportFirestoreError(err, OperationType.LIST, 'reviewReports')
    );

    const unsubChatReports = onSnapshot(
      query(collection(db, 'chatReports'), limit(100)),
      (snap) => {
        const list: AdminModerationReportItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            source: 'chatReports',
            targetId: String(data.bookingId || ''),
            reporterId: String(data.reporterId || ''),
            reason: String(data.reason || ''),
            details: String(data.details || ''),
            status:
              data.status === 'reviewed' || data.status === 'resolved' ? data.status : 'open',
            createdAtIso: formatTs(data.createdAt),
          };
        });
        setChatReports(list);
      },
      (err) => reportFirestoreError(err, OperationType.LIST, 'chatReports')
    );

    return () => {
      unsubKyc();
      unsubDisputes();
      unsubReviewReports();
      unsubChatReports();
    };
  }, [isLiveAdmin, firebaseUser]);

  const moderationReports = useMemo(
    () =>
      [...reviewReports, ...chatReports].sort((a, b) =>
        b.createdAtIso.localeCompare(a.createdAtIso)
      ),
    [reviewReports, chatReports]
  );

  // Law 09-08 / CNDP Mandatory Sensitive Document Access Audit Log
  const logKycDocumentViewed = useCallback(
    async (record: ProviderKycDocumentRecord, docLabel: string) => {
      if (!isLiveAdmin || !firebaseUser) return;
      await writeAuditLog(
        'document_viewed',
        'providerDocuments',
        record.uid,
        `Consultation CNDP document privé (${docLabel}) du Maâlem ${record.uid} (${record.cinNumberMasked})`
      );
    },
    [isLiveAdmin, firebaseUser, writeAuditLog]
  );

  const reviewProviderKyc = useCallback(
    async (
      record: ProviderKycDocumentRecord,
      nextStatus: 'under_review' | 'verified' | 'rejected' | 'resubmission_required',
      rejectionReason?: string
    ) => {
      if (!isLiveAdmin || !firebaseUser) return;
      const safeReason = rejectionReason?.trim().slice(0, 300);
      try {
        await updateDoc(doc(db, 'providerDocuments', record.uid), {
          status: nextStatus,
          reviewedByUid: firebaseUser.uid,
          reviewedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          ...(safeReason ? { rejectionReason: safeReason } : {}),
        });

        // Synchronize public verifiedBadge on providers/{uid} & users/{uid} when approved or rejected
        if (nextStatus === 'verified' || nextStatus === 'rejected') {
          const isVerifiedFlag = nextStatus === 'verified';
          const providerRef = doc(db, 'providers', record.uid);
          const providerSnap = await getDoc(providerRef);
          if (providerSnap.exists()) {
            await updateDoc(providerRef, {
              verifiedBadge: isVerifiedFlag,
              updatedAt: serverTimestamp(),
            });
          }
          const userRef = doc(db, 'users', record.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            await updateDoc(userRef, {
              verifiedBadge: isVerifiedFlag,
              updatedAt: serverTimestamp(),
            });
          }
        }

        await writeAuditLog(
          'kyc_reviewed',
          'providerDocuments',
          record.uid,
          `Dossier KYC ${record.uid} (${record.cinNumberMasked}) → ${nextStatus}${
            safeReason ? ` (${safeReason})` : ''
          }`
        );

        void dispatchUserNotification({
          recipientUserId: record.uid,
          actorUserId: firebaseUser.uid,
          type: 'kyc_updated',
          titleFr:
            nextStatus === 'verified'
              ? 'Identité CIN vérifiée !'
              : 'Mise à jour de votre dossier CIN',
          titleAr:
            nextStatus === 'verified'
              ? 'تم التحقق من بطاقتك الوطنية!'
              : 'تحديث بخصوص ملف البطاقة الوطنية',
          bodyFr:
            nextStatus === 'verified'
              ? 'Votre badge Maâlem Vérifié CIN est désormais actif sur votre fiche publique.'
              : safeReason || `Statut du dossier KYC mis à jour : ${nextStatus}.`,
          bodyAr:
            nextStatus === 'verified'
              ? 'شارة المعلم الموثق بالبطاقة الوطنية مفعلة الآن على ملفك المهني.'
              : safeReason || `تم تحديث حالة التحقق من الهوية إلى: ${nextStatus}.`,
          linkPath: '/provider/verification',
        });

        flashToast({
          fr: `Dossier KYC (${record.cinNumberMasked}) mis à jour : ${nextStatus}`,
          ar: `تم تحديث ملف البطاقة الوطنية (${record.cinNumberMasked}): ${nextStatus}`,
        });
      } catch (err) {
        reportFirestoreError(err, OperationType.UPDATE, `providerDocuments/${record.uid}`);
        flashToast({
          fr: 'Impossible de mettre à jour le dossier KYC.',
          ar: 'تعذر تحديث ملف التحقق من الهوية.',
          variant: 'error',
        });
      }
    },
    [isLiveAdmin, firebaseUser, writeAuditLog, flashToast]
  );

  const updateAdminDispute = useCallback(
    async (dispute: DisputeRecord, nextStatus: DisputeStatus, resolutionSummary: string) => {
      if (!isLiveAdmin || !firebaseUser) return;
      const safeSummary = resolutionSummary.trim().slice(0, 600);
      try {
        await updateDoc(doc(db, 'disputes', dispute.id), {
          status: nextStatus,
          ...(safeSummary ? { resolutionSummary: safeSummary } : {}),
          ...(nextStatus === 'resolved' || nextStatus === 'closed'
            ? { resolvedByUid: firebaseUser.uid }
            : {}),
          updatedAt: serverTimestamp(),
        });

        await writeAuditLog(
          'dispute_resolved',
          'disputes',
          dispute.id,
          `Litige #${dispute.bookingRef} (${dispute.id}) → ${nextStatus}${
            safeSummary ? ` : ${safeSummary}` : ''
          }`
        );

        for (const recipientUid of [dispute.clientId, dispute.providerId]) {
          void dispatchUserNotification({
            recipientUserId: recipientUid,
            actorUserId: firebaseUser.uid,
            type: 'dispute_resolved',
            titleFr: `Litige #${dispute.bookingRef} : ${nextStatus}`,
            titleAr: `تحديث ملف النزاع #${dispute.bookingRef}`,
            bodyFr: safeSummary || `Le statut de votre dossier de médiation est désormais : ${nextStatus}.`,
            bodyAr: safeSummary || `تم تحديث حالة ملف النزاع إلى: ${nextStatus}.`,
            linkPath: '/disputes',
          });
        }

        flashToast({
          fr: `Litige #${dispute.bookingRef} mis à jour → ${nextStatus}`,
          ar: `تم تحديث النزاع #${dispute.bookingRef} ← ${nextStatus}`,
        });
      } catch (err) {
        reportFirestoreError(err, OperationType.UPDATE, `disputes/${dispute.id}`);
        flashToast({
          fr: 'Erreur lors de la mise à jour du litige.',
          ar: 'تعذر تحديث ملف النزاع.',
          variant: 'error',
        });
      }
    },
    [isLiveAdmin, firebaseUser, writeAuditLog, flashToast]
  );

  const moderateReport = useCallback(
    async (
      report: AdminModerationReportItem,
      nextStatus: 'reviewed' | 'resolved' | 'dismissed'
    ) => {
      if (!isLiveAdmin || !firebaseUser) return;
      // Align with allowed status enum per collection in firestore.rules
      const safeStatus =
        report.source === 'reviewReports'
          ? nextStatus === 'resolved'
            ? 'reviewed'
            : nextStatus
          : nextStatus === 'dismissed'
          ? 'resolved'
          : nextStatus;
      try {
        await updateDoc(doc(db, report.source, report.id), {
          status: safeStatus,
        });

        await writeAuditLog(
          'report_moderated',
          report.source,
          report.id,
          `Signalement ${report.source}/${report.id} (${report.reason}) → ${safeStatus}`
        );

        flashToast({
          fr: `Signalement classé : ${safeStatus}`,
          ar: `تمت معالجة البلاغ: ${safeStatus}`,
        });
      } catch (err) {
        reportFirestoreError(err, OperationType.UPDATE, `${report.source}/${report.id}`);
        flashToast({
          fr: 'Impossible de mettre à jour ce signalement.',
          ar: 'تعذر تحديث حالة البلاغ.',
          variant: 'error',
        });
      }
    },
    [isLiveAdmin, firebaseUser, writeAuditLog, flashToast]
  );

  const toggleUserAccountSuspension = useCallback(
    async (user: UserProfileRecord) => {
      if (!isLiveAdmin || !firebaseUser) return;
      const nextStatus: 'active' | 'suspended' =
        user.accountStatus === 'suspended' ? 'active' : 'suspended';
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          accountStatus: nextStatus,
          updatedAt: serverTimestamp(),
        });

        await writeAuditLog(
          'user_suspended',
          'users',
          user.uid,
          `Compte utilisateur ${user.fullName} (${user.uid}) → ${nextStatus}`
        );

        flashToast({
          fr:
            nextStatus === 'suspended'
              ? `Compte suspendu : ${user.fullName}`
              : `Compte réactivé : ${user.fullName}`,
          ar:
            nextStatus === 'suspended'
              ? `تم تعليق الحساب: ${user.fullName}`
              : `تم إعادة تفعيل الحساب: ${user.fullName}`,
        });
      } catch (err) {
        reportFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
        flashToast({
          fr: 'Impossible de modifier le statut du compte.',
          ar: 'تعذر تغيير حالة الحساب.',
          variant: 'error',
        });
      }
    },
    [isLiveAdmin, firebaseUser, writeAuditLog, flashToast]
  );

  return {
    kycDocuments,
    adminDisputes,
    moderationReports,
    moderationToast,
    logKycDocumentViewed,
    reviewProviderKyc,
    updateAdminDispute,
    moderateReport,
    toggleUserAccountSuspension,
  };
}
