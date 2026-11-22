import { useState, useEffect, useMemo, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  type DocumentData,
  type Timestamp,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, reportFirestoreError, OperationType } from '../firebase';
import {
  DEFAULT_ADMIN_EMAIL_PLACEHOLDER,
  computeAdminAnalytics,
  flattenProviderReviews,
  recalculateRatingAfterReviewRemoval,
  type AdminActionType,
  type AdminAuditLog,
  type AdminReviewItem,
  type AdminTargetCollection,
  type SystemSettingsRecord,
  type WithdrawalRecord,
  type WithdrawalStatus,
} from '../utils/adminMetrics';
import { hasAdminCustomClaim, isVerifiedAuthUser } from '../utils/authHelpers';
import {
  calculateEscrowSplit,
  getNextPaymentStatus,
  isValidMoroccanPhone,
  normalizeMoroccanPhone,
  type BookingRecord,
  type BookingStatus,
  type MoroccanCity,
  type PaymentMethod,
  type PaymentStatus,
  type ServiceCategory,
  type TimeSlot,
  type UserProfileRecord,
  type VettedProvider,
} from '../utils/marketplace';
import type { ProviderOverride } from './useProviders';
import type { AdminBookingPatch } from './useBookings';

// Preview-only pending-CIN applicants (never mixed into live authenticated Admin views)
const SEEDED_PENDING_APPLICANTS: VettedProvider[] = [
  {
    uid: 'maalem-rachid-marrakech',
    id: 'maalem-rachid-marrakech',
    fullNameFr: 'Maâlem Rachid Mansouri',
    fullNameAr: 'المعلم رشيد المنصوري',
    category: 'Climatisation',
    bioFr:
      'Technicien frigoriste spécialisé en climatisation Inverter résidentielle et entretien groupes extérieurs à Marrakech (Guéliz, Hivernage). Dossier CIN déposé pour vérification.',
    bioAr:
      'تقني تكييف وتبريد متخصص في مكيفات Inverter وصيانة الوحدات الخارجية بمراكش (جليز، الحي الشتوي). تم إيداع ملف البطاقة الوطنية للتحقق.',
    hourlyRateMAD: 165,
    fixedVisitFeeMAD: 80,
    experienceYears: 7,
    skills: ['Installation Split Inverter', 'Entretien préventif', 'Diagnostic carte'],
    skillsAr: ['تركيب مكيفات Inverter', 'صيانة وقائية', 'تشخيص اللوحة الإلكترونية'],
    portfolioImages: ['/src/assets/images/service_electrical_smart_1794980478001.jpg'],
    ratingAvg: 5.0,
    reviewCount: 0,
    isAvailableNow: true,
    verifiedBadge: false,
    cinVerified: false,
    cinNumberMasked: 'EE-••••19',
    diplomaFr: 'Attestation OFPPT Froid & Climatisation — Marrakech',
    diplomaAr: 'شهادة التكوين المهني في التبريد والتكييف — مراكش',
    completedJobs: 0,
    responseMinutes: 25,
    phone: '+212667412890',
    location: {
      lat: 31.6346,
      lng: -8.0102,
      city: 'Marrakech',
      quartier: 'Guéliz',
      quartierAr: 'جليز',
    },
    reviews: [],
  },
  {
    uid: 'maalem-nadia-fes',
    id: 'maalem-nadia-fes',
    fullNameFr: 'Atelier Nadia Benjelloun',
    fullNameAr: 'ورشة نادية بنجلون',
    category: 'Peinture',
    bioFr:
      'Spécialiste décoration murale contemporaine, tadelakt et enduits écologiques à Fès (Ville Nouvelle, Atlas). En attente de validation finale CIN.',
    bioAr:
      'متخصصة في الصباغة الديكورية العصرية، التدلاكت والدهانات الصديقة للبيئة بفاس (المدينة الجديدة، الأطلس). في انتظار المصادقة النهائية على البطاقة الوطنية.',
    hourlyRateMAD: 140,
    fixedVisitFeeMAD: 60,
    experienceYears: 9,
    skills: ['Peinture décorative Khayal', 'Tadelakt artisanal', 'Enduit sans odeur'],
    skillsAr: ['صباغة خيال الديكورية', 'تدلاكت تقليدي', 'معجون بدون رائحة'],
    portfolioImages: ['/src/assets/images/service_home_painting_1794980476260.jpg'],
    ratingAvg: 5.0,
    reviewCount: 0,
    isAvailableNow: false,
    verifiedBadge: false,
    cinVerified: false,
    cinNumberMasked: 'CD-••••84',
    diplomaFr: 'Certificat Artisanat & Décoration Murale — Fès',
    diplomaAr: 'شهادة الصناعة التقليدية والديكور الجداري — فاس',
    completedJobs: 0,
    responseMinutes: 30,
    phone: '+212668523914',
    location: {
      lat: 34.0331,
      lng: -5.0003,
      city: 'Fes',
      quartier: 'Ville Nouvelle',
      quartierAr: 'المدينة الجديدة',
    },
    reviews: [],
  },
];

