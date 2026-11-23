import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractFirebaseAuthErrorCode,
  shouldFallbackToRedirect,
  mapFirebaseAuthError,
  mapProfileSaveError,
  buildBootstrapClientProfile,
  isVerifiedAuthUser,
  getInitialOnboardingFormState,
  hasAdminCustomClaim,
  getBookingSubmissionMode,
  validateEmailPasswordInput,
  canExploreMarketplace,
  getDefaultDashboardForRole,
  computeProviderProfileCompleteness,
} from './authHelpers';

test('extractFirebaseAuthErrorCode extracts auth/* codes from Firebase errors and messages', () => {
  assert.equal(extractFirebaseAuthErrorCode({ code: 'auth/popup-blocked' }), 'auth/popup-blocked');
  assert.equal(
    extractFirebaseAuthErrorCode(new Error('Firebase: Error (auth/network-request-failed).')),
    'auth/network-request-failed'
  );
  assert.equal(extractFirebaseAuthErrorCode(new Error('Generic error')), null);
  assert.equal(extractFirebaseAuthErrorCode(null), null);
});

test('shouldFallbackToRedirect triggers only for popup-blocked and unsupported environments', () => {
  assert.equal(shouldFallbackToRedirect({ code: 'auth/popup-blocked' }), true);
  assert.equal(
    shouldFallbackToRedirect({ code: 'auth/operation-not-supported-in-this-environment' }),
    true
  );
  assert.equal(shouldFallbackToRedirect({ code: 'auth/popup-closed-by-user' }), false);
  assert.equal(shouldFallbackToRedirect({ code: 'auth/network-request-failed' }), false);
});

test('mapFirebaseAuthError returns localized FR and AR messages without exposing raw error internals', () => {
  const frNet = mapFirebaseAuthError({ code: 'auth/network-request-failed' }, 'fr');
  const arNet = mapFirebaseAuthError({ code: 'auth/network-request-failed' }, 'ar');
  assert.ok(frNet.includes('réseau'));
  assert.ok(arNet.includes('الإنترنت'));

  const frDomain = mapFirebaseAuthError({ code: 'auth/unauthorized-domain' }, 'fr');
  assert.ok(frDomain.includes('domaine'));

  // Raw internal details must never leak into fallback error message
  const leaked = mapFirebaseAuthError(new Error('{"uid":"secret-uid","email":"a@b.com"}'), 'fr');
  assert.equal(leaked.includes('secret-uid'), false);
  assert.equal(leaked.includes('a@b.com'), false);
});

test('buildBootstrapClientProfile creates a Firestore-valid client profile with normalized phone', () => {
  const profile = buildBootstrapClientProfile({
    uid: 'uid-new-123',
    fullName: '  Amina Bennani  ',
    phone: '06 61 44 55 66',
    city: 'Rabat',
    neighborhood: 'Agdal',
    languagePref: 'fr',
  });
  assert.equal(profile.uid, 'uid-new-123');
  assert.equal(profile.role, 'client');
  assert.equal(profile.fullName, 'Amina Bennani');
  assert.equal(profile.phone, '+212661445566');
  assert.equal(profile.verifiedBadge, false);
  assert.equal(profile.city, 'Rabat');
  assert.equal(profile.neighborhood, 'Agdal');
});

test('isVerifiedAuthUser accepts verified email or verified phoneNumber and rejects unverified/null users', () => {
  assert.equal(isVerifiedAuthUser({ emailVerified: true, phoneNumber: null }), true);
  assert.equal(isVerifiedAuthUser({ emailVerified: false, phoneNumber: '+212661234567' }), true);
  assert.equal(isVerifiedAuthUser({ emailVerified: false, phoneNumber: null }), false);
  assert.equal(isVerifiedAuthUser(null), false);
  assert.equal(isVerifiedAuthUser(undefined), false);
});

