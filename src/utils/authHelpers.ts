import {
  normalizeMoroccanPhone,
  type LanguageCode,
  type MoroccanCity,
  type UserProfileRecord,
} from './marketplace';

const REDIRECT_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
]);

/**
 * Extracts a Firebase Auth error code (e.g. `auth/popup-blocked`) from an unknown thrown value.
 */
export function extractFirebaseAuthErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && code.startsWith('auth/')) {
      return code;
    }
  }
  if (error instanceof Error) {
    const match = error.message.match(/auth\/[a-z0-9-]+/i);
    if (match) return match[0].toLowerCase();
  }
  return null;
}

/**
 * Determines whether a popup-based Google OAuth attempt should automatically fall back
 * to `signInWithRedirect` (common in Safari, iOS WebViews, and WhatsApp in-app browsers).
 */
export function shouldFallbackToRedirect(error: unknown): boolean {
  const code = extractFirebaseAuthErrorCode(error);
  return code !== null && REDIRECT_FALLBACK_CODES.has(code);
}

/**
 * Maps Firebase Auth error codes to concise, user-safe bilingual FR/AR messages
 * without exposing raw stack traces, UIDs, or internal diagnostics.
 */
export function mapFirebaseAuthError(error: unknown, lang: LanguageCode): string {
  const isAr = lang === 'ar';
  const code = extractFirebaseAuthErrorCode(error);

  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return isAr
        ? 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية. يرجى المحاولة مرة أخرى.'
        : 'La fenêtre de connexion a été fermée avant la fin. Veuillez réessayer.';
    case 'auth/popup-blocked':
      return isAr
        ? 'قام المتصفح بحظر النافذة المنبثقة. جاري التحويل إلى تسجيل الدخول المباشر...'
        : 'La fenêtre pop-up a été bloquée par le navigateur. Redirection en cours...';
    case 'auth/unauthorized-domain':
      return isAr
        ? 'هذا النطاق غير مصرح له بتسجيل الدخول عبر Firebase حالياً. يرجى مراجعة إعدادات الإدارة.'
        : 'Ce domaine n’est pas autorisé pour l’authentification Firebase. Veuillez contacter le support.';
    case 'auth/network-request-failed':
      return isAr
        ? 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.'
        : 'Erreur réseau. Vérifiez votre connexion Internet puis réessayez.';
    case 'auth/too-many-requests':
      return isAr
        ? 'تم تجاوز عدد المحاولات المسموح به مؤقتاً. يرجى الانتظار قليلاً ثم إعادة المحاولة.'
        : 'Trop de tentatives récentes. Veuillez patienter quelques minutes avant de réessayer.';
    case 'auth/user-disabled':
      return isAr
        ? 'تم تعطيل هذا الحساب. يرجى التواصل مع دعم مول الخدمة.'
        : 'Ce compte a été désactivé. Veuillez contacter le support Moul L’Khedma.';
    case 'auth/account-exists-with-different-credential':
      return isAr
        ? 'يوجد حساب مرتبط بهذا البريد الإلكتروني بطريقة دخول مختلفة.'
        : 'Un compte existe déjà avec cet e-mail via un autre mode de connexion.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return isAr
        ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
        : 'Adresse e-mail ou mot de passe invalide.';
    case 'auth/email-already-in-use':
      return isAr
        ? 'هذا البريد الإلكتروني مسجل مسبقاً. يرجى تسجيل الدخول بدلاً من ذلك.'
        : 'Cette adresse e-mail est déjà utilisée. Veuillez vous connecter.';
    case 'auth/weak-password':
      return isAr
        ? 'كلمة المرور ضعيفة جداً (يجب أن تحتوي على 8 أحرف على الأقل).'
        : 'Mot de passe trop faible (8 caractères minimum requis).';
    case 'auth/requires-recent-login':
      return isAr
        ? 'يتطلب هذا الإجراء الحساس إعادة تسجيل الدخول حديثاً للتحقق من هويتك.'
        : 'Cette action sensible nécessite une reconnexion récente pour confirmer votre identité.';
    default:
      return isAr
        ? 'تعذر إتمام عملية المصادقة حالياً. يرجى المحاولة مرة أخرى.'
        : 'Impossible de finaliser la connexion pour le moment. Veuillez réessayer.';
  }
}

/**
 * Builds a schema-valid minimal `client` user profile so a newly authenticated user
 * booking a Maâlem before visiting onboarding never hits PERMISSION_DENIED on `bookings` create.
 */
