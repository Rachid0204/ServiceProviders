import { useState, useEffect, useCallback } from 'react';
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
  buildScheduleLockId,
  computeQuotationTotals,
  generateBookingIds,
  generateJobPostIds,
  isQuotationExpired,
  isSafeImageUrl,
  type JobPostRecord,
  type JobPostStatus,
  type JobProposalRecord,
  type JobUrgency,
  type LanguageCode,
  type MoroccanCity,
  type ProposalStatus,
  type ServiceCategory,
  type TimeSlot,
  type UserProfileRecord,
  type VettedProvider,
} from '../utils/marketplace';
import { buildBootstrapClientProfile } from '../utils/authHelpers';

function formatIsoDate(ts: unknown): string {
  if (ts && typeof ts === 'object' && 'toDate' in ts) {
    try {
      return (ts as Timestamp).toDate().toISOString().slice(0, 10);
    } catch {
      // fallback
    }
  }
  return new Date().toISOString().slice(0, 10);
}

function mapFirestoreJobPost(id: string, data: DocumentData): JobPostRecord {
  return {
    id,
    jobRef: String(data.jobRef || id.slice(0, 8).toUpperCase()),
    clientId: String(data.clientId || ''),
    clientName: String(data.clientName || ''),
    clientPhone: String(data.clientPhone || ''),
    title: String(data.title || ''),
    category: (data.category as ServiceCategory) || 'Plomberie',
    city: (data.city as MoroccanCity) || 'Casablanca',
    neighborhood: String(data.neighborhood || ''),
    description: String(data.description || ''),
    budgetMad: Number(data.budgetMad || 0),
    urgency:
      data.urgency === 'urgent' || data.urgency === 'this_week' || data.urgency === 'flexible'
        ? (data.urgency as JobUrgency)
        : 'this_week',
    preferredDate: String(data.preferredDate || ''),
    preferredTimeSlot: (data.preferredTimeSlot as TimeSlot) || '09:00 - 12:00',
    problemPhotoUrl:
      typeof data.problemPhotoUrl === 'string' && isSafeImageUrl(data.problemPhotoUrl)
        ? data.problemPhotoUrl
        : undefined,
    status: (data.status as JobPostStatus) || 'open',
    proposalCount: typeof data.proposalCount === 'number' ? data.proposalCount : 0,
    assignedProviderId: data.assignedProviderId ? String(data.assignedProviderId) : undefined,
    assignedProviderName: data.assignedProviderName ? String(data.assignedProviderName) : undefined,
    assignedBookingId: data.assignedBookingId ? String(data.assignedBookingId) : undefined,
    createdAtIso: formatIsoDate(data.createdAt),
  };
}

function mapFirestoreProposal(id: string, data: DocumentData): JobProposalRecord {
  return {
    id,
    jobId: String(data.jobId || ''),
    clientId: String(data.clientId || ''),
    providerId: String(data.providerId || id),
    providerName: String(data.providerName || ''),
    providerPhone: String(data.providerPhone || ''),
    providerCategory: (data.providerCategory as ServiceCategory) || 'Plomberie',
    providerCity: (data.providerCity as MoroccanCity) || 'Casablanca',
    providerRating: Number(data.providerRating ?? 5.0),
    providerVerified: Boolean(data.providerVerified),
    proposedPriceMad: Number(data.proposedPriceMad || 0),
    laborCostMad: typeof data.laborCostMad === 'number' ? data.laborCostMad : undefined,
    materialsCostMad: typeof data.materialsCostMad === 'number' ? data.materialsCostMad : undefined,
    validUntilIso: typeof data.validUntilIso === 'string' ? data.validUntilIso : undefined,
    warrantyNote: typeof data.warrantyNote === 'string' ? data.warrantyNote : undefined,
    estimatedDuration: String(data.estimatedDuration || ''),
    message: String(data.message || ''),
    status: (data.status as ProposalStatus) || 'pending',
    createdAtIso: formatIsoDate(data.createdAt),
  };
}

export interface CreateJobPostPayload {
  jobId?: string;
  jobRef?: string;
  clientName: string;
  clientPhone: string;
  title: string;
  category: ServiceCategory;
  city: MoroccanCity;
  neighborhood: string;
  description: string;
  budgetMad: number;
  urgency: JobUrgency;
  preferredDate: string;
  preferredTimeSlot: TimeSlot;
  problemPhotoUrl?: string;
}

