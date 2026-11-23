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

  const appCheckEnv = resolveFirebaseConfig(
    {
      VITE_FIREBASE_RECAPTCHA_SITE_KEY: '6LeTestSiteKey123',
    },
    {}
  );
  assert.equal(appCheckEnv.recaptchaSiteKey, '6LeTestSiteKey123');
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

test('Architect Audit Hardening: safe asset URLs, full array validation, financial invariants, chat anti-spoofing, and storage/server controls', () => {
  // Asset URL sanitization and full list validation (no unvalidated tail items)
  assert.ok(rulesContent.includes('function isSafeAssetUrl(url)'));
  assert.ok(rulesContent.includes('function isValidSkillList(skills)'));
  assert.ok(rulesContent.includes('function isValidPortfolioList(images)'));

  // Dynamic fee lookup + strict escrow payout/fee/refund invariants + reviewed escrow release
  assert.ok(rulesContent.includes('function getConfiguredPlatformFeePct()'));
  assert.ok(rulesContent.includes('incoming().providerId != request.auth.uid'));
  assert.ok(rulesContent.includes("existing().status == 'completed' || existing().status == 'reviewed'"));
  assert.ok(rulesContent.includes("incoming().completedJobs == (('completedJobs' in existing()) ? existing().completedJobs : 0) + 1"));
  assert.ok(rulesContent.includes("getAfter(/databases/$(database)/documents/bookings/$(incoming().lastCompletedBookingId)).data.status == 'completed'"));

  // Chat list fixed via parent booking lookup + anti-spoofing on message creation
  assert.ok(rulesContent.includes('allow list: if isVerifiedUser() &&'));
  assert.ok(rulesContent.includes('incoming().clientId == get(/databases/$(database)/documents/bookings/$(bookingId)).data.clientId'));
  assert.ok(rulesContent.includes('incoming().providerId == get(/databases/$(database)/documents/bookings/$(bookingId)).data.providerId'));

  // Withdrawal KYC & provider checks
  assert.ok(rulesContent.includes('incoming().amountMad >= get(/databases/$(database)/documents/systemSettings/global).data.minWithdrawalMad'));
  assert.ok(rulesContent.includes('get(/databases/$(database)/documents/providers/$(request.auth.uid)).data.verifiedBadge == true'));

  // Storage email verification, Admin read access, and exists() guard
  assert.ok(storageRulesContent.includes('function isVerifiedUser()'));
  assert.ok(storageRulesContent.includes('function isAdmin()'));
  assert.ok(storageRulesContent.includes('firestore.exists('));

  // Server security headers and 501 CMI stub
  assert.ok(serverContent.includes("app.disable('x-powered-by')"));
  assert.ok(serverContent.includes('res.status(501)'));

  // Atomic client/provider profile bootstrap on both providers and bookings creation
  const existsAfterMatches =
    rulesContent.match(/existsAfter\(\/databases\/\$\(database\)\/documents\/users\/\$\(request\.auth\.uid\)\)/g) || [];
  assert.ok(existsAfterMatches.length >= 2);

  // Auth audit hardening: custom claims RBAC, case-insensitive admin email, and Phone Auth verification support
  assert.ok(rulesContent.includes('request.auth.token.admin == true'));
  assert.ok(rulesContent.includes("request.auth.token.email.lower() == 'wahbi.rachid@gmail.com'"));
  assert.ok(rulesContent.includes("'phone_number' in request.auth.token"));
  assert.ok(storageRulesContent.includes('request.auth.token.admin == true'));
  assert.ok(storageRulesContent.includes("'phone_number' in request.auth.token"));
});

