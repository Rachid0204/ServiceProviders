import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  reauthenticateWithPopup,
  deleteUser,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseAppletConfig from '../firebase-applet-config.json';
import { shouldFallbackToRedirect } from './utils/authHelpers';

export interface ResolvedFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
  firestoreDatabaseId: string;
  recaptchaSiteKey?: string;
}

export const DEFAULT_FIREBASE_CONFIG: ResolvedFirebaseConfig = {
  apiKey: 'AIzaSyCCKsGk1BDttfuzSYnjMG9kPdzb3p31QfE',
  authDomain: 'serviceproviders-530c4.firebaseapp.com',
  projectId: 'serviceproviders-530c4',
  storageBucket: 'serviceproviders-530c4.firebasestorage.app',
  messagingSenderId: '63222145541',
  appId: '1:63222145541:web:6e910b8942d1641661f26c',
  measurementId: '',
  firestoreDatabaseId: 'ai-studio-721fde67-a110-4e25-bcc2-2f011a526460',
  recaptchaSiteKey: '',
};

/**
 * Resolves Firebase configuration from Vite environment variables (`VITE_FIREBASE_*`),
 * falling back to `firebase-applet-config.json` and the project's default `firebaseConfig`
 * for `serviceproviders-530c4`.
 */
export function resolveFirebaseConfig(
  env: Record<string, string | undefined> = (
    import.meta as unknown as { env?: Record<string, string | undefined> }
  ).env ?? {},
  appletConfig: Partial<ResolvedFirebaseConfig> = firebaseAppletConfig
): ResolvedFirebaseConfig {
  const pick = (
    envVal: string | undefined,
    jsonVal: string | undefined,
    fallback: string
  ): string => {
    const trimmedEnv = envVal?.trim();
    if (trimmedEnv && !trimmedEnv.startsWith('YOUR_')) {
      return trimmedEnv;
    }
    const trimmedJson = jsonVal?.trim();
    if (trimmedJson) {
      return trimmedJson;
    }
    return fallback;
  };

  const isValidFirestoreDatabaseId = (value: string): boolean =>
    value === '(default)' || /^[a-z][a-z0-9-]{2,61}[a-z0-9]$/.test(value);

  const projectId = pick(
    env.VITE_FIREBASE_PROJECT_ID,
    appletConfig.projectId,
    DEFAULT_FIREBASE_CONFIG.projectId
  );

  const pickDatabaseId = (
    envVal: string | undefined,
    jsonVal: string | undefined,
    fallback: string
  ): string => {
    const trimmedEnv = envVal?.trim();
    const trimmedJson = jsonVal?.trim();
    const provisionedDbId =
      trimmedJson && isValidFirestoreDatabaseId(trimmedJson) ? trimmedJson : fallback;
    const isProvisionedProject =
      projectId === (appletConfig.projectId?.trim() || DEFAULT_FIREBASE_CONFIG.projectId);

    if (
      trimmedEnv &&
      !trimmedEnv.startsWith('YOUR_') &&
      isValidFirestoreDatabaseId(trimmedEnv) &&
      !(isProvisionedProject && trimmedEnv === '(default)' && provisionedDbId !== '(default)')
    ) {
      return trimmedEnv;
    }
    return provisionedDbId;
  };

  return {
    apiKey: pick(
      env.VITE_FIREBASE_API_KEY,
      appletConfig.apiKey,
      DEFAULT_FIREBASE_CONFIG.apiKey
    ),
    authDomain: pick(
      env.VITE_FIREBASE_AUTH_DOMAIN,
      appletConfig.authDomain,
      DEFAULT_FIREBASE_CONFIG.authDomain
    ),
    projectId,
    storageBucket: pick(
      env.VITE_FIREBASE_STORAGE_BUCKET,
      appletConfig.storageBucket,
      DEFAULT_FIREBASE_CONFIG.storageBucket
    ),
    messagingSenderId: pick(
      env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appletConfig.messagingSenderId,
      DEFAULT_FIREBASE_CONFIG.messagingSenderId
    ),
    appId: pick(
      env.VITE_FIREBASE_APP_ID,
      appletConfig.appId,
      DEFAULT_FIREBASE_CONFIG.appId
    ),
    measurementId: pick(
      env.VITE_FIREBASE_MEASUREMENT_ID,
      appletConfig.measurementId,
      DEFAULT_FIREBASE_CONFIG.measurementId
    ),
    firestoreDatabaseId: pickDatabaseId(
      env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
      appletConfig.firestoreDatabaseId,
      DEFAULT_FIREBASE_CONFIG.firestoreDatabaseId
    ),
    recaptchaSiteKey: pick(
      env.VITE_FIREBASE_RECAPTCHA_SITE_KEY,
      appletConfig.recaptchaSiteKey,
      ''
    ),
  };
}