function formatTimestamp(ts: unknown): string {
  if (ts && typeof ts === 'object' && 'toDate' in ts) {
    try {
      const d = (ts as Timestamp).toDate();
      return `${d.toISOString().slice(0, 10)} ${d.toTimeString().slice(0, 5)}`;
    } catch {
      // fallback below
    }
  }
  const now = new Date();
  return `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`;
}

function mapAdminFirestoreBooking(id: string, data: DocumentData): BookingRecord {
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
    clientId: String(data.clientId || ''),
    clientName: String(data.clientName || 'Client'),
    clientPhone: String(data.clientPhone || '+212661000000'),
    providerId: String(data.providerId || ''),
    providerName: String(data.providerName || 'Maâlem'),
    providerPhone: String(data.providerPhone || '+212661000000'),
    category: (data.category as ServiceCategory) || 'Plomberie',
    serviceType: String(data.serviceType || data.category || 'Intervention'),
    city: (data.city as MoroccanCity) || 'Casablanca',
    neighborhood: String(data.neighborhood || 'Centre'),
    addressPin: String(data.addressPin || data.neighborhood || ''),
    description: String(data.description || ''),
    problemPhotoUrl: data.problemPhotoUrl ? String(data.problemPhotoUrl) : undefined,
    preferredDate: String(data.preferredDate || ''),
    preferredTimeSlot: (data.preferredTimeSlot as TimeSlot) || '09:00 - 12:00',
    paymentMethod,
    paymentStatus,
    estimatedMad: Number(data.estimatedMad || 0),
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
    createdAtIso: formatTimestamp(data.createdAt).slice(0, 10),
  };
}

export interface AdminToastMessage {
  fr: string;
  ar: string;
  variant?: 'success' | 'error';
}