test('getInitialOnboardingFormState clears previous PII on sign-out and restores clean defaults', () => {
  const signedOut = getInitialOnboardingFormState(null, null, 'fr');
  assert.equal(signedOut.fullName, '');
  assert.equal(signedOut.phone, '+2126');
  assert.equal(signedOut.neighborhood, '');
  assert.equal(signedOut.bio, '');
  assert.equal(signedOut.role, 'client');

  const newGoogleUser = getInitialOnboardingFormState(null, { displayName: 'Omar Idrissi' }, 'ar');
  assert.equal(newGoogleUser.fullName, 'Omar Idrissi');
  assert.equal(newGoogleUser.languagePref, 'ar');
  assert.equal(newGoogleUser.phone, '+2126');
});

test('hasAdminCustomClaim strictly checks boolean admin: true claim', () => {
  assert.equal(hasAdminCustomClaim({ admin: true }), true);
  assert.equal(hasAdminCustomClaim({ admin: false }), false);
  assert.equal(hasAdminCustomClaim({ admin: 'true' }), false);
  assert.equal(hasAdminCustomClaim({}), false);
  assert.equal(hasAdminCustomClaim(null), false);
});

test('mapProfileSaveError strips raw JSON diagnostics and localizes Firestore permission errors', () => {
  const jsonErr = new Error(
    '{"error":"internal","operationType":"write","path":"users/u1","authInfo":{"userId":"u1"}}'
  );
  const mappedJson = mapProfileSaveError(jsonErr, 'fr');
  assert.equal(mappedJson.startsWith('{'), false);
  assert.equal(mappedJson.includes('users/u1'), false);

  const permFr = mapProfileSaveError(new Error('Missing or insufficient permissions'), 'fr');
  const permAr = mapProfileSaveError(new Error('permission-denied'), 'ar');
  assert.ok(permFr.includes('règles de sécurité'));
  assert.ok(permAr.includes('الصلاحيات'));
});

test('getBookingSubmissionMode accurately classifies live, unverified, and local_preview states', () => {
  assert.equal(getBookingSubmissionMode(null), 'local_preview');
  assert.equal(getBookingSubmissionMode({ emailVerified: false, phoneNumber: null }), 'unverified');
  assert.equal(getBookingSubmissionMode({ emailVerified: true, phoneNumber: null }), 'live');
  assert.equal(getBookingSubmissionMode({ emailVerified: false, phoneNumber: '+212661234567' }), 'live');
});

test('validateEmailPasswordInput validates email format, password length, signup complexity, and reset mode', () => {
  assert.equal(
    validateEmailPasswordInput({ email: 'not-an-email', password: 'Password1', mode: 'signin', lang: 'fr' }).valid,
    false
  );
  assert.equal(
    validateEmailPasswordInput({ email: '  User@Example.MA ', password: 'short', mode: 'signin', lang: 'fr' }).valid,
    false
  );
  const weakSignup = validateEmailPasswordInput({
    email: 'user@example.ma',
    password: 'onlyletters',
    mode: 'signup',
    lang: 'ar',
  });
  assert.equal(weakSignup.valid, false);
  assert.ok(weakSignup.error?.includes('حرفاً'));

  const okSignup = validateEmailPasswordInput({
    email: '  User@Example.MA ',
    password: 'Password123',
    mode: 'signup',
    lang: 'fr',
  });
  assert.equal(okSignup.valid, true);
  assert.equal(okSignup.normalizedEmail, 'user@example.ma');

  const okReset = validateEmailPasswordInput({
    email: 'user@example.ma',
    mode: 'reset',
    lang: 'fr',
  });
  assert.equal(okReset.valid, true);
});

test('canExploreMarketplace blocks pure provider accounts and allows visitors, clients, and double accounts', () => {
  assert.equal(canExploreMarketplace('provider'), false);
  assert.equal(canExploreMarketplace('both'), true);
  assert.equal(canExploreMarketplace('client'), true);
  assert.equal(canExploreMarketplace(null), true);
  assert.equal(canExploreMarketplace(undefined), true);
});