export function buildBootstrapClientProfile(params: {
  uid: string;
  fullName: string;
  phone: string;
  city: MoroccanCity;
  neighborhood: string;
  languagePref: LanguageCode;
}): UserProfileRecord {
  const safeName = params.fullName.trim().slice(0, 80);
  const safeNeighborhood = params.neighborhood.trim().slice(0, 80);
  return {
    uid: params.uid,
    role: 'client',
    fullName: safeName.length >= 2 ? safeName : 'Client',
    phone: normalizeMoroccanPhone(params.phone),
    city: params.city,
    neighborhood: safeNeighborhood.length >= 2 ? safeNeighborhood : 'Centre',
    languagePref: params.languagePref,
    verifiedBadge: false,
  };
}

/**
 * Mirrors Firestore/Storage `isVerifiedUser()` guard on the client so unverified accounts
 * are prompted to verify instead of failing silently with PERMISSION_DENIED.
 */
export function isVerifiedAuthUser(
  user: { emailVerified?: boolean; phoneNumber?: string | null } | null | undefined
): boolean {
  return Boolean(user && (user.emailVerified === true || Boolean(user.phoneNumber)));
}

export interface OnboardingFormState {
  role: UserProfileRecord['role'];
  fullName: string;
  phone: string;
  city: MoroccanCity;
  neighborhood: string;
  languagePref: LanguageCode;
  specialty: NonNullable<UserProfileRecord['specialty']>;
  hourlyRateMad: number;
  bio: string;
}

/**
 * Computes deterministic onboarding form state from a user profile or signed-in account,
 * guaranteeing that sign-out or switching to a new account wipes all previous-user PII.
 */
export function getInitialOnboardingFormState(
  profile: UserProfileRecord | null,
  firebaseUser: { displayName?: string | null } | null,
  lang: LanguageCode
): OnboardingFormState {
  if (profile) {
    return {
      role: profile.role,
      fullName: profile.fullName,
      phone: profile.phone,
      city: profile.city,
      neighborhood: profile.neighborhood,
      languagePref: profile.languagePref,
      specialty: profile.specialty ?? 'Plomberie',
      hourlyRateMad: profile.hourlyRateMad || 150,
      bio: profile.bio ?? '',
    };
  }
  return {
    role: 'client',
    fullName: firebaseUser?.displayName ?? '',
    phone: '+2126',
    city: 'Casablanca',
    neighborhood: '',
    languagePref: lang,
    specialty: 'Plomberie',
    hourlyRateMad: 150,
    bio: '',
  };
}

/**
 * Checks whether a decoded Firebase ID token carries the signed `admin: true` custom claim.
 */
export function hasAdminCustomClaim(claims: Record<string, unknown> | null | undefined): boolean {
  return Boolean(claims && claims.admin === true);
}

/**
 * Converts profile/booking Firestore write errors into clean bilingual FR/AR messages
 * and strips raw JSON payloads (e.g., serialized FirestoreErrorInfo) from UI alerts.
 */
export function mapProfileSaveError(error: unknown, lang: LanguageCode): string {
  const isAr = lang === 'ar';
  const authCode = extractFirebaseAuthErrorCode(error);
  if (authCode) {
    return mapFirebaseAuthError(error, lang);
  }

  const rawMsg = error instanceof Error ? error.message : String(error ?? '');
  const lower = rawMsg.toLowerCase();

  if (lower.includes('permission-denied') || lower.includes('missing or insufficient permissions')) {
    return isAr
      ? 'تعذر الحفظ بسبب قيود الصلاحيات. تأكد من تأكيد بريدك الإلكتروني وصحة جميع الحقول.'
      : 'Enregistrement refusé par les règles de sécurité. Vérifiez que votre e-mail est confirmé et que tous les champs sont valides.';
  }
  if (lower.includes('unavailable') || lower.includes('network')) {
    return isAr
      ? 'تعذر الاتصال بقاعدة البيانات حالياً. يرجى المحاولة مرة أخرى.'
      : 'Service momentanément indisponible. Vérifiez votre connexion puis réessayez.';
  }
  // Never dump serialized JSON diagnostics or stack traces to end users
  if (rawMsg.trim().startsWith('{') || rawMsg.length > 220) {
    return isAr
      ? 'حدث خطأ أثناء حفظ الملف الشخصي. يرجى المحاولة مرة أخرى.'
      : 'Une erreur est survenue lors de l’enregistrement du profil. Veuillez réessayer.';
  }
  return rawMsg || (isAr ? 'تعذر حفظ الملف الشخصي.' : 'Impossible d’enregistrer le profil.');
}

