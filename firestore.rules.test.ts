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
  assert.ok(rulesContent.includes("incoming().paymentMethod == 'cash_on_completion'"));
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

  // Dynamic fee lookup + strict COD booking invariants + atomic completedJobs increment
  assert.ok(rulesContent.includes('function getConfiguredPlatformFeePct()'));
  assert.ok(rulesContent.includes('incoming().providerId != request.auth.uid'));
  assert.ok(rulesContent.includes("incoming().paymentStatus == 'unpaid_cod'"));
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

test('Phase 4 Messaging & Notifications Security Rules and Composite Indexes', () => {
  assert.ok(rulesContent.includes('function isValidConversationMetadata(data)'));
  assert.ok(rulesContent.includes('match /conversations/{bookingId}'));
  assert.ok(rulesContent.includes('function isValidChatReport(data)'));
  assert.ok(rulesContent.includes('match /chatReports/{reportId}'));
  assert.ok(rulesContent.includes('function isValidNotification(data)'));
  assert.ok(rulesContent.includes('match /notifications/{notificationId}'));
  assert.ok(rulesContent.includes('incoming().isRead == false'));
  assert.ok(rulesContent.includes("incoming().diff(existing()).affectedKeys().hasOnly(['isRead'])"));
  assert.ok(rulesContent.includes('function isValidNotificationPreferences(data)'));
  assert.ok(rulesContent.includes('match /notificationPreferences/{uid}'));

  const indexesRaw = fs.readFileSync(path.resolve(import.meta.dirname, 'firestore.indexes.json'), 'utf8');
  const parsed = JSON.parse(indexesRaw) as { indexes: Array<{ collectionGroup: string }> };
  const groups = new Set(parsed.indexes.map((i) => i.collectionGroup));
  assert.ok(groups.has('notifications'), 'Missing composite index for notifications');
  assert.ok(groups.has('conversations'), 'Missing composite index for conversations');
});

test('Phase 5 Trust, Disputes, Review Photos/Reports & Immutable Payments Ledger Rules', () => {
  assert.ok(rulesContent.includes("'photoUrls'"));
  assert.ok(rulesContent.includes('function isValidDispute(data)'));
  assert.ok(rulesContent.includes('match /disputes/{disputeId}'));
  assert.ok(rulesContent.includes('function isValidReviewReport(data)'));
  assert.ok(rulesContent.includes('match /reviewReports/{reportId}'));
  assert.ok(rulesContent.includes('function isValidPaymentRecord(data)'));
  assert.ok(rulesContent.includes('match /payments/{paymentId}'));
  assert.ok(rulesContent.includes('match /refunds/{refundId}'));

  // Storage rules for verified review photos and private dispute evidence
  assert.ok(storageRulesContent.includes('match /reviews/{bookingId}/{userId}/{fileName}'));
  assert.ok(storageRulesContent.includes('match /disputes/{disputeId}/{userId}/{fileName}'));

  const indexesRaw = fs.readFileSync(path.resolve(import.meta.dirname, 'firestore.indexes.json'), 'utf8');
  const parsed = JSON.parse(indexesRaw) as { indexes: Array<{ collectionGroup: string }> };
  const groups = new Set(parsed.indexes.map((i) => i.collectionGroup));
  assert.ok(groups.has('disputes'), 'Missing composite index for disputes');
  assert.ok(groups.has('payments'), 'Missing composite index for payments');
});

test('Phase 6 Complete Admin Portal Rules: CNDP document_viewed audit logs, KYC review, dispute resolution, moderation, and admin-only accountStatus suspension', () => {
  // accountStatus is validated on UserProfile but excluded from self-edit affectedKeys
  assert.ok(rulesContent.includes("'accountStatus'"));
  assert.ok(rulesContent.includes("data.accountStatus == 'suspended'"));

  // Law 09-08 / CNDP mandatory audit log action types & collections
  for (const action of ['document_viewed', 'kyc_reviewed', 'dispute_resolved', 'report_moderated', 'user_suspended']) {
    assert.ok(rulesContent.includes(`data.actionType == '${action}'`), `Missing adminLog actionType ${action}`);
  }
  for (const col of ['providerDocuments', 'disputes', 'reviewReports', 'chatReports']) {
    assert.ok(rulesContent.includes(`data.targetCollection == '${col}'`), `Missing adminLog targetCollection ${col}`);
  }
});