test('getDefaultDashboardForRole routes verified users directly to their role dashboard', () => {
  assert.equal(getDefaultDashboardForRole('provider', null), 'provider');
  assert.equal(getDefaultDashboardForRole(null, 'provider'), 'provider');
  assert.equal(getDefaultDashboardForRole('client', null), 'dashboard');
  assert.equal(getDefaultDashboardForRole(null, 'client'), 'dashboard');
  assert.equal(getDefaultDashboardForRole('both', 'provider'), 'provider');
  assert.equal(getDefaultDashboardForRole('both', 'client'), 'dashboard');
});

test('computeProviderProfileCompleteness accurately scores a Maâlem card from 0% to 100%', () => {
  assert.equal(computeProviderProfileCompleteness(null).percent, 0);

  const partial = computeProviderProfileCompleteness({
    fullNameFr: 'Maâlem Karim',
    phone: '+212661234567',
    location: { city: 'Casablanca', quartier: 'Maârif' },
    experienceYears: 8,
    bioFr: 'Plombier certifié avec 8 ans d’expérience à Casablanca.',
    skills: ['Plomberie'],
    portfolioImages: ['/src/assets/images/service_plumbing_repair_1794980477189.jpg'],
  });
  assert.equal(partial.percent, 60);
  assert.equal(partial.checks.hasCustomPhoto, false);
  assert.equal(partial.checks.hasSkills, false);

  const full = computeProviderProfileCompleteness({
    fullNameFr: 'Maâlem Karim',
    phone: '+212661234567',
    location: { city: 'Casablanca', quartier: 'Maârif' },
    experienceYears: 8,
    bioFr: 'Plombier certifié avec 8 ans d’expérience à Casablanca.',
    skills: ['Détection de fuite', 'Chauffe-eau'],
    portfolioImages: ['https://firebasestorage.googleapis.com/v0/b/app/o/photo.jpg'],
  });
  assert.equal(full.percent, 100);
  assert.equal(full.checks.hasCustomPhoto, true);
  assert.equal(full.checks.hasSkills, true);
});

test('AUD-003 & AUD-004: isSuspendedUserProfile, preserveProtectedUserFields, and preserveProtectedProviderFields preserve protected fields and completedJobs contract', async () => {
  const {
    isSuspendedUserProfile,
    preserveProtectedUserFields,
    preserveProtectedProviderFields,
  } = await import('./authHelpers');

  assert.equal(isSuspendedUserProfile(null), false);
  assert.equal(isSuspendedUserProfile({ accountStatus: 'active' }), false);
  assert.equal(isSuspendedUserProfile({ accountStatus: 'suspended' }), true);

  // User profile save preserves existing accountStatus & termsAcceptedAt
  const mergedWithProtected = preserveProtectedUserFields(
    {
      uid: 'u-1',
      role: 'client',
      fullName: 'Amina',
      phone: '+212661234567',
      city: 'Casablanca',
      neighborhood: 'Maârif',
      languagePref: 'fr',
      verifiedBadge: false,
      updatedAt: 'NOW',
    },
    {
      verifiedBadge: true,
      accountStatus: 'active',
      termsAcceptedAt: 'TS_TERMS',
      createdAt: 'TS_CREATED',
    },
    'FALLBACK_CREATED'
  );
  assert.equal(mergedWithProtected.verifiedBadge, true);
  assert.equal(mergedWithProtected.accountStatus, 'active');
  assert.equal(mergedWithProtected.termsAcceptedAt, 'TS_TERMS');
  assert.equal(mergedWithProtected.createdAt, 'TS_CREATED');

  // User profile save omits accountStatus & termsAcceptedAt when absent on existing doc
  const mergedWithoutOptional = preserveProtectedUserFields(
    {
      uid: 'u-2',
      role: 'client',
      fullName: 'Youssef',
      verifiedBadge: false,
      accountStatus: 'active',
    },
    {
      verifiedBadge: false,
      createdAt: 'TS_CREATED_2',
    },
    'FALLBACK'
  );
  assert.equal('accountStatus' in mergedWithoutOptional, false);
  assert.equal('termsAcceptedAt' in mergedWithoutOptional, false);

  // Provider update omits completedJobs if existing doc did not have completedJobs
  const updatedProviderWithoutCompleted = preserveProtectedProviderFields(
    { uid: 'p-1', fullNameFr: 'Karim', completedJobs: 0 },
    { uid: 'p-1', ratingAvg: 4.8, reviewCount: 5 }
  );
  assert.equal('completedJobs' in updatedProviderWithoutCompleted, false);

  // Provider update preserves existing completedJobs and booking IDs when present
  const updatedProviderWithCompleted = preserveProtectedProviderFields(
    { uid: 'p-1', fullNameFr: 'Karim' },
    {
      uid: 'p-1',
      completedJobs: 12,
      lastCompletedBookingId: 'bk-12',
      lastReviewBookingId: 'bk-11',
    }
  );
  assert.equal(updatedProviderWithCompleted.completedJobs, 12);
  assert.equal(updatedProviderWithCompleted.lastCompletedBookingId, 'bk-12');
  assert.equal(updatedProviderWithCompleted.lastReviewBookingId, 'bk-11');

  // New provider creation initializes completedJobs to 0
  const newProvider = preserveProtectedProviderFields({ uid: 'p-new', fullNameFr: 'Driss' }, null);
  assert.equal(newProvider.completedJobs, 0);
});