export type BookingSubmissionMode = 'live' | 'unverified' | 'local_preview';

/**
 * Classifies whether a booking submission will persist live to Firestore,
 * be blocked pending email verification, or run only as a local non-persistent preview.
 */
export function getBookingSubmissionMode(
  user: { emailVerified?: boolean; phoneNumber?: string | null } | null | undefined
): BookingSubmissionMode {
  if (!user) return 'local_preview';
  return isVerifiedAuthUser(user) ? 'live' : 'unverified';
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Validates Email/Password credentials for sign-in, sign-up, and password reset flows.
 */
export function validateEmailPasswordInput(params: {
  email: string;
  password?: string;
  mode: 'signin' | 'signup' | 'reset';
  lang: LanguageCode;
}): { valid: boolean; error?: string; normalizedEmail: string } {
  const isAr = params.lang === 'ar';
  const normalizedEmail = params.email.trim().toLowerCase();

  if (!EMAIL_PATTERN.test(normalizedEmail) || normalizedEmail.length > 160) {
    return {
      valid: false,
      normalizedEmail,
      error: isAr
        ? 'يرجى إدخال عنوان بريد إلكتروني صالح.'
        : 'Veuillez saisir une adresse e-mail valide.',
    };
  }

  if (params.mode === 'reset') {
    return { valid: true, normalizedEmail };
  }

  const password = params.password ?? '';
  if (password.length < 8) {
    return {
      valid: false,
      normalizedEmail,
      error: isAr
        ? 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل.'
        : 'Le mot de passe doit contenir au moins 8 caractères.',
    };
  }

  if (params.mode === 'signup' && (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))) {
    return {
      valid: false,
      normalizedEmail,
      error: isAr
        ? 'يجب أن تتضمن كلمة المرور حرفاً واحداً ورقماً واحداً على الأقل.'
        : 'Le mot de passe doit contenir au moins une lettre et un chiffre.',
    };
  }

  return { valid: true, normalizedEmail };
}

const SIGNUP_INTENT_KEY = 'moul_lkhedma_signup_intent';

export function persistSignupRoleIntent(role: UserProfileRecord['role']): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SIGNUP_INTENT_KEY, role);
  } catch {
    // ignore storage errors
  }
}

export function readSignupRoleIntent(): UserProfileRecord['role'] | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = window.sessionStorage.getItem(SIGNUP_INTENT_KEY);
    if (val === 'client' || val === 'provider' || val === 'both') return val;
    return null;
  } catch {
    return null;
  }
}

export function clearSignupRoleIntent(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(SIGNUP_INTENT_KEY);
  } catch {
    // ignore storage errors
  }
}

/**
 * Pure Maâlem accounts ('provider') stay strictly inside their Maâlem workspace
 * and do not browse competing Maâlems. Clients, signed-out visitors, and Double Accounts ('both')
 * can explore the public Maâlem directory.
 */
export function canExploreMarketplace(
  role: UserProfileRecord['role'] | null | undefined
): boolean {
  return role !== 'provider';
}

/**
 * Resolves the post-login / post-verification landing dashboard route based on user role or signup intent.
 */
export function getDefaultDashboardForRole(
  role: UserProfileRecord['role'] | null | undefined,
  signupIntent?: UserProfileRecord['role'] | null
): 'provider' | 'dashboard' {
  const effective = role ?? signupIntent ?? 'client';
  if (effective === 'provider') return 'provider';
  if (effective === 'both' && signupIntent === 'provider') return 'provider';
  return 'dashboard';
}

export interface ProviderCompletenessResult {
  percent: number;
  checks: {
    hasIdentity: boolean;
    hasLocation: boolean;
    hasExperienceAndBio: boolean;
    hasCustomPhoto: boolean;
    hasSkills: boolean;
  };
}

/**
 * Evaluates a Maâlem's public card readiness (0-100%) to guide profile setup in ProviderDashboard.
 */
