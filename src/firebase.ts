import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseAppletConfig from '../firebase-applet-config.json';

export interface ResolvedFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
  firestoreDatabaseId: string;
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
  };
}

export const firebaseConfig = resolveFirebaseConfig();

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

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
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
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
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
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
  return signInWithPopup(auth, googleProvider);
}

export async function signOutUser() {
  return firebaseSignOut(auth);
}
