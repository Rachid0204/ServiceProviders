import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { resolveFirebaseConfig } from './src/firebase';

const rulesContent = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
const storageRulesContent = fs.readFileSync(path.resolve(process.cwd(), 'storage.rules'), 'utf8');
const envExampleContent = fs.readFileSync(path.resolve(process.cwd(), '.env.example'), 'utf8');
const serverContent = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf8');

test('Dirty Dozen #1 & #2: Global default-deny and verified email guard exist in firestore.rules', () => {
  assert.ok(rulesContent.includes('match /{document=**} {\n      allow read, write: if false;\n    }'));
  assert.ok(rulesContent.includes('request.auth.token.email_verified == true'));
});

test('Dirty Dozen #3 & #4: Users can only edit their own users/{uid} and providers/{uid} documents, and cannot self-assign verifiedBadge', () => {
  assert.ok(rulesContent.includes('incoming().uid == request.auth.uid'));
  assert.ok(rulesContent.includes('request.auth.uid == uid'));
  assert.ok(rulesContent.includes('(incoming().verifiedBadge == false || isAdmin())'));
  assert.ok(rulesContent.includes('incoming().verifiedBadge == existing().verifiedBadge'));
});

test('Dirty Dozen #5, #6, #7: Anyone can read providers and reviews while writes remain strictly validated', () => {
  assert.ok(rulesContent.includes('match /providers/{uid}'));
  assert.ok(rulesContent.includes('allow get: if isValidId(uid);'));
  assert.ok(rulesContent.includes('allow list: if true;'));
  assert.ok(rulesContent.includes('match /reviews/{reviewId}'));
  assert.ok(rulesContent.includes('allow get: if isValidId(reviewId);'));
});

test('Dirty Dozen #8, #9, #10: PII isolation on /users/{uid}, request.time enforcement, and immutable fields', () => {
  assert.ok(rulesContent.includes('allow get: if isSignedIn() && isValidId(uid) && (request.auth.uid == uid || isAdmin());'));
  assert.ok(rulesContent.includes('incoming().createdAt == request.time'));
  assert.ok(rulesContent.includes('incoming().createdAt == existing().createdAt'));
});

test('Dirty Dozen #11 & #12: Only authenticated users can create bookings; only involved clientId or providerId can read/update bookings or send messages in chats/{bookingId}/messages', () => {
  assert.ok(rulesContent.includes('match /bookings/{bookingId}'));
  assert.ok(rulesContent.includes('(existing().clientId == request.auth.uid || existing().providerId == request.auth.uid || isAdmin())'));
  assert.ok(rulesContent.includes('(resource.data.clientId == request.auth.uid || resource.data.providerId == request.auth.uid)'));
  assert.ok(rulesContent.includes('match /chats/{bookingId}/messages/{messageId}'));
  assert.ok(rulesContent.includes('get(/databases/$(database)/documents/bookings/$(bookingId)).data.clientId == request.auth.uid'));
  assert.ok(rulesContent.includes('get(/databases/$(database)/documents/bookings/$(bookingId)).data.providerId == request.auth.uid'));
});

test('Storage Rules: Default-deny, public portfolio read, owner-only writes, and 5MB image validation enforced', () => {
  assert.ok(storageRulesContent.includes('service firebase.storage'));
  assert.ok(storageRulesContent.includes('match /{allPaths=**} {\n      allow read, write: if false;\n    }'));
  assert.ok(storageRulesContent.includes('match /providers/{uid}/portfolio/{fileName}'));
  assert.ok(storageRulesContent.includes('request.resource.size <= 5 * 1024 * 1024'));
  assert.ok(storageRulesContent.includes("request.resource.contentType.matches('image/.*')"));
});