test('Wave 0 Live Firebase Firestore Emulator Execution: AUD-001, AUD-002, AUD-003, AUD-004, AUD-005', async (t) => {
  const { spawn } = await import('node:child_process');
  const http = await import('node:http');
  const os = await import('node:os');

  const jarPath = path.join(
    os.homedir(),
    '.cache',
    'firebase',
    'emulators',
    'cloud-firestore-emulator-v1.19.8.jar'
  );
  if (!fs.existsSync(jarPath)) {
    t.skip('Firestore Emulator JAR not cached locally; skipping live emulator execution');
    return;
  }

  const port = 8091;
  const projectId = 'serviceproviders-test';
  const dbBase = `/v1/projects/${projectId}/databases/(default)/documents`;

  const proc = spawn('java', [
    '-jar',
    jarPath,
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--rules',
    path.resolve(process.cwd(), 'firestore.rules'),
  ]);

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('Timed out waiting for Firestore Emulator startup'));
    }, 10000);
    const onOut = (chunk: Buffer) => {
      if (chunk.toString().includes('Dev App Server is now running')) {
        clearTimeout(timer);
        resolve();
      }
    };
    proc.stdout.on('data', onOut);
    proc.stderr.on('data', onOut);
    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  t.after(() => {
    proc.kill();
  });

  function makeJwt(claims: {
    uid: string;
    email?: string;
    email_verified?: boolean;
    admin?: boolean;
  }): string {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        sub: claims.uid,
        user_id: claims.uid,
        aud: projectId,
        iss: `https://securetoken.google.com/${projectId}`,
        email: claims.email ?? `${claims.uid}@test.ma`,
        email_verified: claims.email_verified ?? true,
        ...(claims.admin !== undefined ? { admin: claims.admin } : {}),
      })
    ).toString('base64url');
    return `${header}.${payload}.`;
  }

  function toFirestoreValue(val: unknown): Record<string, unknown> {
    if (typeof val === 'string') return { stringValue: val };
    if (typeof val === 'boolean') return { booleanValue: val };
    if (typeof val === 'number') {
      return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
    }
    if (Array.isArray(val)) {
      return { arrayValue: { values: val.map((item) => toFirestoreValue(item)) } };
    }
    if (val && typeof val === 'object') {
      const fields: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(val)) {
        fields[k] = toFirestoreValue(v);
      }
      return { mapValue: { fields } };
    }
    return { nullValue: null };
  }

  function buildDocFields(data: Record<string, unknown>): Record<string, unknown> {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      fields[k] = toFirestoreValue(v);
    }
    return fields;
  }

  type BatchWriteOp =
    | {
        type?: 'update';
        docPath: string;
        data: Record<string, unknown>;
        requestTimeFields?: string[];
        rawTimestampFields?: Record<string, string>;
        currentDocumentExists?: boolean;
      }
    | {
        type: 'delete';
        docPath: string;
        currentDocumentExists?: boolean;
      };

  async function commitBatch(params: {
    token: string;
    ops: BatchWriteOp[];
  }): Promise<{ status: number; body: string }> {
    const writes: unknown[] = params.ops.map((op) => {
      if (op.type === 'delete') {
        return {
          delete: `projects/${projectId}/databases/(default)/documents/${op.docPath}`,
          ...(op.currentDocumentExists !== undefined
            ? { currentDocument: { exists: op.currentDocumentExists } }
            : {}),
        };
      }
      const fields = buildDocFields(op.data);
      if (op.rawTimestampFields) {
        for (const [k, iso] of Object.entries(op.rawTimestampFields)) {
          fields[k] = { timestampValue: iso };
        }
      }
      return {
        update: {
          name: `projects/${projectId}/databases/(default)/documents/${op.docPath}`,
          fields,
        },
        ...(op.requestTimeFields && op.requestTimeFields.length > 0
          ? {
              updateTransforms: op.requestTimeFields.map((fp) => ({
                fieldPath: fp,
                setToServerValue: 'REQUEST_TIME',
              })),
            }
          : {}),
        ...(op.currentDocumentExists !== undefined
          ? { currentDocument: { exists: op.currentDocumentExists } }
          : {}),
      };
    });

    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: `${dbBase}:commit`,
          method: 'POST',
          headers: {
            Authorization: `Bearer ${params.token}`,
            'Content-Type': 'application/json',
          },
        },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => resolve({ status: res.statusCode ?? 500, body }));
        }
      );
      req.on('error', reject);
      req.write(JSON.stringify({ writes }));
      req.end();
    });
  }

  async function commitWrite(params: {
    token: string;
    docPath: string;
    data: Record<string, unknown>;
    requestTimeFields?: string[];
    rawTimestampFields?: Record<string, string>;
    currentDocumentExists?: boolean;
  }): Promise<{ status: number; body: string }> {
    return commitBatch({
      token: params.token,
      ops: [{ type: 'update', ...params }],
    });
  }

  async function getDocument(params: {
    token: string;
    docPath: string;
  }): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: `${dbBase}/${params.docPath}`,
          method: 'GET',
          headers: {
            Authorization: `Bearer ${params.token}`,
          },
        },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => resolve({ status: res.statusCode ?? 500, body }));
        }
      );
      req.on('error', reject);
      req.end();
    });
  }

  const fixedCreatedIso = '2026-11-20T10:00:00Z';
  const clientToken = makeJwt({ uid: 'client1' });
  const providerToken = makeJwt({ uid: 'prov1' });
  const provider2Token = makeJwt({ uid: 'prov2' });
  const suspendedToken = makeJwt({ uid: 'susp1' });
  const adminToken = makeJwt({ uid: 'admin1', admin: true });

  // Seed initial users and provider with owner token
  const seedClient = await commitWrite({
    token: 'owner',
    docPath: 'users/client1',
    data: {
      uid: 'client1',
      role: 'client',
      fullName: 'Salma Bennani',
      phone: '+212661234567',
      city: 'Casablanca',
      neighborhood: 'Maârif',
      languagePref: 'fr',
      verifiedBadge: false,
      accountStatus: 'active',
    },
    rawTimestampFields: {
      createdAt: fixedCreatedIso,
      termsAcceptedAt: fixedCreatedIso,
    },
  });
  assert.equal(seedClient.status, 200, `Seed client failed: ${seedClient.body}`);

  const seedSuspended = await commitWrite({
    token: 'owner',
    docPath: 'users/susp1',
    data: {
      uid: 'susp1',
      role: 'client',
      fullName: 'Suspended User',
      phone: '+212661234568',
      city: 'Casablanca',
      neighborhood: 'Anfa',
      languagePref: 'fr',
      verifiedBadge: false,
      accountStatus: 'suspended',
    },
    rawTimestampFields: { createdAt: fixedCreatedIso },
  });
  assert.equal(seedSuspended.status, 200);

  const seedProviderUser = await commitWrite({
    token: 'owner',
    docPath: 'users/prov1',
    data: {
      uid: 'prov1',
      role: 'provider',
      fullName: 'Maâlem Karim',
      phone: '+212661987654',
      city: 'Casablanca',
      neighborhood: 'Maârif',
      languagePref: 'fr',
      verifiedBadge: true,
      accountStatus: 'active',
    },
    rawTimestampFields: { createdAt: fixedCreatedIso },
  });
  assert.equal(seedProviderUser.status, 200);

  const seedProvider = await commitWrite({
    token: 'owner',
    docPath: 'providers/prov1',
    data: {
      uid: 'prov1',
      fullNameFr: 'Maâlem Karim',
      fullNameAr: 'المعلم كريم',
      category: 'Plomberie',
      bioFr: 'Plombier professionnel certifié à Casablanca Maârif.',
      bioAr: 'سباك محترف ومعتمد في الدار البيضاء المعاريف.',
      hourlyRateMAD: 150,
      fixedVisitFeeMAD: 70,
      experienceYears: 8,
      skills: ['Plomberie'],
      portfolioImages: ['/src/assets/images/service_plumbing_repair_1794980477189.jpg'],
      ratingAvg: 5,
      reviewCount: 0,
      isAvailableNow: true,
      verifiedBadge: true,
      phone: '+212661987654',
      location: { lat: 33.5883, lng: -7.6325, city: 'Casablanca', quartier: 'Maârif' },
    },
    rawTimestampFields: { createdAt: fixedCreatedIso, updatedAt: fixedCreatedIso },
  });
  assert.equal(seedProvider.status, 200);

  // --- AUD-001 (All 7 Conditions): Complete Live Emulator Withdrawal Lifecycle ---
  // Condition 5 & 6: COD provider (prov1, withdrawableBalanceMad unset/0) rejected when attempting payout
  const unauthorizedCodWithdrawal = await commitBatch({
    token: providerToken,
    ops: [
      {
        docPath: 'withdrawals/wd_prov1_cod',
        data: {
          providerId: 'prov1',
          providerName: 'Maâlem Karim',
          city: 'Casablanca',
          bankName: 'Attijariwafa Bank',
          ribMasked: '•••• 123456',
          amountMad: 500,
          status: 'pending',
        },
        requestTimeFields: ['createdAt', 'updatedAt'],
        currentDocumentExists: false,
      },
      {
        docPath: 'withdrawalLocks/prov1',
        data: {
          providerId: 'prov1',
          activeWithdrawalId: 'wd_prov1_cod',
        },
        requestTimeFields: ['updatedAt'],
        currentDocumentExists: false,
      },
    ],
  });
  assert.equal(
    unauthorizedCodWithdrawal.status,
    403,
    'AUD-001 (Cond 5 & 6): COD provider without platform-held withdrawableBalanceMad must be rejected'
  );

  // Condition 4: Provider cannot self-modify withdrawableBalanceMad on /providers/{uid}
  const selfInflateBalanceAttempt = await commitWrite({
    token: providerToken,
    docPath: 'providers/prov1',
    data: {
      uid: 'prov1',
      fullNameFr: 'Maâlem Karim',
      fullNameAr: 'المعلم كريم',
      category: 'Plomberie',
      bioFr: 'Plombier professionnel certifié à Casablanca Maârif.',
      bioAr: 'سباك محترف ومعتمد في الدار البيضاء المعاريف.',
      hourlyRateMAD: 150,
      fixedVisitFeeMAD: 70,
      experienceYears: 8,
      skills: ['Plomberie'],
      portfolioImages: ['/src/assets/images/service_plumbing_repair_1794980477189.jpg'],
      ratingAvg: 5,
      reviewCount: 0,
      isAvailableNow: true,
      verifiedBadge: true,
      phone: '+212661987654',
      withdrawableBalanceMad: 5000,
      location: { lat: 33.5883, lng: -7.6325, city: 'Casablanca', quartier: 'Maârif' },
    },
    rawTimestampFields: { createdAt: fixedCreatedIso },
    requestTimeFields: ['updatedAt'],
    currentDocumentExists: true,
  });
  assert.equal(
    selfInflateBalanceAttempt.status,
    403,
    'AUD-001 (Cond 4): Provider must not be able to modify their own withdrawableBalanceMad'
  );

  // Seed systemSettings/global (minWithdrawalMad: 250) and prov2 with server-assigned withdrawableBalanceMad: 900
  const seedSettings = await commitWrite({
    token: 'owner',
    docPath: 'systemSettings/global',
    data: {
      platformFeePct: 10,
      minWithdrawalMad: 250,
      autoRefundOnProviderCancel: true,
      requireKycForEscrowPayout: true,
      supportWhatsAppPhone: '+212661234567',
      updatedByEmail: 'admin1@test.ma',
    },
    rawTimestampFields: { updatedAt: fixedCreatedIso },
  });
  assert.equal(seedSettings.status, 200);

  await commitWrite({
    token: 'owner',
    docPath: 'users/prov2',
    data: {
      uid: 'prov2',
      role: 'provider',
      fullName: 'Maâlem Youssef',
      phone: '+212661112233',
      city: 'Rabat',
      neighborhood: 'Agdal',
      languagePref: 'fr',
      verifiedBadge: true,
      accountStatus: 'active',
    },
    rawTimestampFields: { createdAt: fixedCreatedIso },
  });
  await commitWrite({
    token: 'owner',
    docPath: 'providers/prov2',
    data: {
      uid: 'prov2',
      fullNameFr: 'Maâlem Youssef',
      fullNameAr: 'المعلم يوسف',
      category: 'Électricité',
      bioFr: 'Électricien bâtiment certifié à Rabat Agdal.',
      bioAr: 'كهربائي معتمد في الرباط أكدال.',
      hourlyRateMAD: 160,
      fixedVisitFeeMAD: 80,
      experienceYears: 10,
      skills: ['Électricité'],
      portfolioImages: ['/src/assets/images/service_plumbing_repair_1794980477189.jpg'],
      ratingAvg: 5,
      reviewCount: 0,
      isAvailableNow: true,
      verifiedBadge: true,
      phone: '+212661112233',
      withdrawableBalanceMad: 900,
      location: { lat: 34.0209, lng: -6.8416, city: 'Rabat', quartier: 'Agdal' },
    },
    rawTimestampFields: { createdAt: fixedCreatedIso, updatedAt: fixedCreatedIso },
  });

  // Condition 7a: Below minWithdrawalMad (150 < 250) rejected by Firestore rules
  const belowMinWithdrawal = await commitBatch({
    token: provider2Token,
    ops: [
      {
        docPath: 'withdrawals/wd_prov2_low',
        data: {
          providerId: 'prov2',
          providerName: 'Maâlem Youssef',
          city: 'Rabat',
          bankName: 'CIH Bank',
          ribMasked: '•••• 654321',
          amountMad: 150,
          status: 'pending',
        },
        requestTimeFields: ['createdAt', 'updatedAt'],
        currentDocumentExists: false,
      },
      {
        docPath: 'withdrawalLocks/prov2',
        data: {
          providerId: 'prov2',
          activeWithdrawalId: 'wd_prov2_low',
        },
        requestTimeFields: ['updatedAt'],
        currentDocumentExists: false,
      },
    ],
  });
  assert.equal(
    belowMinWithdrawal.status,
    403,
    'AUD-001 (Cond 7a): Withdrawal below systemSettings.minWithdrawalMad (250) must be rejected'
  );

  // Condition 7b: Above withdrawableBalanceMad (1200 > 900) rejected by Firestore rules
  const aboveBalanceWithdrawal = await commitBatch({
    token: provider2Token,
    ops: [
      {
        docPath: 'withdrawals/wd_prov2_high',
        data: {
          providerId: 'prov2',
          providerName: 'Maâlem Youssef',
          city: 'Rabat',
          bankName: 'CIH Bank',
          ribMasked: '•••• 654321',
          amountMad: 1200,
          status: 'pending',
        },
        requestTimeFields: ['createdAt', 'updatedAt'],
        currentDocumentExists: false,
      },
      {
        docPath: 'withdrawalLocks/prov2',
        data: {
          providerId: 'prov2',
          activeWithdrawalId: 'wd_prov2_high',
        },
        requestTimeFields: ['updatedAt'],
        currentDocumentExists: false,
      },
    ],
  });
  assert.equal(
    aboveBalanceWithdrawal.status,
    403,
    'AUD-001 (Cond 7b): Withdrawal exceeding provider withdrawableBalanceMad (900) must be rejected'
  );

  // Condition 1: First valid pending withdrawal (wd_prov2_1 for 300 MAD) succeeds, and a second pending withdrawal while wd_prov2_1 is pending is rejected
  const firstWithdrawal = await commitBatch({
    token: provider2Token,
    ops: [
      {
        docPath: 'withdrawals/wd_prov2_1',
        data: {
          providerId: 'prov2',
          providerName: 'Maâlem Youssef',
          city: 'Rabat',
          bankName: 'CIH Bank',
          ribMasked: '•••• 654321',
          amountMad: 300,
          status: 'pending',
        },
        requestTimeFields: ['createdAt', 'updatedAt'],
        currentDocumentExists: false,
      },
      {
        docPath: 'withdrawalLocks/prov2',
        data: {
          providerId: 'prov2',
          activeWithdrawalId: 'wd_prov2_1',
        },
        requestTimeFields: ['updatedAt'],
        currentDocumentExists: false,
      },
    ],
  });
  assert.equal(
    firstWithdrawal.status,
    200,
    `AUD-001 (Cond 1): First valid withdrawal request must succeed: ${firstWithdrawal.body}`
  );
  const wd1CreatedIso =
    JSON.parse(firstWithdrawal.body).writeResults?.[0]?.transformResults?.[0]?.timestampValue ??
    fixedCreatedIso;

  const duplicatePendingWithdrawal = await commitBatch({
    token: provider2Token,
    ops: [
      {
        docPath: 'withdrawals/wd_prov2_dup',
        data: {
          providerId: 'prov2',
          providerName: 'Maâlem Youssef',
          city: 'Rabat',
          bankName: 'CIH Bank',
          ribMasked: '•••• 654321',
          amountMad: 300,
          status: 'pending',
        },
        requestTimeFields: ['createdAt', 'updatedAt'],
        currentDocumentExists: false,
      },
      {
        docPath: 'withdrawalLocks/prov2',
        data: {
          providerId: 'prov2',
          activeWithdrawalId: 'wd_prov2_dup',
        },
        requestTimeFields: ['updatedAt'],
        currentDocumentExists: true,
      },
    ],
  });
  assert.equal(
    duplicatePendingWithdrawal.status,
    403,
    'AUD-001 (Cond 1): Second withdrawal while wd_prov2_1 is still pending must be rejected'
  );

  // Condition 2a: Admin rejects wd_prov2_1 -> Provider can submit a new request wd_prov2_2
  const adminRejectWd1 = await commitWrite({
    token: adminToken,
    docPath: 'withdrawals/wd_prov2_1',
    data: {
      providerId: 'prov2',
      providerName: 'Maâlem Youssef',
      city: 'Rabat',
      bankName: 'CIH Bank',
      ribMasked: '•••• 654321',
      amountMad: 300,
      status: 'rejected',
      adminNote: 'RIB incomplet',
    },
    rawTimestampFields: { createdAt: wd1CreatedIso },
    requestTimeFields: ['updatedAt'],
    currentDocumentExists: true,
  });
  assert.equal(adminRejectWd1.status, 200);

  const secondWithdrawalAfterReject = await commitBatch({
    token: provider2Token,
    ops: [
      {
        docPath: 'withdrawals/wd_prov2_2',
        data: {
          providerId: 'prov2',
          providerName: 'Maâlem Youssef',
          city: 'Rabat',
          bankName: 'CIH Bank',
          ribMasked: '•••• 998877',
          amountMad: 300,
          status: 'pending',
        },
        requestTimeFields: ['createdAt', 'updatedAt'],
        currentDocumentExists: false,
      },
      {
        docPath: 'withdrawalLocks/prov2',
        data: {
          providerId: 'prov2',
          activeWithdrawalId: 'wd_prov2_2',
        },
        requestTimeFields: ['updatedAt'],
        currentDocumentExists: true,
      },
    ],
  });
  assert.equal(
    secondWithdrawalAfterReject.status,
    200,
    `AUD-001 (Cond 2a): New withdrawal after rejection must succeed: ${secondWithdrawalAfterReject.body}`
  );
  const wd2CreatedIso =
    JSON.parse(secondWithdrawalAfterReject.body).writeResults?.[0]?.transformResults?.[0]?.timestampValue ??
    fixedCreatedIso;

  // Condition 2b: Admin approves wd_prov2_2 (and decrements balance 900 -> 600) -> Provider can submit wd_prov2_3
  const adminApproveWd2 = await commitWrite({
    token: adminToken,
    docPath: 'withdrawals/wd_prov2_2',
    data: {
      providerId: 'prov2',
      providerName: 'Maâlem Youssef',
      city: 'Rabat',
      bankName: 'CIH Bank',
      ribMasked: '•••• 998877',
      amountMad: 300,
      status: 'approved',
      adminNote: 'Virement validé',
    },
    rawTimestampFields: { createdAt: wd2CreatedIso },
    requestTimeFields: ['updatedAt'],
    currentDocumentExists: true,
  });
  assert.equal(adminApproveWd2.status, 200);

  const thirdWithdrawalAfterApprove = await commitBatch({
    token: provider2Token,
    ops: [
      {
        docPath: 'withdrawals/wd_prov2_3',
        data: {
          providerId: 'prov2',
          providerName: 'Maâlem Youssef',
          city: 'Rabat',
          bankName: 'CIH Bank',
          ribMasked: '•••• 998877',
          amountMad: 250,
          status: 'pending',
        },
        requestTimeFields: ['createdAt', 'updatedAt'],
        currentDocumentExists: false,
      },
      {
        docPath: 'withdrawalLocks/prov2',
        data: {
          providerId: 'prov2',
          activeWithdrawalId: 'wd_prov2_3',
        },
        requestTimeFields: ['updatedAt'],
        currentDocumentExists: true,
      },
    ],
  });
  assert.equal(
    thirdWithdrawalAfterApprove.status,
    200,
    `AUD-001 (Cond 2b): New withdrawal after approval must succeed: ${thirdWithdrawalAfterApprove.body}`
  );
  const wd3CreatedIso =
    JSON.parse(thirdWithdrawalAfterApprove.body).writeResults?.[0]?.transformResults?.[0]?.timestampValue ??
    fixedCreatedIso;

  // Condition 2c: Admin marks wd_prov2_3 completed -> Provider can submit wd_prov2_4
  const adminCompleteWd3 = await commitWrite({
    token: adminToken,
    docPath: 'withdrawals/wd_prov2_3',
    data: {
      providerId: 'prov2',
      providerName: 'Maâlem Youssef',
      city: 'Rabat',
      bankName: 'CIH Bank',
      ribMasked: '•••• 998877',
      amountMad: 250,
      status: 'completed',
      adminNote: 'Virement exécuté',
    },
    rawTimestampFields: { createdAt: wd3CreatedIso },
    requestTimeFields: ['updatedAt'],
    currentDocumentExists: true,
  });
  assert.equal(adminCompleteWd3.status, 200);

  const fourthWithdrawalAfterComplete = await commitBatch({
    token: provider2Token,
    ops: [
      {
        docPath: 'withdrawals/wd_prov2_4',
        data: {
          providerId: 'prov2',
          providerName: 'Maâlem Youssef',
          city: 'Rabat',
          bankName: 'CIH Bank',
          ribMasked: '•••• 998877',
          amountMad: 250,
          status: 'pending',
        },
        requestTimeFields: ['createdAt', 'updatedAt'],
        currentDocumentExists: false,
      },
      {
        docPath: 'withdrawalLocks/prov2',
        data: {
          providerId: 'prov2',
          activeWithdrawalId: 'wd_prov2_4',
        },
        requestTimeFields: ['updatedAt'],
        currentDocumentExists: true,
      },
    ],
  });
  assert.equal(
    fourthWithdrawalAfterComplete.status,
    200,
    `AUD-001 (Cond 2c): New withdrawal after completed status must succeed: ${fourthWithdrawalAfterComplete.body}`
  );

  // Condition 3: Complete history of all 4 withdrawal requests is preserved and deletion is forbidden
  for (const [id, expectedStatus] of [
    ['wd_prov2_1', 'rejected'],
    ['wd_prov2_2', 'approved'],
    ['wd_prov2_3', 'completed'],
    ['wd_prov2_4', 'pending'],
  ] as const) {
    const docRes = await getDocument({ token: provider2Token, docPath: `withdrawals/${id}` });
    assert.equal(docRes.status, 200, `AUD-001 (Cond 3): Historical withdrawal ${id} must exist`);
    assert.ok(
      docRes.body.includes(`"stringValue": "${expectedStatus}"`),
      `AUD-001 (Cond 3): Historical withdrawal ${id} must retain status ${expectedStatus}`
    );
  }

  const deleteHistoryAttempt = await commitBatch({
    token: adminToken,
    ops: [{ type: 'delete', docPath: 'withdrawals/wd_prov2_1' }],
  });
  assert.equal(
    deleteHistoryAttempt.status,
    403,
    'AUD-001 (Cond 3): Withdrawal history records must be immutable against deletion'
  );

  // --- AUD-002: Client cmi_escrow booking creation rejected; cash_on_completion allowed ---
  const baseBookingData = {
    bookingRef: 'MK-TEST01',
    clientId: 'client1',
    clientName: 'Salma Bennani',
    clientPhone: '+212661234567',
    providerId: 'prov1',
    providerName: 'Maâlem Karim',
    providerPhone: '+212661987654',
    category: 'Plomberie',
    serviceType: 'Réparation fuite',
    city: 'Casablanca',
    neighborhood: 'Maârif',
    addressPin: 'Maârif, Casablanca',
    description: 'Fuite importante sous évier de cuisine.',
    preferredDate: '2026-11-28',
    preferredTimeSlot: '09:00 - 12:00',
    estimatedMad: 350,
    status: 'pending',
  };

  const cmiBookingAttempt = await commitWrite({
    token: clientToken,
    docPath: 'bookings/bk_cmi_1',
    data: {
      ...baseBookingData,
      paymentMethod: 'cmi_escrow',
      paymentStatus: 'escrow_held',
    },
    requestTimeFields: ['createdAt', 'updatedAt'],
    currentDocumentExists: false,
  });
  assert.equal(
    cmiBookingAttempt.status,
    403,
    'AUD-002: Client attempt to create cmi_escrow booking must be rejected'
  );

  const codBookingAttempt = await commitWrite({
    token: clientToken,
    docPath: 'bookings/bk_cod_1',
    data: {
      ...baseBookingData,
      paymentMethod: 'cash_on_completion',
      paymentStatus: 'unpaid_cod',
    },
    requestTimeFields: ['createdAt', 'updatedAt'],
    currentDocumentExists: false,
  });
  assert.equal(
    codBookingAttempt.status,
    200,
    `AUD-002: Client cash_on_completion booking creation must succeed: ${codBookingAttempt.body}`
  );

  // --- AUD-003: Suspended account blocked from creating bookings or updating own profile ---
  const suspendedBookingAttempt = await commitWrite({
    token: suspendedToken,
    docPath: 'bookings/bk_susp_1',
    data: {
      ...baseBookingData,
      clientId: 'susp1',
      paymentMethod: 'cash_on_completion',
      paymentStatus: 'unpaid_cod',
    },
    requestTimeFields: ['createdAt', 'updatedAt'],
    currentDocumentExists: false,
  });
  assert.equal(
    suspendedBookingAttempt.status,
    403,
    'AUD-003: Suspended account must be blocked from creating bookings'
  );

  const suspendedSelfUnsuspend = await commitWrite({
    token: suspendedToken,
    docPath: 'users/susp1',
    data: {
      uid: 'susp1',
      role: 'client',
      fullName: 'Suspended User',
      phone: '+212661234568',
      city: 'Casablanca',
      neighborhood: 'Anfa',
      languagePref: 'fr',
      verifiedBadge: false,
      accountStatus: 'active',
    },
    rawTimestampFields: { createdAt: fixedCreatedIso },
    requestTimeFields: ['updatedAt'],
    currentDocumentExists: true,
  });
  assert.equal(
    suspendedSelfUnsuspend.status,
    403,
    'AUD-003: Suspended account must not be able to update or unsuspend itself'
  );

  // --- AUD-004: Active user with accountStatus & termsAcceptedAt can update profile; provider without prior completedJobs can update card ---
  const activeProfileSave = await commitWrite({
    token: clientToken,
    docPath: 'users/client1',
    data: {
      uid: 'client1',
      role: 'client',
      fullName: 'Salma Bennani Updated',
      phone: '+212661234567',
      city: 'Casablanca',
      neighborhood: 'Bourgogne',
      languagePref: 'fr',
      verifiedBadge: false,
      accountStatus: 'active',
    },
    rawTimestampFields: {
      createdAt: fixedCreatedIso,
      termsAcceptedAt: fixedCreatedIso,
    },
    requestTimeFields: ['updatedAt'],
    currentDocumentExists: true,
  });
  assert.equal(
    activeProfileSave.status,
    200,
    `AUD-004: Active user preserving accountStatus & termsAcceptedAt must save cleanly: ${activeProfileSave.body}`
  );

  const providerCardSaveWithZeroCompleted = await commitWrite({
    token: providerToken,
    docPath: 'providers/prov1',
    data: {
      uid: 'prov1',
      fullNameFr: 'Maâlem Karim Pro',
      fullNameAr: 'المعلم كريم',
      category: 'Plomberie',
      bioFr: 'Plombier professionnel certifié à Casablanca Maârif.',
      bioAr: 'سباك محترف ومعتمد في الدار البيضاء المعاريف.',
      hourlyRateMAD: 180,
      fixedVisitFeeMAD: 70,
      experienceYears: 9,
      skills: ['Plomberie', 'Chauffe-eau'],
      portfolioImages: ['/src/assets/images/service_plumbing_repair_1794980477189.jpg'],
      ratingAvg: 5,
      reviewCount: 0,
      isAvailableNow: true,
      verifiedBadge: true,
      phone: '+212661987654',
      completedJobs: 0,
      location: { lat: 33.5883, lng: -7.6325, city: 'Casablanca', quartier: 'Maârif' },
    },
    rawTimestampFields: { createdAt: fixedCreatedIso },
    requestTimeFields: ['updatedAt'],
    currentDocumentExists: true,
  });
  assert.equal(
    providerCardSaveWithZeroCompleted.status,
    200,
    `AUD-004: Provider saving card with completedJobs == 0 must succeed: ${providerCardSaveWithZeroCompleted.body}`
  );

  // --- AUD-005: Non-admin blocked from spoofing kyc_updated / system notifications; workflow notifications allowed ---
  const spoofedKycNotif = await commitWrite({
    token: clientToken,
    docPath: 'notifications/notif_spoof_1',
    data: {
      userId: 'prov1',
      actorId: 'client1',
      type: 'kyc_updated',
      titleFr: 'Fake KYC',
      titleAr: 'توثيق مزيف',
      bodyFr: 'Fake body',
      bodyAr: 'نص مزيف',
      linkPath: '/provider/dashboard',
      isRead: false,
    },
    requestTimeFields: ['createdAt'],
    currentDocumentExists: false,
  });
  assert.equal(
    spoofedKycNotif.status,
    403,
    'AUD-005: Non-admin user must be rejected when creating kyc_updated notification'
  );

  const legitimateWorkflowNotif = await commitWrite({
    token: clientToken,
    docPath: 'notifications/notif_legit_1',
    data: {
      userId: 'prov1',
      actorId: 'client1',
      type: 'booking_created',
      titleFr: 'Nouvelle demande',
      titleAr: 'طلب حجز جديد',
      bodyFr: 'Salma demande une intervention.',
      bodyAr: 'طلبت سلمى تدخلاً.',
      linkPath: '/provider/missions',
      isRead: false,
    },
    requestTimeFields: ['createdAt'],
    currentDocumentExists: false,
  });
  assert.equal(
    legitimateWorkflowNotif.status,
    200,
    `AUD-005: Legitimate booking_created notification must succeed: ${legitimateWorkflowNotif.body}`
  );

  const adminKycNotif = await commitWrite({
    token: adminToken,
    docPath: 'notifications/notif_admin_1',
    data: {
      userId: 'prov1',
      actorId: 'admin1',
      type: 'kyc_updated',
      titleFr: 'Identité CIN vérifiée !',
      titleAr: 'تم التحقق من بطاقتك الوطنية!',
      bodyFr: 'Votre dossier CIN a été validé.',
      bodyAr: 'تمت المصادقة على ملف البطاقة الوطنية.',
      linkPath: '/provider/dashboard',
      isRead: false,
    },
    requestTimeFields: ['createdAt'],
    currentDocumentExists: false,
  });
  assert.equal(
    adminKycNotif.status,
    200,
    `AUD-005: Admin creating kyc_updated notification must succeed: ${adminKycNotif.body}`
  );

  // --- AUD-006: Schedule lock creation and provider-initiated reschedule lock creation ---
  const createInitialScheduleLock = await commitWrite({
    token: clientToken,
    docPath: 'scheduleLocks/prov1_2026-11-28_09001200',
    data: {
      providerId: 'prov1',
      clientId: 'client1',
      bookingId: 'bk_cod_1',
      preferredDate: '2026-11-28',
      preferredTimeSlot: '09:00 - 12:00',
    },
    requestTimeFields: ['createdAt'],
    currentDocumentExists: false,
  });
  assert.equal(
    createInitialScheduleLock.status,
    200,
    `AUD-006: Client creating scheduleLock matching booking must succeed: ${createInitialScheduleLock.body}`
  );

  // Provider reschedules bk_cod_1 to 2026-11-29 (14:00 - 17:00) and acquires new scheduleLock
  const codBookingCreatedIso =
    JSON.parse(codBookingAttempt.body).writeResults?.[0]?.transformResults?.[0]?.timestampValue ??
    fixedCreatedIso;
  const providerRescheduleBooking = await commitWrite({
    token: providerToken,
    docPath: 'bookings/bk_cod_1',
    data: {
      ...baseBookingData,
      paymentMethod: 'cash_on_completion',
      paymentStatus: 'unpaid_cod',
      preferredDate: '2026-11-29',
      preferredTimeSlot: '14:00 - 17:00',
      rescheduleNote: 'Reporté au lendemain après-midi',
    },
    rawTimestampFields: { createdAt: codBookingCreatedIso },
    requestTimeFields: ['updatedAt'],
    currentDocumentExists: true,
  });
  assert.equal(
    providerRescheduleBooking.status,
    200,
    `AUD-006: Provider rescheduling booking must succeed: ${providerRescheduleBooking.body}`
  );

  const providerCreateNewLock = await commitWrite({
    token: providerToken,
    docPath: 'scheduleLocks/prov1_2026-11-29_14001700',
    data: {
      providerId: 'prov1',
      clientId: 'client1',
      bookingId: 'bk_cod_1',
      preferredDate: '2026-11-29',
      preferredTimeSlot: '14:00 - 17:00',
    },
    requestTimeFields: ['createdAt'],
    currentDocumentExists: false,
  });
  assert.equal(
    providerCreateNewLock.status,
    200,
    `AUD-006: Provider creating new scheduleLock on reschedule must succeed: ${providerCreateNewLock.body}`
  );

  // --- AUD-007: Provider can withdraw and revise/resubmit proposal while job is open ---
  const seedJobPost = await commitWrite({
    token: 'owner',
    docPath: 'jobPosts/job_open_1',
    data: {
      jobRef: 'JOB-101',
      clientId: 'client1',
      clientName: 'Salma Bennani',
      clientPhone: '+212661234567',
      category: 'Plomberie',
      title: 'Installation chauffe-eau',
      description: 'Installation complète chauffe-eau électrique 50L.',
      city: 'Casablanca',
      neighborhood: 'Maârif',
      preferredDate: '2026-11-30',
      preferredTimeSlot: '09:00 - 12:00',
      urgency: 'normal',
      budgetMinMad: 250,
      budgetMaxMad: 500,
      status: 'open',
      proposalCount: 1,
    },
    rawTimestampFields: { createdAt: fixedCreatedIso, updatedAt: fixedCreatedIso },
  });
  assert.equal(seedJobPost.status, 200);

  const baseProposalData = {
    jobId: 'job_open_1',
    clientId: 'client1',
    providerId: 'prov1',
    providerName: 'Maâlem Karim Pro',
    providerPhone: '+212661987654',
    providerCategory: 'Plomberie',
    providerCity: 'Casablanca',
    providerRating: 5,
    providerVerified: true,
    proposedPriceMad: 350,
    laborCostMad: 250,
    materialsCostMad: 100,
    validUntilIso: '2026-12-05',
    warrantyNote: 'Garantie 30 jours main-d’œuvre',
    estimatedDuration: '2h',
    message: 'Disponible avec outillage complet et joints neufs.',
    status: 'pending',
  };

  const createProposal = await commitWrite({
    token: providerToken,
    docPath: 'jobPosts/job_open_1/proposals/prov1',
    data: baseProposalData,
    requestTimeFields: ['createdAt', 'updatedAt'],
    currentDocumentExists: false,
  });
  assert.equal(
    createProposal.status,
    200,
    `AUD-007: Provider creating initial proposal must succeed: ${createProposal.body}`
  );
  const proposalCreatedIso =
    JSON.parse(createProposal.body).writeResults?.[0]?.transformResults?.[0]?.timestampValue ??
    fixedCreatedIso;

  // Provider withdraws proposal
  const withdrawProposal = await commitWrite({
    token: providerToken,
    docPath: 'jobPosts/job_open_1/proposals/prov1',
    data: {
      ...baseProposalData,
      status: 'withdrawn',
    },
    rawTimestampFields: { createdAt: proposalCreatedIso },
    requestTimeFields: ['updatedAt'],
    currentDocumentExists: true,
  });
  assert.equal(
    withdrawProposal.status,
    200,
    `AUD-007: Provider withdrawing proposal must succeed: ${withdrawProposal.body}`
  );

  // Provider revises price/breakdown and resubmits withdrawn proposal back to pending
  const reviseProposal = await commitWrite({
    token: providerToken,
    docPath: 'jobPosts/job_open_1/proposals/prov1',
    data: {
      ...baseProposalData,
      proposedPriceMad: 320,
      laborCostMad: 220,
      materialsCostMad: 100,
      message: 'Offre révisée avec remise fidélité.',
      status: 'pending',
    },
    rawTimestampFields: { createdAt: proposalCreatedIso },
    requestTimeFields: ['updatedAt'],
    currentDocumentExists: true,
  });
  assert.equal(
    reviseProposal.status,
    200,
    `AUD-007: Provider revising and resubmitting withdrawn proposal must succeed: ${reviseProposal.body}`
  );
});