export function useAdminData(params: {
  enabled: boolean;
  firebaseUser: User | null;
  authReady: boolean;
  allProviders: VettedProvider[];
  firestoreProviders: VettedProvider[];
  bookings: BookingRecord[];
  systemSettings: SystemSettingsRecord;
  onUpdateLocalSettings: (next: SystemSettingsRecord) => void;
  onApplyProviderOverride: (providerId: string, patch: ProviderOverride) => void;
  onRemoveProviderReview: (
    providerId: string,
    reviewId: string,
    recalculated?: { ratingAvg: number; reviewCount: number }
  ) => void;
  onApplyBookingPatch: (bookingId: string, patch: AdminBookingPatch) => void;
}) {
  const {
    enabled,
    firebaseUser,
    authReady,
    allProviders,
    firestoreProviders,
    bookings,
    systemSettings,
    onUpdateLocalSettings,
    onApplyProviderOverride,
    onRemoveProviderReview,
    onApplyBookingPatch,
  } = params;

  const [isLiveAdmin, setIsLiveAdmin] = useState<boolean>(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState<boolean>(true);
  const [liveUsers, setLiveUsers] = useState<UserProfileRecord[]>([]);
  const [liveBookings, setLiveBookings] = useState<BookingRecord[]>([]);
  const [liveLogs, setLiveLogs] = useState<AdminAuditLog[]>([]);
  const [liveWithdrawals, setLiveWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [liveReviews, setLiveReviews] = useState<AdminReviewItem[]>([]);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState<boolean>(false);
  const [adminToast, setAdminToast] = useState<AdminToastMessage | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Resolve verified Admin privileges without hardcoding personal admin email in client JS:
  // 1) Signed Firebase ID token custom claim (`admin: true`) — zero Firestore reads
  // 2) `/admins/{uid}` document lookup — allowed by rules for any verified user (zero Denies)
  // 3) When actively visiting `/admin`, probe `adminLogs` (limit 1) so server-side bootstrapped admin succeeds
  useEffect(() => {
    if (!authReady) {
      setIsCheckingAdmin(true);
      return;
    }
    if (!firebaseUser || !isVerifiedAuthUser(firebaseUser)) {
      setIsLiveAdmin(false);
      setIsCheckingAdmin(false);
      return;
    }

    let cancelled = false;
    setIsCheckingAdmin(true);

    (async () => {
      try {
        const tokenResult = await firebaseUser.getIdTokenResult();
        if (cancelled) return;
        if (hasAdminCustomClaim(tokenResult.claims)) {
          setIsLiveAdmin(true);
          setIsCheckingAdmin(false);
          return;
        }
      } catch {
        // Continue to Firestore /admins/{uid} lookup
      }

      try {
        const adminSnap = await getDoc(doc(db, 'admins', firebaseUser.uid));
        if (cancelled) return;
        if (adminSnap.exists()) {
          setIsLiveAdmin(true);
          setIsCheckingAdmin(false);
          return;
        }
      } catch {
        // Continue
      }

      if (enabled) {
        try {
          await getDocs(query(collection(db, 'adminLogs'), limit(1)));
          if (!cancelled) {
            setIsLiveAdmin(true);
            setIsCheckingAdmin(false);
          }
          return;
        } catch {
          // Not authorized as admin
        }
      }

      if (!cancelled) {
        setIsLiveAdmin(false);
        setIsCheckingAdmin(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, firebaseUser, enabled]);

  // Attach real-time Firestore listeners ONLY when on the Admin view AND authenticated as a verified admin
  useEffect(() => {
    if (!enabled || !authReady || !isLiveAdmin) {
      setLiveUsers([]);
      setLiveBookings([]);
      setLiveLogs([]);
      setLiveWithdrawals([]);
      setLiveReviews([]);
      setIsLoadingAdmin(false);
      return;
    }

    setIsLoadingAdmin(true);
    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), limit(300)),
      (snap) => {
        const list: UserProfileRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            uid: d.id,
            role:
              data.role === 'provider'
                ? 'provider'
                : data.role === 'both'
                ? 'both'
                : 'client',
            fullName: String(data.fullName || 'Utilisateur'),
            phone: String(data.phone || '+212661000000'),
            city: (data.city as MoroccanCity) || 'Casablanca',
            neighborhood: String(data.neighborhood || 'Centre'),
            languagePref: data.languagePref === 'ar' ? 'ar' : 'fr',
            verifiedBadge: Boolean(data.verifiedBadge),
            specialty: data.specialty as ServiceCategory | 'none' | undefined,
            hourlyRateMad: typeof data.hourlyRateMad === 'number' ? data.hourlyRateMad : undefined,
            bio: data.bio ? String(data.bio) : undefined,
          };
        });
        setLiveUsers(list);
        setIsLoadingAdmin(false);
      },
      (err) => {
        setIsLoadingAdmin(false);
        reportFirestoreError(err, OperationType.LIST, 'users');
      }
    );

    const unsubBookings = onSnapshot(
      query(collection(db, 'bookings'), limit(300)),
      (snap) => {
        setLiveBookings(snap.docs.map((d) => mapAdminFirestoreBooking(d.id, d.data())));
      },
      (err) => {
        reportFirestoreError(err, OperationType.LIST, 'bookings');
      }
    );

    const unsubWithdrawals = onSnapshot(
      query(collection(db, 'withdrawals'), limit(200)),
      (snap) => {
        setLiveWithdrawals(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              providerId: String(data.providerId || ''),
              providerName: String(data.providerName || 'Maâlem'),
              city: (data.city as MoroccanCity) || 'Casablanca',
              bankName: String(data.bankName || ''),
              ribMasked: String(data.ribMasked || ''),
              amountMad: Number(data.amountMad || 0),
              status: (data.status as WithdrawalStatus) || 'pending',
              adminNote: data.adminNote ? String(data.adminNote) : undefined,
              createdAtIso: formatTimestamp(data.createdAt),
            };
          })
        );
      },
      (err) => {
        reportFirestoreError(err, OperationType.LIST, 'withdrawals');
      }
    );

    const unsubReviews = onSnapshot(
      query(collection(db, 'reviews'), limit(200)),
      (snap) => {
        const providerById = new Map(allProviders.map((p) => [p.id, p]));
        const items: AdminReviewItem[] = snap.docs.map((d) => {
          const data = d.data();
          const pid = String(data.providerId || '');
          const prov = providerById.get(pid);
          return {
            id: d.id,
            providerId: pid,
            providerNameFr: prov?.fullNameFr || pid,
            providerNameAr: prov?.fullNameAr || pid,
            category: prov?.category || 'Plomberie',
            city: prov?.location.city || 'Casablanca',
            authorName: String(data.authorName || 'Client'),
            quartier: String(data.quartier || ''),
            rating: Number(data.rating || 5),
            date: formatTimestamp(data.createdAt).slice(0, 10),
            commentFr: String(data.comment || ''),
            commentAr: String(data.comment || ''),
            isLiveFirestore: true,
          };
        });
        items.sort((a, b) => b.date.localeCompare(a.date));
        setLiveReviews(items);
      },
      (err) => {
        reportFirestoreError(err, OperationType.LIST, 'reviews');
      }
    );

    const unsubLogs = onSnapshot(
      query(collection(db, 'adminLogs'), orderBy('createdAt', 'desc'), limit(100)),
      (snap) => {
        setLiveLogs(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              adminUid: String(data.adminUid || ''),
              adminEmail: String(data.adminEmail || ''),
              actionType: (data.actionType as AdminActionType) || 'booking_override',
              targetCollection: (data.targetCollection as AdminTargetCollection) || 'bookings',
              targetId: String(data.targetId || ''),
              summary: String(data.summary || ''),
              createdAtIso: formatTimestamp(data.createdAt),
            };
          })
        );
      },
      (err) => {
        reportFirestoreError(err, OperationType.LIST, 'adminLogs');
      }
    );

    return () => {
      unsubUsers();
      unsubBookings();
      unsubWithdrawals();
      unsubReviews();
      unsubLogs();
    };
  }, [enabled, authReady, isLiveAdmin, allProviders]);

  const showToast = (msg: AdminToastMessage) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setAdminToast(msg);
    toastTimerRef.current = setTimeout(() => {
      setAdminToast((prev) => (prev === msg ? null : prev));
    }, 3600);
  };

  const appendAuditLog = async (
    actionType: AdminActionType,
    targetCollection: AdminTargetCollection,
    targetId: string,
    summary: string
  ) => {
    if (!isLiveAdmin || !firebaseUser) return;
    const logId = `log-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const safeSummary = summary.slice(0, 295);
    try {
      await setDoc(doc(db, 'adminLogs', logId), {
        adminUid: firebaseUser.uid,
        adminEmail: firebaseUser.email || DEFAULT_ADMIN_EMAIL_PLACEHOLDER,
        actionType,
        targetCollection,
        targetId,
        summary: safeSummary,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      reportFirestoreError(err, OperationType.CREATE, `adminLogs/${logId}`);
    }
  };

  // Live Admin strictly sees Firestore collections (no hardcoded demo fixtures polluting KPIs/CSV)
  const adminProviders = useMemo(() => {
    if (isLiveAdmin) return firestoreProviders;
    return SEEDED_PENDING_APPLICANTS;
  }, [isLiveAdmin, firestoreProviders]);

  const adminBookings = useMemo(() => {
    if (isLiveAdmin) return liveBookings;
    return bookings;
  }, [isLiveAdmin, liveBookings, bookings]);

  const adminUsers = useMemo(() => {
    if (isLiveAdmin) return liveUsers;
    return [];
  }, [isLiveAdmin, liveUsers]);

  const adminReviews = useMemo<AdminReviewItem[]>(() => {
    if (isLiveAdmin) return liveReviews;
    return flattenProviderReviews(allProviders);
  }, [isLiveAdmin, liveReviews, allProviders]);

  const analytics = useMemo(
    () =>
      computeAdminAnalytics(
        adminProviders,
        adminBookings,
        adminUsers,
        systemSettings.platformFeePct
      ),
    [adminProviders, adminBookings, adminUsers, systemSettings.platformFeePct]
  );

  // Action 1: Atomically approve or revoke CIN verification across providers/{uid} + users/{uid}
  const toggleProviderCinVerification = async (provider: VettedProvider) => {
    if (!isLiveAdmin) return;
    const nextVerified = !provider.verifiedBadge;

    try {
      const providerRef = doc(db, 'providers', provider.uid);
      const userRef = doc(db, 'users', provider.uid);
      const [providerSnap, userSnap] = await Promise.all([
        getDoc(providerRef),
        getDoc(userRef),
      ]);

      const batch = writeBatch(db);
      let touched = false;
      if (providerSnap.exists()) {
        batch.update(providerRef, {
          verifiedBadge: nextVerified,
          updatedAt: serverTimestamp(),
        });
        touched = true;
      }
      if (userSnap.exists()) {
        batch.update(userRef, {
          verifiedBadge: nextVerified,
          updatedAt: serverTimestamp(),
        });
        touched = true;
      }
      if (touched) {
        await batch.commit();
      }

      onApplyProviderOverride(provider.id, {
        verifiedBadge: nextVerified,
        cinVerified: nextVerified,
        cinNumberMasked: nextVerified ? 'CIN Vérifiée' : 'En attente',
      });

      await appendAuditLog(
        nextVerified ? 'cin_approved' : 'cin_revoked',
        'providers',
        provider.uid,
        `${nextVerified ? 'CIN approuvée' : 'CIN révoquée'} pour ${provider.fullNameFr} (${provider.location.city})`
      );

      showToast(
        nextVerified
          ? {
              fr: `Badge CIN vérifié activé pour ${provider.fullNameFr}`,
              ar: `تم تفعيل شارة البطاقة الوطنية (CIN) للمعلم ${provider.fullNameAr}`,
            }
          : {
              fr: `Badge CIN révoqué pour ${provider.fullNameFr}`,
              ar: `تم سحب شارة البطاقة الوطنية (CIN) عن ${provider.fullNameAr}`,
            }
      );
    } catch (err) {
      reportFirestoreError(err, OperationType.UPDATE, `providers/${provider.uid}`);
      showToast({
        fr: 'Erreur Firestore lors de la mise à jour CIN.',
        ar: 'تعذر تحديث حالة البطاقة الوطنية في قاعدة البيانات.',
        variant: 'error',
      });
    }
  };

  // Action 2: Toggle provider availability from Admin Console
  const adminToggleProviderAvailability = async (provider: VettedProvider) => {
    if (!isLiveAdmin) return;
    const nextAvail = !provider.isAvailableNow;

    try {
      const providerRef = doc(db, 'providers', provider.uid);
      const snap = await getDoc(providerRef);
      if (snap.exists()) {
        await updateDoc(providerRef, {
          isAvailableNow: nextAvail,
          updatedAt: serverTimestamp(),
        });
      }
      onApplyProviderOverride(provider.id, { isAvailableNow: nextAvail });
      await appendAuditLog(
        'availability_toggled',
        'providers',
        provider.uid,
        `Disponibilité passée à ${nextAvail ? 'Disponible' : 'Sur rendez-vous'} pour ${provider.fullNameFr}`
      );
    } catch (err) {
      reportFirestoreError(err, OperationType.UPDATE, `providers/${provider.uid}`);
      showToast({
        fr: 'Erreur lors de la mise à jour de disponibilité.',
        ar: 'تعذر تحديث حالة التوفر.',
        variant: 'error',
      });
    }
  };

  // Action 3: Atomically toggle user verifiedBadge across users/{uid} AND providers/{uid}
  const toggleUserVerifiedBadge = async (user: UserProfileRecord) => {
    if (!isLiveAdmin) return;
    const nextVerified = !user.verifiedBadge;

    try {
      const userRef = doc(db, 'users', user.uid);
      const providerRef = doc(db, 'providers', user.uid);
      const [userSnap, providerSnap] = await Promise.all([
        getDoc(userRef),
        getDoc(providerRef),
      ]);

      const batch = writeBatch(db);
      let touched = false;
      if (userSnap.exists()) {
        batch.update(userRef, {
          verifiedBadge: nextVerified,
          updatedAt: serverTimestamp(),
        });
        touched = true;
      }
      if (providerSnap.exists()) {
        batch.update(providerRef, {
          verifiedBadge: nextVerified,
          updatedAt: serverTimestamp(),
        });
        touched = true;
      }
      if (touched) {
        await batch.commit();
      }

      if (user.role === 'provider' || user.role === 'both') {
        onApplyProviderOverride(user.uid, {
          verifiedBadge: nextVerified,
          cinVerified: nextVerified,
          cinNumberMasked: nextVerified ? 'CIN Vérifiée' : 'En attente',
        });
      }

      await appendAuditLog(
        nextVerified ? 'cin_approved' : 'cin_revoked',
        'users',
        user.uid,
        `Statut vérifié ${nextVerified ? 'activé' : 'retiré'} pour ${user.fullName}`
      );
      showToast({
        fr: `${user.fullName} — ${nextVerified ? 'CIN Vérifiée' : 'Vérification retirée'}`,
        ar: `${user.fullName} — ${nextVerified ? 'تم التوثيق (CIN)' : 'تم إلغاء التوثيق'}`,
      });
    } catch (err) {
      reportFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      showToast({
        fr: 'Erreur Firestore lors de la mise à jour utilisateur.',
        ar: 'تعذر تحديث حالة المستخدم.',
        variant: 'error',
      });
    }
  };

  // Action 4A: Release CMI Escrow using configured platformFeePct
  const releaseCmiEscrow = async (booking: BookingRecord) => {
    if (!isLiveAdmin || booking.paymentStatus === 'paid') return;

    const split = calculateEscrowSplit(
      booking.estimatedMad,
      systemSettings.platformFeePct,
      100
    );
    const patch: AdminBookingPatch = {
      paymentStatus: 'paid',
      providerPayoutMad: split.providerPayoutMad,
      platformFeeMad: split.platformFeeMad,
      refundedClientMad: 0,
    };

    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        ...patch,
        updatedAt: serverTimestamp(),
      });
      onApplyBookingPatch(booking.id, patch);

      await appendAuditLog(
        'escrow_released',
        'bookings',
        booking.id,
        `Séquestre CMI #${booking.bookingRef} (${booking.estimatedMad} DH) libéré : ${split.providerPayoutMad} DH Maâlem + ${split.platformFeeMad} DH commission (${systemSettings.platformFeePct}%)`
      );
      showToast({
        fr: `Séquestre CMI libéré (#${booking.bookingRef}) : ${split.providerPayoutMad} DH Maâlem / ${split.platformFeeMad} DH frais`,
        ar: `تم صرف ضمان CMI (#${booking.bookingRef}): ${split.providerPayoutMad} د.م. للمعلم / ${split.platformFeeMad} د.م. عمولة`,
      });
    } catch (err) {
      reportFirestoreError(err, OperationType.UPDATE, `bookings/${booking.id}`);
      showToast({
        fr: 'Erreur lors de la libération du séquestre CMI.',
        ar: 'تعذر صرف ضمان CMI.',
        variant: 'error',
      });
    }
  };

  // Action 4B: Full 100% Client Refund on CMI Escrow
  const refundCmiEscrow = async (booking: BookingRecord) => {
    if (!isLiveAdmin || booking.paymentStatus === 'refunded') return;

    const patch: AdminBookingPatch = {
      status: 'cancelled',
      paymentStatus: 'refunded',
      providerPayoutMad: 0,
      platformFeeMad: 0,
      refundedClientMad: Math.round(booking.estimatedMad),
      cancellationReason: 'Remboursement intégral CMI ordonné par l’administration',
      cancelledBy: 'admin',
    };

    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        ...patch,
        updatedAt: serverTimestamp(),
      });
      onApplyBookingPatch(booking.id, patch);

      await appendAuditLog(
        'escrow_refunded',
        'bookings',
        booking.id,
        `Remboursement CMI intégral (100% = ${booking.estimatedMad} DH) exécuté pour #${booking.bookingRef} (${booking.clientName})`
      );
      showToast({
        fr: `Remboursement CMI 100% (${booking.estimatedMad} DH) effectué — #${booking.bookingRef}`,
        ar: `تم استرجاع ضمان CMI بالكامل (${booking.estimatedMad} د.م.) للزبون — #${booking.bookingRef}`,
      });
    } catch (err) {
      reportFirestoreError(err, OperationType.UPDATE, `bookings/${booking.id}`);
      showToast({
        fr: 'Erreur lors du remboursement CMI.',
        ar: 'تعذر استرجاع مبلغ CMI.',
        variant: 'error',
      });
    }
  };

  // Action 4C: Dispute Split (50% net provider / 50% net client + platform fee)
  const disputeSplitEscrow = async (booking: BookingRecord) => {
    if (!isLiveAdmin || booking.paymentStatus === 'disputed_split') return;

    const split = calculateEscrowSplit(
      booking.estimatedMad,
      systemSettings.platformFeePct,
      50
    );
    const patch: AdminBookingPatch = {
      status: 'completed',
      paymentStatus: 'disputed_split',
      providerPayoutMad: split.providerPayoutMad,
      platformFeeMad: split.platformFeeMad,
      refundedClientMad: split.refundedClientMad,
    };

    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        ...patch,
        updatedAt: serverTimestamp(),
      });
      onApplyBookingPatch(booking.id, patch);

      await appendAuditLog(
        'dispute_split',
        'bookings',
        booking.id,
        `Arbitrage litige CMI #${booking.bookingRef} : ${split.providerPayoutMad} DH Maâlem / ${split.refundedClientMad} DH Client / ${split.platformFeeMad} DH Frais`
      );
      showToast({
        fr: `Arbitrage CMI #${booking.bookingRef} : ${split.providerPayoutMad} DH Maâlem · ${split.refundedClientMad} DH Client`,
        ar: `تسوية نزاع CMI #${booking.bookingRef}: ${split.providerPayoutMad} د.م. للمعلم · ${split.refundedClientMad} د.م. للزبون`,
      });
    } catch (err) {
      reportFirestoreError(err, OperationType.UPDATE, `bookings/${booking.id}`);
      showToast({
        fr: 'Erreur lors de l’arbitrage du litige.',
        ar: 'تعذر تسجيل تسوية النزاع.',
        variant: 'error',
      });
    }
  };

  // Action 5: Admin status override for dispute resolution
  const overrideBookingStatus = async (booking: BookingRecord, nextStatus: BookingStatus) => {
    if (!isLiveAdmin || booking.status === nextStatus) return;
    const nextPaymentStatus = getNextPaymentStatus(
      booking.paymentMethod,
      booking.paymentStatus,
      nextStatus
    );

    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: nextStatus,
        paymentStatus: nextPaymentStatus,
        updatedAt: serverTimestamp(),
      });
      onApplyBookingPatch(booking.id, { status: nextStatus, paymentStatus: nextPaymentStatus });

      await appendAuditLog(
        'booking_override',
        'bookings',
        booking.id,
        `Statut #${booking.bookingRef} modifié par admin : ${booking.status} → ${nextStatus}`
      );
      showToast({
        fr: `Statut #${booking.bookingRef} mis à jour (${nextStatus})`,
        ar: `تم تحديث حالة الطلب #${booking.bookingRef} (${nextStatus})`,
      });
    } catch (err) {
      reportFirestoreError(err, OperationType.UPDATE, `bookings/${booking.id}`);
      showToast({
        fr: 'Erreur lors du changement de statut.',
        ar: 'تعذر تحديث حالة الطلب.',
        variant: 'error',
      });
    }
  };

  // Action 6: Delete moderated review and atomically recalculate provider ratingAvg & reviewCount
  const deleteModeratedReview = async (review: AdminReviewItem) => {
    if (!isLiveAdmin) return;

    try {
      const revRef = doc(db, 'reviews', review.id);
      const providerRef = doc(db, 'providers', review.providerId);
      const [revSnap, providerSnap] = await Promise.all([
        getDoc(revRef),
        getDoc(providerRef),
      ]);

      let recalculated: { ratingAvg: number; reviewCount: number } | undefined;
      const batch = writeBatch(db);
      let touched = false;

      if (revSnap.exists()) {
        batch.delete(revRef);
        touched = true;
      }

      if (providerSnap.exists()) {
        const pData = providerSnap.data();
        recalculated = recalculateRatingAfterReviewRemoval(
          Number(pData.ratingAvg ?? 5.0),
          Number(pData.reviewCount ?? 0),
          review.rating
        );
        batch.update(providerRef, {
          ratingAvg: recalculated.ratingAvg,
          reviewCount: recalculated.reviewCount,
          updatedAt: serverTimestamp(),
        });
        touched = true;
      }

      if (touched) {
        await batch.commit();
      }

      onRemoveProviderReview(review.providerId, review.id, recalculated);

      await appendAuditLog(
        'review_deleted',
        'reviews',
        review.id,
        `Avis (${review.rating}/5) de ${review.authorName} sur ${review.providerNameFr} modéré et retiré`
      );
      showToast({
        fr: `Avis de ${review.authorName} supprimé par modération`,
        ar: `تم حذف تقييم ${review.authorName} من قبل الإدارة`,
      });
    } catch (err) {
      reportFirestoreError(err, OperationType.DELETE, `reviews/${review.id}`);
      showToast({
        fr: 'Erreur lors de la suppression de l’avis.',
        ar: 'تعذر حذف التقييم.',
        variant: 'error',
      });
    }
  };

  // Action 7: Approve, Freeze, or Reject Provider Withdrawal Request
  const updateWithdrawalStatus = async (
    withdrawal: WithdrawalRecord,
    nextStatus: WithdrawalStatus,
    adminNote?: string
  ) => {
    if (!isLiveAdmin || withdrawal.status === nextStatus) return;

    const defaultNotes: Record<WithdrawalStatus, string> = {
      pending: 'En attente de vérification RIB',
      approved: 'Virement national RIB validé et ordonné',
      frozen: 'Gel temporaire pour contrôle de conformité KYC / litige',
      rejected: 'Demande rejetée — RIB non conforme ou solde insuffisant',
    };
    const finalNote = (adminNote ?? defaultNotes[nextStatus]).slice(0, 250);

    try {
      await updateDoc(doc(db, 'withdrawals', withdrawal.id), {
        status: nextStatus,
        adminNote: finalNote,
        updatedAt: serverTimestamp(),
      });

      await appendAuditLog(
        'withdrawal_updated',
        'withdrawals',
        withdrawal.id,
        `Retrait ${withdrawal.id} (${withdrawal.amountMad} DH · ${withdrawal.providerName}) passé à : ${nextStatus}`
      );

      showToast({
        fr: `Retrait ${withdrawal.providerName} (${withdrawal.amountMad} DH) → ${nextStatus.toUpperCase()}`,
        ar: `طلب السحب ${withdrawal.providerName} (${withdrawal.amountMad} د.م.) ← ${nextStatus}`,
      });
    } catch (err) {
      reportFirestoreError(err, OperationType.UPDATE, `withdrawals/${withdrawal.id}`);
      showToast({
        fr: 'Erreur lors de la mise à jour du retrait.',
        ar: 'تعذر تحديث طلب السحب.',
        variant: 'error',
      });
    }
  };

  // Action 8: Persist System Settings to Firestore systemSettings/global (with strict validation)
  const saveSystemSettings = async (patch: Partial<SystemSettingsRecord>) => {
    if (!isLiveAdmin || !firebaseUser) return;
    const normalizedPhone = normalizeMoroccanPhone(
      patch.supportWhatsAppPhone ?? systemSettings.supportWhatsAppPhone
    );
    if (!isValidMoroccanPhone(normalizedPhone)) {
      showToast({
        fr: 'Numéro WhatsApp support invalide (format marocain +212 requis).',
        ar: 'رقم واتساب الدعم غير صالح (صيغة +212 مطلوبة).',
        variant: 'error',
      });
      return;
    }

    const now = new Date();
    const updatedAtIso = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`;
    const nextSettings: SystemSettingsRecord = {
      ...systemSettings,
      ...patch,
      platformFeePct: Math.max(0, Math.min(50, Math.round(patch.platformFeePct ?? systemSettings.platformFeePct))),
      minWithdrawalMad: Math.max(50, Math.min(20000, Math.round(patch.minWithdrawalMad ?? systemSettings.minWithdrawalMad))),
      supportWhatsAppPhone: normalizedPhone,
      updatedByEmail: firebaseUser.email || DEFAULT_ADMIN_EMAIL_PLACEHOLDER,
      updatedAtIso,
    };

    try {
      await setDoc(doc(db, 'systemSettings', 'global'), {
        platformFeePct: nextSettings.platformFeePct,
        minWithdrawalMad: nextSettings.minWithdrawalMad,
        autoRefundOnProviderCancel: nextSettings.autoRefundOnProviderCancel,
        requireKycForEscrowPayout: nextSettings.requireKycForEscrowPayout,
        supportWhatsAppPhone: nextSettings.supportWhatsAppPhone,
        updatedByEmail: nextSettings.updatedByEmail,
        updatedAt: serverTimestamp(),
      });

      onUpdateLocalSettings(nextSettings);

      await appendAuditLog(
        'settings_updated',
        'settings',
        'global',
        `Paramètres système enregistrés : Commission ${nextSettings.platformFeePct}%, Retrait min ${nextSettings.minWithdrawalMad} DH`
      );

      showToast({
        fr: `Paramètres système sauvegardés (Commission ${nextSettings.platformFeePct}%)`,
        ar: `تم حفظ إعدادات النظام بنجاح (العمولة ${nextSettings.platformFeePct}%)`,
      });
    } catch (err) {
      reportFirestoreError(err, OperationType.WRITE, 'systemSettings/global');
      showToast({
        fr: 'Erreur Firestore lors de la sauvegarde des paramètres.',
        ar: 'تعذر حفظ إعدادات النظام.',
        variant: 'error',
      });
    }
  };

  return {
    isLiveAdmin,
    isCheckingAdmin,
    isLoadingAdmin,
    adminToast,
    adminProviders,
    adminBookings,
    adminUsers,
    adminReviews,
    auditLogs: liveLogs,
    withdrawals: liveWithdrawals,
    systemSettings,
    analytics,
    toggleProviderCinVerification,
    adminToggleProviderAvailability,
    toggleUserVerifiedBadge,
    releaseCmiEscrow,
    refundCmiEscrow,
    disputeSplitEscrow,
    overrideBookingStatus,
    deleteModeratedReview,
    updateWithdrawalStatus,
    saveSystemSettings,
  };
}
