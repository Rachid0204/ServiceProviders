import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  type DocumentData,
  type Timestamp,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  BOOTSTRAP_ADMIN_EMAIL,
  DEFAULT_SYSTEM_SETTINGS,
  computeAdminAnalytics,
  flattenProviderReviews,
  type AdminActionType,
  type AdminAuditLog,
  type AdminReviewItem,
  type AdminTargetCollection,
  type SystemSettingsRecord,
  type WithdrawalRecord,
  type WithdrawalStatus,
} from '../utils/adminMetrics';
import {
  calculateEscrowSplit,
  getNextPaymentStatus,
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

const SETTINGS_STORAGE_KEY = 'moul_lkhedma_system_settings';

// Seeded pending-CIN Maâlem applicants (appear in Admin CIN queue for immediate review & approval)
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
    portfolioImages: ['/src/assets/images/service_ac_repair_1794980477179.jpg'],
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
    portfolioImages: ['/src/assets/images/service_painting_decor_1794980477092.jpg'],
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

// Seeded realistic Moroccan client accounts for Admin Users Directory preview
const SEEDED_CLIENT_USERS: UserProfileRecord[] = [
  {
    uid: 'demo-client-karim',
    role: 'client',
    fullName: 'Karim Tazi',
    phone: '+212661234567',
    city: 'Casablanca',
    neighborhood: 'Maârif',
    languagePref: 'fr',
    verifiedBadge: true,
  },
  {
    uid: 'demo-client-leila',
    role: 'client',
    fullName: 'Leila Bennani',
    phone: '+212664782190',
    city: 'Rabat',
    neighborhood: 'Agdal',
    languagePref: 'fr',
    verifiedBadge: true,
  },
  {
    uid: 'demo-client-omar',
    role: 'client',
    fullName: 'عمر العلوي (Omar Alaoui)',
    phone: '+212665903412',
    city: 'Tangier',
    neighborhood: 'Malabata',
    languagePref: 'ar',
    verifiedBadge: false,
  },
  {
    uid: 'demo-client-sanaa',
    role: 'both',
    fullName: 'Sanaa El Idrissi',
    phone: '+212666148209',
    city: 'Marrakech',
    neighborhood: 'Guéliz',
    languagePref: 'fr',
    verifiedBadge: true,
    specialty: 'Ménage',
    hourlyRateMad: 120,
  },
];

const SEEDED_WITHDRAWALS: WithdrawalRecord[] = [
  {
    id: 'wd-101',
    providerId: 'maalem-driss-casa',
    providerName: 'Maâlem Driss Berrada',
    city: 'Casablanca',
    bankName: 'Attijariwafa Bank',
    ribMasked: '007 780 0004519000301842 64',
    amountMad: 1450,
    status: 'pending',
    createdAtIso: '2026-11-18 11:20',
  },
  {
    id: 'wd-102',
    providerId: 'maalem-youssef-rabat',
    providerName: 'Maâlem Youssef El Amrani',
    city: 'Rabat',
    bankName: 'Banque Populaire',
    ribMasked: '181 810 2111649200190012 31',
    amountMad: 980,
    status: 'pending',
    createdAtIso: '2026-11-18 09:45',
  },
  {
    id: 'wd-103',
    providerId: 'maalem-tarik-casa',
    providerName: 'Maâlem Tarik Zemmouri',
    city: 'Casablanca',
    bankName: 'CIH Bank',
    ribMasked: '230 780 4189021000284719 18',
    amountMad: 2100,
    status: 'approved',
    adminNote: 'Virement national RIB exécuté',
    createdAtIso: '2026-11-17 16:30',
  },
];

const INITIAL_AUDIT_LOGS: AdminAuditLog[] = [
  {
    id: 'log-seed-1',
    adminUid: 'bootstrap-admin',
    adminEmail: BOOTSTRAP_ADMIN_EMAIL,
    actionType: 'cin_approved',
    targetCollection: 'providers',
    targetId: 'maalem-driss-casa',
    summary: 'CIN & diplôme ISTA vérifiés pour Maâlem Driss Berrada (Casablanca · Maârif)',
    createdAtIso: '2026-11-16 10:15',
  },
  {
    id: 'log-seed-2',
    adminUid: 'bootstrap-admin',
    adminEmail: BOOTSTRAP_ADMIN_EMAIL,
    actionType: 'cin_approved',
    targetCollection: 'providers',
    targetId: 'maalem-youssef-rabat',
    summary: 'CIN & agrément électricité validés pour Maâlem Youssef El Amrani (Rabat · Agdal)',
    createdAtIso: '2026-11-17 14:42',
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
}

export function useAdminData(params: {
  firebaseUser: User | null;
  authReady: boolean;
  allProviders: VettedProvider[];
  bookings: BookingRecord[];
  onApplyProviderOverride: (providerId: string, patch: ProviderOverride) => void;
  onRemoveProviderReview: (providerId: string, reviewId: string) => void;
  onApplyBookingPatch: (bookingId: string, patch: AdminBookingPatch) => void;
}) {
  const {
    firebaseUser,
    authReady,
    allProviders,
    bookings,
    onApplyProviderOverride,
    onRemoveProviderReview,
    onApplyBookingPatch,
  } = params;

  const [hasAdminDoc, setHasAdminDoc] = useState<boolean>(false);
  const [liveUsers, setLiveUsers] = useState<UserProfileRecord[]>([]);
  const [liveBookings, setLiveBookings] = useState<BookingRecord[]>([]);
  const [liveLogs, setLiveLogs] = useState<AdminAuditLog[]>([]);
  const [localLogs, setLocalLogs] = useState<AdminAuditLog[]>(INITIAL_AUDIT_LOGS);
  const [pendingApplicants, setPendingApplicants] = useState<VettedProvider[]>(
    SEEDED_PENDING_APPLICANTS
  );
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>(SEEDED_WITHDRAWALS);
  const [systemSettings, setSystemSettings] = useState<SystemSettingsRecord>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_SYSTEM_SETTINGS, ...(JSON.parse(raw) as SystemSettingsRecord) };
      }
    } catch {
      // use default
    }
    return DEFAULT_SYSTEM_SETTINGS;
  });
  const [localUserOverrides, setLocalUserOverrides] = useState<Record<string, boolean>>({});
  const [isLoadingAdmin, setIsLoadingAdmin] = useState<boolean>(false);
  const [adminToast, setAdminToast] = useState<AdminToastMessage | null>(null);

  const isBootstrappedAdmin = Boolean(
    firebaseUser?.emailVerified && firebaseUser.email === BOOTSTRAP_ADMIN_EMAIL
  );
  const isLiveAdmin = isBootstrappedAdmin || hasAdminDoc;

  // Check /admins/{uid} doc if signed in with a non-bootstrap verified email
  useEffect(() => {
    if (!authReady || !firebaseUser?.emailVerified || isBootstrappedAdmin) {
      setHasAdminDoc(false);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, 'admins', firebaseUser.uid))
      .then((snap) => {
        if (!cancelled) setHasAdminDoc(snap.exists());
      })
      .catch(() => {
        if (!cancelled) setHasAdminDoc(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, firebaseUser, isBootstrappedAdmin]);

  // Attach real-time Firestore listeners ONLY when authenticated as verified admin
  useEffect(() => {
    if (!authReady || !isLiveAdmin) {
      setLiveUsers([]);
      setLiveBookings([]);
      setLiveLogs([]);
      return;
    }

    setIsLoadingAdmin(true);
    const unsubUsers = onSnapshot(
      query(collection(db, 'users')),
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
        handleFirestoreError(err, OperationType.LIST, 'users');
      }
    );

    const unsubBookings = onSnapshot(
      query(collection(db, 'bookings')),
      (snap) => {
        setLiveBookings(snap.docs.map((d) => mapAdminFirestoreBooking(d.id, d.data())));
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'bookings');
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
              adminEmail: String(data.adminEmail || BOOTSTRAP_ADMIN_EMAIL),
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
        handleFirestoreError(err, OperationType.LIST, 'adminLogs');
      }
    );

    return () => {
      unsubUsers();
      unsubBookings();
      unsubLogs();
    };
  }, [authReady, isLiveAdmin]);

  const showToast = (msg: AdminToastMessage) => {
    setAdminToast(msg);
    setTimeout(() => {
      setAdminToast((prev) => (prev === msg ? null : prev));
    }, 3600);
  };

  const appendAuditLog = async (
    actionType: AdminActionType,
    targetCollection: AdminTargetCollection,
    targetId: string,
    summary: string
  ) => {
    const logId = `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date();
    const createdAtIso = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`;
    const safeSummary = summary.slice(0, 295);
    const adminUid = firebaseUser?.uid || 'preview-admin';
    const adminEmail = firebaseUser?.email || BOOTSTRAP_ADMIN_EMAIL;

    const entry: AdminAuditLog = {
      id: logId,
      adminUid,
      adminEmail,
      actionType,
      targetCollection,
      targetId,
      summary: safeSummary,
      createdAtIso,
    };

    setLocalLogs((prev) => [entry, ...prev]);

    if (isLiveAdmin && firebaseUser) {
      try {
        await setDoc(doc(db, 'adminLogs', logId), {
          adminUid: firebaseUser.uid,
          adminEmail: firebaseUser.email || BOOTSTRAP_ADMIN_EMAIL,
          actionType,
          targetCollection,
          targetId,
          summary: safeSummary,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `adminLogs/${logId}`);
      }
    }
  };

  // Merge active marketplace providers + pending CIN applicants (deduplicated)
  const adminProviders = useMemo(() => {
    const map = new Map<string, VettedProvider>();
    pendingApplicants.forEach((p) => map.set(p.id, p));
    allProviders.forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }, [allProviders, pendingApplicants]);

  // Merge live admin bookings + marketplace bookings (deduplicated)
  const adminBookings = useMemo(() => {
    const map = new Map<string, BookingRecord>();
    liveBookings.forEach((b) => map.set(b.id, b));
    bookings.forEach((b) => {
      if (!map.has(b.id)) map.set(b.id, b);
    });
    return Array.from(map.values());
  }, [liveBookings, bookings]);

  // Merge live Firestore users + provider user mirrors + seeded clients
  const adminUsers = useMemo(() => {
    const map = new Map<string, UserProfileRecord>();
    SEEDED_CLIENT_USERS.forEach((u) => map.set(u.uid, u));
    adminProviders.forEach((p) => {
      if (!map.has(p.uid)) {
        map.set(p.uid, {
          uid: p.uid,
          role: 'provider',
          fullName: p.fullNameFr,
          phone: p.phone,
          city: p.location.city,
          neighborhood: p.location.quartier,
          languagePref: 'fr',
          verifiedBadge: p.verifiedBadge,
          specialty: p.category,
          hourlyRateMad: p.hourlyRateMAD,
        });
      }
    });
    liveUsers.forEach((u) => map.set(u.uid, u));

    return Array.from(map.values()).map((u) =>
      u.uid in localUserOverrides ? { ...u, verifiedBadge: localUserOverrides[u.uid] } : u
    );
  }, [liveUsers, adminProviders, localUserOverrides]);

  const adminReviews = useMemo<AdminReviewItem[]>(
    () => flattenProviderReviews(adminProviders),
    [adminProviders]
  );

  const auditLogs = useMemo(() => {
    const map = new Map<string, AdminAuditLog>();
    liveLogs.forEach((l) => map.set(l.id, l));
    localLogs.forEach((l) => {
      if (!map.has(l.id)) map.set(l.id, l);
    });
    return Array.from(map.values());
  }, [liveLogs, localLogs]);

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

  // Action 1: Approve or revoke CIN verification on a provider (syncs providers/{uid} + users/{uid})
  const toggleProviderCinVerification = async (provider: VettedProvider) => {
    const nextVerified = !provider.verifiedBadge;

    setPendingApplicants((prev) =>
      prev.map((p) =>
        p.id === provider.id
          ? {
              ...p,
              verifiedBadge: nextVerified,
              cinVerified: nextVerified,
              cinNumberMasked: nextVerified ? 'CIN Vérifiée' : 'En attente',
            }
          : p
      )
    );

    onApplyProviderOverride(provider.id, {
      verifiedBadge: nextVerified,
      cinVerified: nextVerified,
      cinNumberMasked: nextVerified ? 'CIN Vérifiée' : 'En attente',
    });
    setLocalUserOverrides((prev) => ({ ...prev, [provider.uid]: nextVerified }));

    if (isLiveAdmin && !provider.id.startsWith('maalem-')) {
      try {
        const providerRef = doc(db, 'providers', provider.uid);
        const providerSnap = await getDoc(providerRef);
        if (providerSnap.exists()) {
          await updateDoc(providerRef, {
            verifiedBadge: nextVerified,
            updatedAt: serverTimestamp(),
          });
        }
        const userRef = doc(db, 'users', provider.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          await updateDoc(userRef, {
            verifiedBadge: nextVerified,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `providers/${provider.uid}`);
      }
    }

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
  };

  // Action 2: Toggle provider availability from Admin Console
  const adminToggleProviderAvailability = async (provider: VettedProvider) => {
    const nextAvail = !provider.isAvailableNow;
    setPendingApplicants((prev) =>
      prev.map((p) => (p.id === provider.id ? { ...p, isAvailableNow: nextAvail } : p))
    );
    onApplyProviderOverride(provider.id, { isAvailableNow: nextAvail });

    if (isLiveAdmin && !provider.id.startsWith('maalem-')) {
      try {
        const providerRef = doc(db, 'providers', provider.uid);
        const snap = await getDoc(providerRef);
        if (snap.exists()) {
          await updateDoc(providerRef, {
            isAvailableNow: nextAvail,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `providers/${provider.uid}`);
      }
    }

    await appendAuditLog(
      'availability_toggled',
      'providers',
      provider.uid,
      `Disponibilité passée à ${nextAvail ? 'Disponible' : 'Sur rendez-vous'} pour ${provider.fullNameFr}`
    );
  };

  // Action 3: Toggle user verifiedBadge directly from Users Directory
  const toggleUserVerifiedBadge = async (user: UserProfileRecord) => {
    const nextVerified = !user.verifiedBadge;
    setLocalUserOverrides((prev) => ({ ...prev, [user.uid]: nextVerified }));

    if (user.role === 'provider' || user.role === 'both') {
      onApplyProviderOverride(user.uid, {
        verifiedBadge: nextVerified,
        cinVerified: nextVerified,
        cinNumberMasked: nextVerified ? 'CIN Vérifiée' : 'En attente',
      });
      setPendingApplicants((prev) =>
        prev.map((p) =>
          p.uid === user.uid
            ? {
                ...p,
                verifiedBadge: nextVerified,
                cinVerified: nextVerified,
                cinNumberMasked: nextVerified ? 'CIN Vérifiée' : 'En attente',
              }
            : p
        )
      );
    }

    if (isLiveAdmin && !user.uid.startsWith('demo-') && !user.uid.startsWith('maalem-')) {
      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          await updateDoc(userRef, {
            verifiedBadge: nextVerified,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
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
  };

  // Action 4A: Release CMI Escrow (90% provider payout + 10% platform fee)
  const releaseCmiEscrow = async (booking: BookingRecord) => {
    if (booking.paymentStatus === 'paid') return;

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

    onApplyBookingPatch(booking.id, patch);
    setLiveBookings((prev) =>
      prev.map((b) => (b.id === booking.id ? { ...b, ...patch } : b))
    );

    if (isLiveAdmin && !booking.id.startsWith('booking-demo-')) {
      try {
        await updateDoc(doc(db, 'bookings', booking.id), {
          ...patch,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `bookings/${booking.id}`);
      }
    }

    await appendAuditLog(
      'escrow_released',
      'bookings',
      booking.id,
      `Séquestre CMI #${booking.bookingRef} (${booking.estimatedMad} DH) libéré : ${split.providerPayoutMad} DH Maâlem (90%) + ${split.platformFeeMad} DH commission (10%)`
    );
    showToast({
      fr: `Séquestre CMI libéré (#${booking.bookingRef}) : ${split.providerPayoutMad} DH Maâlem / ${split.platformFeeMad} DH frais`,
      ar: `تم صرف ضمان CMI (#${booking.bookingRef}): ${split.providerPayoutMad} د.م. للمعلم / ${split.platformFeeMad} د.م. عمولة`,
    });
  };

  // Action 4B: Full 100% Client Refund on CMI Escrow
  const refundCmiEscrow = async (booking: BookingRecord) => {
    if (booking.paymentStatus === 'refunded') return;

    const patch: AdminBookingPatch = {
      status: 'cancelled',
      paymentStatus: 'refunded',
      providerPayoutMad: 0,
      platformFeeMad: 0,
      refundedClientMad: booking.estimatedMad,
      cancellationReason: 'Remboursement intégral CMI ordonné par l’administration',
      cancelledBy: 'admin',
    };

    onApplyBookingPatch(booking.id, patch);
    setLiveBookings((prev) =>
      prev.map((b) => (b.id === booking.id ? { ...b, ...patch } : b))
    );

    if (isLiveAdmin && !booking.id.startsWith('booking-demo-')) {
      try {
        await updateDoc(doc(db, 'bookings', booking.id), {
          ...patch,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `bookings/${booking.id}`);
      }
    }

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
  };

  // Action 4C: Dispute Split (50% net provider / 50% net client + platform fee)
  const disputeSplitEscrow = async (booking: BookingRecord) => {
    if (booking.paymentStatus === 'disputed_split') return;

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

    onApplyBookingPatch(booking.id, patch);
    setLiveBookings((prev) =>
      prev.map((b) => (b.id === booking.id ? { ...b, ...patch } : b))
    );

    if (isLiveAdmin && !booking.id.startsWith('booking-demo-')) {
      try {
        await updateDoc(doc(db, 'bookings', booking.id), {
          ...patch,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `bookings/${booking.id}`);
      }
    }

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
  };

  // Action 5: Admin status override for dispute resolution
  const overrideBookingStatus = async (booking: BookingRecord, nextStatus: BookingStatus) => {
    if (booking.status === nextStatus) return;
    const nextPaymentStatus = getNextPaymentStatus(
      booking.paymentMethod,
      booking.paymentStatus,
      nextStatus
    );

    onApplyBookingPatch(booking.id, { status: nextStatus, paymentStatus: nextPaymentStatus });
    setLiveBookings((prev) =>
      prev.map((b) =>
        b.id === booking.id
          ? { ...b, status: nextStatus, paymentStatus: nextPaymentStatus }
          : b
      )
    );

    if (isLiveAdmin && !booking.id.startsWith('booking-demo-')) {
      try {
        await updateDoc(doc(db, 'bookings', booking.id), {
          status: nextStatus,
          paymentStatus: nextPaymentStatus,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `bookings/${booking.id}`);
      }
    }

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
  };

  // Action 6: Delete moderated review
  const deleteModeratedReview = async (review: AdminReviewItem) => {
    onRemoveProviderReview(review.providerId, review.id);

    if (isLiveAdmin && !review.id.startsWith('rev-')) {
      try {
        const revRef = doc(db, 'reviews', review.id);
        const snap = await getDoc(revRef);
        if (snap.exists()) {
          await deleteDoc(revRef);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `reviews/${review.id}`);
      }
    }

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
  };

  // Action 7: Approve, Freeze, or Reject Provider Withdrawal Request
  const updateWithdrawalStatus = async (
    withdrawal: WithdrawalRecord,
    nextStatus: WithdrawalStatus,
    adminNote?: string
  ) => {
    if (withdrawal.status === nextStatus) return;

    const defaultNotes: Record<WithdrawalStatus, string> = {
      pending: 'En attente de vérification RIB',
      approved: 'Virement national RIB validé et ordonné',
      frozen: 'Gel temporaire pour contrôle de conformité KYC / litige',
      rejected: 'Demande rejetée — RIB non conforme ou solde insuffisant',
    };
    const finalNote = (adminNote ?? defaultNotes[nextStatus]).slice(0, 250);

    setWithdrawals((prev) =>
      prev.map((w) =>
        w.id === withdrawal.id
          ? { ...w, status: nextStatus, adminNote: finalNote }
          : w
      )
    );

    if (isLiveAdmin && !withdrawal.id.startsWith('wd-')) {
      try {
        await updateDoc(doc(db, 'withdrawals', withdrawal.id), {
          status: nextStatus,
          adminNote: finalNote,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `withdrawals/${withdrawal.id}`);
      }
    }

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
  };

  // Action 8: Persist System Settings (localStorage + Firestore systemSettings/global)
  const saveSystemSettings = async (patch: Partial<SystemSettingsRecord>) => {
    const now = new Date();
    const updatedAtIso = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`;
    const nextSettings: SystemSettingsRecord = {
      ...systemSettings,
      ...patch,
      updatedByEmail: firebaseUser?.email || BOOTSTRAP_ADMIN_EMAIL,
      updatedAtIso,
    };

    setSystemSettings(nextSettings);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
    } catch {
      // ignore storage quota errors
    }

    if (isLiveAdmin && firebaseUser) {
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
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'systemSettings/global');
      }
    }

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
  };

  return {
    isLiveAdmin,
    isLoadingAdmin,
    adminToast,
    adminProviders,
    adminBookings,
    adminUsers,
    adminReviews,
    auditLogs,
    withdrawals,
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
