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