export interface SubmitProposalPayload {
  proposedPriceMad: number;
  laborCostMad?: number;
  materialsCostMad?: number;
  validUntilIso?: string;
  warrantyNote?: string;
  estimatedDuration: string;
  message: string;
}

export function useJobPosts(params: {
  firebaseUser: User | null;
  authReady: boolean;
  isVerified: boolean;
  userProfile: UserProfileRecord | null;
  ownProvider: VettedProvider | null;
  lang: LanguageCode;
  onBootstrapUserProfile?: (profile: UserProfileRecord) => void;
}) {
  const {
    firebaseUser,
    authReady,
    isVerified,
    userProfile,
    ownProvider,
    lang,
    onBootstrapUserProfile,
  } = params;

  const [openJobPosts, setOpenJobPosts] = useState<JobPostRecord[]>([]);
  const [myClientJobPosts, setMyClientJobPosts] = useState<JobPostRecord[]>([]);
  const [myProposalsByJobId, setMyProposalsByJobId] = useState<
    Record<string, JobProposalRecord>
  >({});
  const [jobActionError, setJobActionError] = useState<string | null>(null);

  // Listen to open jobs for Maâlems / Double Accounts AND own posted jobs for Clients
  useEffect(() => {
    if (!authReady || !firebaseUser || !isVerified) {
      setOpenJobPosts([]);
      setMyClientJobPosts([]);
      setMyProposalsByJobId({});
      return;
    }

    const openQuery = query(
      collection(db, 'jobPosts'),
      where('status', '==', 'open'),
      limit(100)
    );
    const mineQuery = query(
      collection(db, 'jobPosts'),
      where('clientId', '==', firebaseUser.uid),
      limit(50)
    );

    const unsubOpen = onSnapshot(
      openQuery,
      (snap) => {
        const list = snap.docs
          .map((d) => mapFirestoreJobPost(d.id, d.data()))
          .sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
        setOpenJobPosts(list);
      },
      (err) => {
        reportFirestoreError(err, OperationType.LIST, 'jobPosts');
      }
    );

    const unsubMine = onSnapshot(
      mineQuery,
      (snap) => {
        const list = snap.docs
          .map((d) => mapFirestoreJobPost(d.id, d.data()))
          .sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
        setMyClientJobPosts(list);
      },
      (err) => {
        reportFirestoreError(err, OperationType.LIST, 'jobPosts');
      }
    );

    return () => {
      unsubOpen();
      unsubMine();
    };
  }, [authReady, firebaseUser, isVerified]);

  // For signed-in Maâlems, check which open jobs they already sent a proposal on (using deterministic doc ID == uid)
  useEffect(() => {
    if (!firebaseUser || !isVerified || !ownProvider || openJobPosts.length === 0) {
      return;
    }
    let active = true;
    const checkMyProposals = async () => {
      const candidateJobs = openJobPosts.filter((j) => j.clientId !== firebaseUser.uid);
      const entries = await Promise.all(
        candidateJobs.map(async (job) => {
          try {
            const snap = await getDoc(
              doc(db, 'jobPosts', job.id, 'proposals', firebaseUser.uid)
            );
            if (snap.exists()) {
              return [job.id, mapFirestoreProposal(snap.id, snap.data())] as const;
            }
          } catch {
            // ignore missing/denied
          }
          return null;
        })
      );
      if (!active) return;
      const nextMap: Record<string, JobProposalRecord> = {};
      for (const entry of entries) {
        if (entry) nextMap[entry[0]] = entry[1];
      }
      setMyProposalsByJobId((prev) => ({ ...prev, ...nextMap }));
    };
    void checkMyProposals();
    return () => {
      active = false;
    };
  }, [firebaseUser?.uid, isVerified, ownProvider?.uid, openJobPosts]);

  const createJobPost = useCallback(
    async (payload: CreateJobPostPayload): Promise<string> => {
      setJobActionError(null);
      if (!firebaseUser || !isVerified) {
        throw new Error(
          lang === 'ar'
            ? 'يرجى تسجيل الدخول وتأكيد بريدك الإلكتروني لنشر طلبك.'
            : 'Veuillez vous connecter et vérifier votre e-mail pour publier un besoin.'
        );
      }

      const generated = generateJobPostIds();
      const jobId = payload.jobId || generated.jobId;
      const jobRef = payload.jobRef || generated.jobRef;
      const safePhotoUrl = isSafeImageUrl(payload.problemPhotoUrl)
        ? payload.problemPhotoUrl
        : undefined;

      const jobDocData = {
        jobRef,
        clientId: firebaseUser.uid,
        clientName: payload.clientName.trim().slice(0, 80),
        clientPhone: payload.clientPhone,
        title: payload.title.trim().slice(0, 120),
        category: payload.category,
        city: payload.city,
        neighborhood: payload.neighborhood.trim().slice(0, 80),
        description: payload.description.trim().slice(0, 800),
        budgetMad: Math.max(50, Math.min(100000, Math.round(payload.budgetMad))),
        urgency: payload.urgency,
        preferredDate: payload.preferredDate,
        preferredTimeSlot: payload.preferredTimeSlot,
        ...(safePhotoUrl ? { problemPhotoUrl: safePhotoUrl } : {}),
        status: 'open',
        proposalCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const path = `jobPosts/${jobId}`;
      try {
        let needsBootstrap = !userProfile || userProfile.uid !== firebaseUser.uid;
        if (needsBootstrap) {
          const existingSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
          needsBootstrap = !existingSnap.exists();
        }
        if (needsBootstrap) {
          const bootstrapProfile = buildBootstrapClientProfile({
            uid: firebaseUser.uid,
            fullName: payload.clientName,
            phone: payload.clientPhone,
            city: payload.city,
            neighborhood: payload.neighborhood,
            languagePref: lang,
          });
          const batch = writeBatch(db);
          batch.set(doc(db, 'users', firebaseUser.uid), {
            ...bootstrapProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          batch.set(doc(db, 'jobPosts', jobId), jobDocData);
          await batch.commit();
          onBootstrapUserProfile?.(bootstrapProfile);
        } else {
          await setDoc(doc(db, 'jobPosts', jobId), jobDocData);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }

      return jobRef;
    },
    [firebaseUser, isVerified, userProfile, lang, onBootstrapUserProfile]
  );

  const cancelJobPost = useCallback(
    async (jobId: string) => {
      setJobActionError(null);
      if (!firebaseUser || !isVerified) return;
      const path = `jobPosts/${jobId}`;
      try {
        await updateDoc(doc(db, 'jobPosts', jobId), {
          status: 'cancelled',
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        reportFirestoreError(err, OperationType.UPDATE, path);
        setJobActionError(
          lang === 'ar'
            ? 'تعذر إلغاء الإعلان.'
            : 'Impossible d’annuler cette annonce pour le moment.'
        );
      }
    },
    [firebaseUser, isVerified, lang]
  );

  const submitJobProposal = useCallback(
    async (job: JobPostRecord, payload: SubmitProposalPayload) => {
      setJobActionError(null);
      if (!firebaseUser || !isVerified || !ownProvider) {
        throw new Error(
          lang === 'ar'
            ? 'يرجى إكمال بطاقة المعلم الخاصة بك أولاً قبل تقديم عرض.'
            : 'Complétez d’abord votre Fiche Maâlem avant de proposer un devis.'
        );
      }
      if (job.clientId === firebaseUser.uid) {
        throw new Error(
          lang === 'ar'
            ? 'لا يمكنك تقديم عرض على طلبك الخاص.'
            : 'Vous ne pouvez pas proposer un devis sur votre propre annonce.'
        );
      }

      const providerName = (
        lang === 'ar' ? ownProvider.fullNameAr : ownProvider.fullNameFr
      ).slice(0, 80);

      const hasItemized =
        payload.laborCostMad !== undefined || payload.materialsCostMad !== undefined;
      const totals = hasItemized
        ? computeQuotationTotals(payload.laborCostMad ?? 0, payload.materialsCostMad ?? 0)
        : null;
      const finalPriceMad = Math.max(
        50,
        Math.min(100000, Math.round(totals && totals.totalMad >= 50 ? totals.totalMad : payload.proposedPriceMad))
      );

      const proposalData = {
        jobId: job.id,
        clientId: job.clientId,
        providerId: firebaseUser.uid,
        providerName,
        providerPhone: ownProvider.phone,
        providerCategory: ownProvider.category,
        providerCity: ownProvider.location.city,
        providerRating: Number(ownProvider.ratingAvg ?? 5.0),
        providerVerified: Boolean(ownProvider.verifiedBadge),
        proposedPriceMad: finalPriceMad,
        ...(totals && totals.totalMad === finalPriceMad
          ? {
              laborCostMad: totals.laborCostMad,
              materialsCostMad: totals.materialsCostMad,
            }
          : {}),
        ...(payload.validUntilIso && payload.validUntilIso.length >= 8
          ? { validUntilIso: payload.validUntilIso.slice(0, 16) }
          : {}),
        ...(payload.warrantyNote && payload.warrantyNote.trim()
          ? { warrantyNote: payload.warrantyNote.trim().slice(0, 160) }
          : {}),
        estimatedDuration: payload.estimatedDuration.trim().slice(0, 64),
        message: payload.message.trim().slice(0, 500),
        status: 'pending' as ProposalStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const proposalRef = doc(db, 'jobPosts', job.id, 'proposals', firebaseUser.uid);
      const jobDocRef = doc(db, 'jobPosts', job.id);
      const path = `jobPosts/${job.id}/proposals/${firebaseUser.uid}`;
      try {
        const batch = writeBatch(db);
        batch.set(proposalRef, proposalData);
        batch.update(jobDocRef, {
          proposalCount: (job.proposalCount || 0) + 1,
          lastProposalProviderId: firebaseUser.uid,
          updatedAt: serverTimestamp(),
        });
        await batch.commit();

        setMyProposalsByJobId((prev) => ({
          ...prev,
          [job.id]: {
            id: firebaseUser.uid,
            ...proposalData,
            createdAtIso: new Date().toISOString().slice(0, 10),
          },
        }));
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    },
    [firebaseUser, isVerified, ownProvider, lang]
  );

  const withdrawJobProposal = useCallback(
    async (jobId: string) => {
      setJobActionError(null);
      if (!firebaseUser || !isVerified) return;
      const path = `jobPosts/${jobId}/proposals/${firebaseUser.uid}`;
      try {
        await updateDoc(doc(db, 'jobPosts', jobId, 'proposals', firebaseUser.uid), {
          status: 'withdrawn',
          updatedAt: serverTimestamp(),
        });
        setMyProposalsByJobId((prev) =>
          prev[jobId]
            ? { ...prev, [jobId]: { ...prev[jobId], status: 'withdrawn' } }
            : prev
        );
      } catch (err) {
        reportFirestoreError(err, OperationType.UPDATE, path);
        setJobActionError(
          lang === 'ar' ? 'تعذر سحب العرض.' : 'Impossible de retirer ce devis.'
        );
      }
    },
    [firebaseUser, isVerified, lang]
  );

  const rejectJobProposal = useCallback(
    async (jobId: string, providerId: string) => {
      setJobActionError(null);
      if (!firebaseUser || !isVerified) return;
      const path = `jobPosts/${jobId}/proposals/${providerId}`;
      try {
        await updateDoc(doc(db, 'jobPosts', jobId, 'proposals', providerId), {
          status: 'rejected',
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        reportFirestoreError(err, OperationType.UPDATE, path);
        setJobActionError(
          lang === 'ar' ? 'تعذر رفض هذا العرض.' : 'Impossible de refuser ce devis pour le moment.'
        );
      }
    },
    [firebaseUser, isVerified, lang]
  );

  /**
   * Transactional proposal acceptance (anti-double-acceptance & anti-double-booking):
   * Atomically verifies the job is still open, the quote is pending & unexpired, and
   * acquires a deterministic schedule slot lock before assigning the job & creating the booking.
   */
  const acceptProposalAndCreateBooking = useCallback(
    async (job: JobPostRecord, proposal: JobProposalRecord): Promise<string> => {
      setJobActionError(null);
      if (!firebaseUser || !isVerified || job.clientId !== firebaseUser.uid) {
        throw new Error('Unauthorized');
      }

      if (isQuotationExpired(proposal.validUntilIso)) {
        throw new Error(
          lang === 'ar'
            ? 'انتهت صلاحية هذا العرض. يرجى اختيار عرض آخر أو طلب تحديثه.'
            : 'Ce devis a expiré. Veuillez choisir un autre devis ou demander un devis actualisé.'
        );
      }

      const { bookingId, bookingRef } = generateBookingIds();
      const jobDocRef = doc(db, 'jobPosts', job.id);
      const proposalRef = doc(db, 'jobPosts', job.id, 'proposals', proposal.providerId);
      const bookingDocRef = doc(db, 'bookings', bookingId);
      const lockId = buildScheduleLockId(
        proposal.providerId,
        job.preferredDate,
        job.preferredTimeSlot
      );
      const lockRef = doc(db, 'scheduleLocks', lockId);
      const path = `jobPosts/${job.id}`;

      const bookingPayload = {
        bookingRef,
        clientId: firebaseUser.uid,
        clientName: job.clientName,
        clientPhone: job.clientPhone,
        providerId: proposal.providerId,
        providerName: proposal.providerName,
        providerPhone: proposal.providerPhone,
        category: job.category,
        serviceType: job.title.slice(0, 120),
        city: job.city,
        neighborhood: job.neighborhood,
        addressPin: `${job.neighborhood}, ${job.city} (${job.jobRef})`.slice(0, 160),
        description: `${job.description} — Devis accepté (${proposal.estimatedDuration})`.slice(0, 600),
        ...(job.problemPhotoUrl ? { problemPhotoUrl: job.problemPhotoUrl } : {}),
        preferredDate: job.preferredDate,
        preferredTimeSlot: job.preferredTimeSlot,
        paymentMethod: 'cash_on_completion',
        paymentStatus: 'unpaid_cod',
        estimatedMad: Math.max(50, Math.min(100000, Math.round(proposal.proposedPriceMad))),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await runTransaction(db, async (tx) => {
          const [liveJobSnap, livePropSnap, liveLockSnap] = await Promise.all([
            tx.get(jobDocRef),
            tx.get(proposalRef),
            tx.get(lockRef),
          ]);

          if (!liveJobSnap.exists() || liveJobSnap.data().status !== 'open') {
            throw new Error(
              lang === 'ar'
                ? 'تم تعيين هذا الطلب بالفعل أو لم يعد مفتوحاً.'
                : 'Cette annonce a déjà été attribuée ou n’est plus ouverte.'
            );
          }

          if (!livePropSnap.exists() || livePropSnap.data().status !== 'pending') {
            throw new Error(
              lang === 'ar'
                ? 'هذا العرض لم يعد متاحاً للقبول.'
                : 'Ce devis n’est plus en attente de validation.'
            );
          }

          if (liveLockSnap.exists()) {
            throw new Error(
              lang === 'ar'
                ? 'هذا المعلم محجوز بالفعل في نفس التاريخ والفترة الزمنية.'
                : 'Ce Maâlem est déjà réservé sur ce créneau horaire. Veuillez choisir un autre devis ou horaire.'
            );
          }

          tx.update(jobDocRef, {
            status: 'assigned',
            assignedProviderId: proposal.providerId,
            assignedProviderName: proposal.providerName,
            assignedBookingId: bookingId,
            updatedAt: serverTimestamp(),
          });
          tx.update(proposalRef, {
            status: 'accepted',
            updatedAt: serverTimestamp(),
          });
          tx.set(bookingDocRef, bookingPayload);
          tx.set(lockRef, {
            providerId: proposal.providerId,
            clientId: firebaseUser.uid,
            bookingId,
            preferredDate: job.preferredDate,
            preferredTimeSlot: job.preferredTimeSlot,
            createdAt: serverTimestamp(),
          });
        });

        return bookingRef;
      } catch (err) {
        if (err instanceof Error && !err.message.toLowerCase().includes('permission')) {
          throw err;
        }
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    },
    [firebaseUser, isVerified, lang]
  );

  return {
    openJobPosts,
    myClientJobPosts,
    myProposalsByJobId,
    jobActionError,
    clearJobActionError: () => setJobActionError(null),
    createJobPost,
    cancelJobPost,
    submitJobProposal,
    withdrawJobProposal,
    rejectJobProposal,
    acceptProposalAndCreateBooking,
  };
}

/**
 * Real-time subcollection listener for incoming Maâlem proposals on a Client's specific job post.
 */
export function useJobProposalsForClient(jobId: string | null, enabled: boolean) {
  const [proposals, setProposals] = useState<JobProposalRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!jobId || !enabled) {
      setProposals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, 'jobPosts', jobId, 'proposals'), limit(50));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => mapFirestoreProposal(d.id, d.data()))
          .sort((a, b) => a.proposedPriceMad - b.proposedPriceMad);
        setProposals(list);
        setLoading(false);
      },
      (err) => {
        reportFirestoreError(err, OperationType.LIST, `jobPosts/${jobId}/proposals`);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [jobId, enabled]);

  return { proposals, loading };
}