test('AUD-011: preserveProtectedUserFields stamps termsAcceptedAt on new user creation and consent intent helpers track sessionStorage state', async () => {
  const {
    preserveProtectedUserFields,
    persistTermsAcceptedIntent,
    hasPendingTermsAcceptedIntent,
    clearTermsAcceptedIntent,
  } = await import('./authHelpers');

  // New user creation (existingData === null) automatically stamps termsAcceptedAt using fallback serverTimestamp
  const createdWithDefault = preserveProtectedUserFields(
    {
      uid: 'u-new-1',
      role: 'client',
      fullName: 'Nadia',
      phone: '+212661234567',
      city: 'Rabat',
      neighborhood: 'Agdal',
      languagePref: 'fr',
      verifiedBadge: false,
      updatedAt: 'SERVER_TS',
    },
    null,
    'SERVER_TS'
  );
  assert.equal(createdWithDefault.createdAt, 'SERVER_TS');
  assert.equal(createdWithDefault.termsAcceptedAt, 'SERVER_TS');
  assert.equal('accountStatus' in createdWithDefault, false);

  // Explicit termsAcceptedAt on new user creation is preserved
  const createdWithExplicit = preserveProtectedUserFields(
    {
      uid: 'u-new-2',
      role: 'provider',
      fullName: 'Karim',
      termsAcceptedAt: 'EXPLICIT_TERMS_TS',
    },
    null,
    'SERVER_TS'
  );
  assert.equal(createdWithExplicit.termsAcceptedAt, 'EXPLICIT_TERMS_TS');

  // In Node (no window), consent intent helpers degrade safely
  assert.equal(hasPendingTermsAcceptedIntent(), false);
  persistTermsAcceptedIntent();
  clearTermsAcceptedIntent();
  assert.equal(hasPendingTermsAcceptedIntent(), false);

  // With mocked browser window.sessionStorage, consent intent persists and clears cleanly
  const store = new Map<string, string>();
  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      sessionStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
      },
    },
  });
  try {
    assert.equal(hasPendingTermsAcceptedIntent(), false);
    persistTermsAcceptedIntent();
    assert.equal(hasPendingTermsAcceptedIntent(), true);
    clearTermsAcceptedIntent();
    assert.equal(hasPendingTermsAcceptedIntent(), false);
  } finally {
    if (originalWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
      });
    }
  }
});