test('Open Client Job Board & Proposal Privacy Rules: validated jobPosts, isolated Maâlem quotes, diploma fields, and jobPosts Storage uploads', () => {
  // Maâlem card diploma fields supported safely
  assert.ok(rulesContent.includes("'diplomaFr'"));
  assert.ok(rulesContent.includes("'diplomaAr'"));

  // Job posts schema & access rules
  assert.ok(rulesContent.includes('function isValidJobPost(data)'));
  assert.ok(rulesContent.includes('function isValidJobProposal(data)'));
  assert.ok(rulesContent.includes('match /jobPosts/{jobId}'));
  assert.ok(rulesContent.includes('match /proposals/{providerId}'));

  // Competing Maâlems cannot read each other's bids
  assert.ok(rulesContent.includes('request.auth.uid == providerId ||'));
  assert.ok(rulesContent.includes('existing().clientId == request.auth.uid ||'));
  assert.ok(rulesContent.includes('exists(/databases/$(database)/documents/providers/$(request.auth.uid))'));
  assert.ok(rulesContent.includes('incoming().clientId != request.auth.uid'));

  // Storage rule for job post problem photos
  assert.ok(storageRulesContent.includes('match /jobPosts/{jobId}/{userId}/{fileName}'));
});

test('Phase 2 Security & Indexes: 12 categories, /services catalog, strictly private /providerDocuments KYC (Firestore + Storage), /favorites, and firestore.indexes.json', () => {
  // 12 categories validated in Firestore rules
  for (const cat of ['Menuiserie', 'Serrurerie', 'Électroménager', 'Jardinage', 'Déménagement', 'Maçonnerie']) {
    assert.ok(rulesContent.includes(`cat == '${cat}'`), `Missing category ${cat} in firestore.rules`);
  }

  // Services catalog rules
  assert.ok(rulesContent.includes('function isValidProviderService(data)'));
  assert.ok(rulesContent.includes('match /services/{serviceId}'));

  // Strictly private KYC documents in Firestore & Storage (owner cannot self-approve, no public read)
  assert.ok(rulesContent.includes('function isValidProviderKycDocument(data)'));
  assert.ok(rulesContent.includes('match /providerDocuments/{uid}'));
  assert.ok(rulesContent.includes("incoming().status == 'submitted'"));
  assert.ok(storageRulesContent.includes('match /providerDocuments/{uid}/{docType}/{fileName}'));
  assert.ok(storageRulesContent.includes('function isValidKycDocumentUpload()'));

  // Customer favorites owner isolation
  assert.ok(rulesContent.includes('match /favorites/{favoriteId}'));
  assert.ok(rulesContent.includes("favoriteId == request.auth.uid + '_' + incoming().providerId"));

  // Law 09-08 consent timestamp whitelisted on user profiles
  assert.ok(rulesContent.includes("'termsAcceptedAt'"));

  // Composite indexes file exists and parses cleanly
  const indexesRaw = fs.readFileSync(path.resolve(import.meta.dirname, 'firestore.indexes.json'), 'utf8');
  const parsed = JSON.parse(indexesRaw) as { indexes: Array<{ collectionGroup: string }> };
  const groups = new Set(parsed.indexes.map((i) => i.collectionGroup));
  for (const col of ['bookings', 'jobPosts', 'services', 'reviews', 'favorites', 'withdrawals', 'providerDocuments']) {
    assert.ok(groups.has(col), `Missing composite index for ${col} in firestore.indexes.json`);
  }
});

test('Phase 3 Quotations & Scheduling Rules: itemized proposal totals invariant, /providerAvailability, and /scheduleLocks', () => {
  assert.ok(rulesContent.includes("'laborCostMad'"));
  assert.ok(rulesContent.includes("'materialsCostMad'"));
  assert.ok(rulesContent.includes('data.laborCostMad + data.materialsCostMad == data.proposedPriceMad'));
  assert.ok(rulesContent.includes("'validUntilIso'"));
  assert.ok(rulesContent.includes('function isValidProviderAvailability(data)'));
  assert.ok(rulesContent.includes('match /providerAvailability/{uid}'));
  assert.ok(rulesContent.includes('function isValidScheduleLock(data)'));
  assert.ok(rulesContent.includes('match /scheduleLocks/{lockId}'));
  assert.ok(rulesContent.includes('existsAfter(/databases/$(database)/documents/bookings/$(incoming().bookingId))'));
});