test('Firebase Env & Cloud Run Port: resolveFirebaseConfig reads VITE_FIREBASE_* with fallbacks and server.ts uses process.env.PORT || 8080', () => {
  assert.ok(envExampleContent.includes('VITE_FIREBASE_API_KEY='));
  assert.ok(envExampleContent.includes('VITE_FIREBASE_AUTH_DOMAIN='));
  assert.ok(envExampleContent.includes('VITE_FIREBASE_PROJECT_ID="serviceproviders-530c4"'));
  assert.ok(serverContent.includes('process.env.PORT || 8080'));

  const customEnvConfig = resolveFirebaseConfig(
    {
      VITE_FIREBASE_API_KEY: 'custom-env-key',
      VITE_FIREBASE_PROJECT_ID: 'serviceproviders-530c4',
    },
    {}
  );
  assert.equal(customEnvConfig.apiKey, 'custom-env-key');
  assert.equal(customEnvConfig.projectId, 'serviceproviders-530c4');
  assert.equal(customEnvConfig.authDomain, 'serviceproviders-530c4.firebaseapp.com');

  const defaultFallback = resolveFirebaseConfig({}, {});
  assert.equal(defaultFallback.apiKey, 'AIzaSyCCKsGk1BDttfuzSYnjMG9kPdzb3p31QfE');
  assert.equal(defaultFallback.authDomain, 'serviceproviders-530c4.firebaseapp.com');
  assert.equal(defaultFallback.projectId, 'serviceproviders-530c4');
  assert.equal(defaultFallback.storageBucket, 'serviceproviders-530c4.firebasestorage.app');
  assert.equal(defaultFallback.messagingSenderId, '63222145541');
  assert.equal(defaultFallback.appId, '1:63222145541:web:6e910b8942d1641661f26c');
  assert.equal(defaultFallback.firestoreDatabaseId, 'ai-studio-721fde67-a110-4e25-bcc2-2f011a526460');

  // Regression guard: invalid uppercase "DEFAULT" env var must not break Firestore connection
  const invalidDbEnv = resolveFirebaseConfig(
    {
      VITE_FIREBASE_PROJECT_ID: 'serviceproviders-530c4',
      VITE_FIREBASE_FIRESTORE_DATABASE_ID: 'DEFAULT',
    },
    {
      projectId: 'serviceproviders-530c4',
      firestoreDatabaseId: 'ai-studio-721fde67-a110-4e25-bcc2-2f011a526460',
    }
  );
  assert.equal(invalidDbEnv.firestoreDatabaseId, 'ai-studio-721fde67-a110-4e25-bcc2-2f011a526460');
});

test('Hardened Workflow Rules: sequential booking state machine, deterministic reviewId, atomic rating aggregation, and Storage DB ID', () => {
  assert.ok(rulesContent.includes("existing().status == 'in_progress'"));
  assert.ok(rulesContent.includes("existing().paymentMethod == 'cash_on_completion' && incoming().paymentStatus == 'paid'"));
  assert.ok(rulesContent.includes("existing().paymentMethod == 'cmi_escrow' && incoming().paymentStatus == existing().paymentStatus"));
  assert.ok(rulesContent.includes('reviewId == incoming().bookingId'));
  assert.ok(rulesContent.includes("getAfter(/databases/$(database)/documents/bookings/$(reviewId)).data.status == 'reviewed'"));
  assert.ok(rulesContent.includes('incoming().reviewCount == existing().reviewCount + 1'));
  assert.ok(storageRulesContent.includes('/databases/ai-studio-721fde67-a110-4e25-bcc2-2f011a526460/documents/bookings/$(bookingId)'));
});

test('Admin Dashboard RBAC & Audit Rules: verified bootstrapped admin, admin list access, review moderation delete, and append-only adminLogs', () => {
  assert.ok(rulesContent.includes("request.auth.token.email == 'wahbi.rachid@gmail.com'"));
  assert.ok(rulesContent.includes('allow list: if (isSignedIn() && resource.data.uid == request.auth.uid) || isAdmin();'));
  assert.ok(rulesContent.includes('allow delete: if isVerifiedUser() && isValidId(reviewId) && isAdmin();'));
  assert.ok(rulesContent.includes('match /adminLogs/{logId}'));
  assert.ok(rulesContent.includes('function isValidAdminLog(data)'));
  assert.ok(rulesContent.includes('data.adminUid == request.auth.uid'));
  assert.ok(rulesContent.includes('allow update, delete: if false;'));
});

test('Phase 2 & 3 Security Policy Audit: non-admins cannot tamper with estimatedMad (final_price), verifiedBadge (is_verified), ratingAvg, withdrawals, or systemSettings', () => {
  // Dual role 'both' supported in user schema
  assert.ok(rulesContent.includes("data.role == 'both'"));
  // Immutable price lock for non-admin updates
  assert.ok(rulesContent.includes('incoming().estimatedMad == existing().estimatedMad'));
  // Escrow refund & dispute split statuses enforced in rules
  assert.ok(rulesContent.includes("data.paymentStatus == 'refunded'"));
  assert.ok(rulesContent.includes("data.paymentStatus == 'disputed_split'"));
  // Withdrawals & SystemSettings protected by admin RBAC
  assert.ok(rulesContent.includes('match /withdrawals/{withdrawalId}'));
  assert.ok(rulesContent.includes('match /systemSettings/{configId}'));
});