export function computeProviderProfileCompleteness(
  provider: {
    fullNameFr?: string;
    phone?: string;
    location?: { city?: string; quartier?: string };
    experienceYears?: number;
    bioFr?: string;
    skills?: string[];
    portfolioImages?: string[];
  } | null
): ProviderCompletenessResult {
  if (!provider) {
    return {
      percent: 0,
      checks: {
        hasIdentity: false,
        hasLocation: false,
        hasExperienceAndBio: false,
        hasCustomPhoto: false,
        hasSkills: false,
      },
    };
  }

  const hasIdentity =
    Boolean(provider.fullNameFr && provider.fullNameFr.trim().length >= 2) &&
    Boolean(provider.phone && provider.phone.trim().length >= 12);
  const hasLocation =
    Boolean(provider.location?.city) &&
    Boolean(provider.location?.quartier && provider.location.quartier.trim().length >= 2);
  const hasExperienceAndBio =
    typeof provider.experienceYears === 'number' &&
    provider.experienceYears > 0 &&
    Boolean(provider.bioFr && provider.bioFr.trim().length >= 25);
  const hasCustomPhoto = Boolean(
    Array.isArray(provider.portfolioImages) &&
      provider.portfolioImages.some((url) => url.startsWith('https://'))
  );
  const hasSkills = Boolean(Array.isArray(provider.skills) && provider.skills.length >= 2);

  const passedCount = [
    hasIdentity,
    hasLocation,
    hasExperienceAndBio,
    hasCustomPhoto,
    hasSkills,
  ].filter(Boolean).length;

  return {
    percent: Math.round((passedCount / 5) * 100),
    checks: {
      hasIdentity,
      hasLocation,
      hasExperienceAndBio,
      hasCustomPhoto,
      hasSkills,
    },
  };
}

/**
 * Evaluates whether a user profile has been suspended by an administrator (AUD-003).
 */
export function isSuspendedUserProfile(
  profile: Pick<UserProfileRecord, 'accountStatus'> | null | undefined
): boolean {
  return Boolean(profile && profile.accountStatus === 'suspended');
}

const TERMS_ACCEPTED_INTENT_KEY = 'moul_lkhedma_terms_accepted';

export function persistTermsAcceptedIntent(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(TERMS_ACCEPTED_INTENT_KEY, '1');
  } catch {
    // ignore storage errors
  }
}

export function hasPendingTermsAcceptedIntent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(TERMS_ACCEPTED_INTENT_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearTermsAcceptedIntent(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(TERMS_ACCEPTED_INTENT_KEY);
  } catch {
    // ignore storage errors
  }
}

/**
 * Preserves protected fields (`accountStatus`, `termsAcceptedAt`, `verifiedBadge`, `createdAt`)
 * when updating `/users/{uid}` so profile saves never fail `affectedKeys().hasOnly(...)` in `firestore.rules` (AUD-004),
 * and stamps `termsAcceptedAt` on initial user creation for Law 09-08 compliance (AUD-011).
 */
export function preserveProtectedUserFields(
  target: Record<string, unknown>,
  existingData: Record<string, unknown> | null | undefined,
  fallbackCreatedAt: unknown
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    ...target,
    verifiedBadge: existingData ? Boolean(existingData.verifiedBadge) : Boolean(target.verifiedBadge),
    createdAt: existingData && 'createdAt' in existingData ? existingData.createdAt : fallbackCreatedAt,
  };

  if (existingData && ('accountStatus' in existingData) && existingData.accountStatus !== undefined) {
    result.accountStatus = existingData.accountStatus;
  } else {
    delete result.accountStatus;
  }

  if (existingData) {
    if ('termsAcceptedAt' in existingData && existingData.termsAcceptedAt !== undefined) {
      result.termsAcceptedAt = existingData.termsAcceptedAt;
    } else {
      delete result.termsAcceptedAt;
    }
  } else {
    result.termsAcceptedAt = target.termsAcceptedAt ?? fallbackCreatedAt;
  }

  return result;
}

/**
 * Preserves protected provider fields (`completedJobs`, `lastCompletedBookingId`, `lastReviewBookingId`)
 * so updating `/providers/{uid}` never adds an unapproved `completedJobs` key when it was absent on `existing()` (AUD-004).
 */
export function preserveProtectedProviderFields(
  target: Record<string, unknown>,
  existingProvider: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };

  if (existingProvider) {
    if ('completedJobs' in existingProvider && typeof existingProvider.completedJobs === 'number') {
      result.completedJobs = Math.round(existingProvider.completedJobs);
    } else {
      delete result.completedJobs;
    }
    if (typeof existingProvider.lastCompletedBookingId === 'string') {
      result.lastCompletedBookingId = existingProvider.lastCompletedBookingId;
    } else {
      delete result.lastCompletedBookingId;
    }
    if (typeof existingProvider.lastReviewBookingId === 'string') {
      result.lastReviewBookingId = existingProvider.lastReviewBookingId;
    } else {
      delete result.lastReviewBookingId;
    }
  } else {
    result.completedJobs = 0;
    delete result.lastCompletedBookingId;
    delete result.lastReviewBookingId;
  }

  return result;
}