export const firebaseConfig = resolveFirebaseConfig();

export interface AppCheckStatus {
  configured: boolean;
  active: boolean;
  siteKeyPresent: boolean;
  error?: string;
}

export const appCheckStatus: AppCheckStatus = {
  configured: Boolean(firebaseConfig.recaptchaSiteKey),
  active: false,
  siteKeyPresent: Boolean(firebaseConfig.recaptchaSiteKey),
};

const app = initializeApp(firebaseConfig);
// Activate Firebase App Check automatically in browsers when a reCAPTCHA v3 site key is provisioned
if (typeof window !== 'undefined') {
  if (firebaseConfig.recaptchaSiteKey) {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(firebaseConfig.recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
      appCheckStatus.active = true;
    } catch (err) {
      appCheckStatus.error = err instanceof Error ? err.message : String(err);
      console.warn('Firebase App Check initialization skipped:', err);
    }
  } else if ((import.meta as unknown as { env?: { PROD?: boolean } }).env?.PROD) {
    console.warn(
      '[Security / AUD-016] Firebase App Check is not active because VITE_FIREBASE_RECAPTCHA_SITE_KEY is not configured.'
    );
  }
}
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerIds: string[];
  };
}

export function buildFirestoreErrorInfo(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  return {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerIds:
        auth.currentUser?.providerData?.map((provider) => provider.providerId) || [],
    },
    operationType,
    path,
  };
}

/**
 * Logs a structured Firestore error without throwing (safe inside onSnapshot callbacks
 * where synchronous throws escape React's ErrorBoundary).
 */
export function reportFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const errInfo = buildFirestoreErrorInfo(error, operationType, path);
  console.error('Firestore Error:', JSON.stringify(errInfo));
  return errInfo;
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo = reportFirestoreError(error, operationType, path);
  throw new Error(JSON.stringify(errInfo));
}

export async function signInWithGoogle() {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (err) {
    if (shouldFallbackToRedirect(err)) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw err;
  }
}

export async function resolvePendingAuthRedirect() {
  return getRedirectResult(auth);
}

async function dispatchVerificationEmail(
  user: NonNullable<typeof auth.currentUser>,
  roleIntent?: 'client' | 'provider' | 'both'
) {
  if (typeof window !== 'undefined' && window.location?.origin?.startsWith('http')) {
    const roleParam = roleIntent ? `&role=${roleIntent}` : '';
    try {
      await sendEmailVerification(user, {
        url: `${window.location.origin}/?verified=1${roleParam}`,
        handleCodeInApp: false,
      });
      return;
    } catch {
      // Fallback to default Firebase verification link if continue URI is not yet whitelisted
    }
  }
  await sendEmailVerification(user);
}

export async function resendVerificationEmail(roleIntent?: 'client' | 'provider' | 'both') {
  if (!auth.currentUser) {
    throw new Error('auth/user-not-found');
  }
  await dispatchVerificationEmail(auth.currentUser, roleIntent);
}

export async function reloadCurrentUser() {
  if (!auth.currentUser) return null;
  await auth.currentUser.reload();
  await auth.currentUser.getIdToken(true);
  return auth.currentUser;
}

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
}

export async function signUpWithEmail(
  email: string,
  password: string,
  roleIntent?: 'client' | 'provider' | 'both'
) {
  const credential = await createUserWithEmailAndPassword(
    auth,
    email.trim().toLowerCase(),
    password
  );
  // Immediately dispatch verification email with return URL so the user lands back in their dashboard
  await dispatchVerificationEmail(credential.user, roleIntent);
  return credential;
}

export async function requestPasswordReset(email: string) {
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

export async function deleteCurrentAuthUser() {
  const user = auth.currentUser;
  if (!user) throw new Error('auth/user-not-found');
  try {
    await deleteUser(user);
  } catch (err) {
    const code =
      err && typeof err === 'object' && 'code' in err ? String((err as { code?: unknown }).code) : '';
    const hasGoogleProvider = user.providerData.some((p) => p.providerId === 'google.com');
    if (code === 'auth/requires-recent-login' && hasGoogleProvider) {
      await reauthenticateWithPopup(user, googleProvider);
      await deleteUser(user);
      return;
    }
    throw err;
  }
}

export async function signOutUser() {
  return firebaseSignOut(auth);
}
