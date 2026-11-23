import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { resolveFirebaseConfig } from './src/firebase';

const rulesContent = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
const storageRulesContent = fs.readFileSync(path.resolve(process.cwd(), 'storage.rules'), 'utf8');
const envExampleContent = fs.readFileSync(path.resolve(process.cwd(), '.env.example'), 'utf8');

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

test('Firebase Env Config: resolveFirebaseConfig reads VITE_FIREBASE_* with fallbacks', () => {
  assert.ok(envExampleContent.includes('VITE_FIREBASE_API_KEY='));
  assert.ok(envExampleContent.includes('VITE_FIREBASE_AUTH_DOMAIN='));
  assert.ok(envExampleContent.includes('VITE_FIREBASE_PROJECT_ID="serviceproviders-530c4"'));

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
  assert.ok(
    fs.existsSync(jarPath),
    `Firestore Emulator JAR missing at ${jarPath}; live Firestore rules verification cannot be skipped`
  );

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

  // --- AUD-006: Live Emulator Concurrency, Reschedule, Cancellation & Provider Rejection ---
  const client2Token = makeJwt({ uid: 'client2' });
  await commitWrite({
    token: 'owner',
    docPath: 'users/client2',
    data: {
      uid: 'client2',
      role: 'client',
      fullName: 'Omar Tazi',
      phone: '+212661445566',
      city: 'Casablanca',
      neighborhood: 'Gauthier',
      languagePref: 'fr',
      verifiedBadge: false,
      accountStatus: 'active',
    },
    rawTimestampFields: { createdAt: fixedCreatedIso },
  });

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

  // Scenario 1: Two clients attempting the same provider slot concurrently (2026-11-28, 09:00 - 12:00)
  const concurrentSameSlotAttempt = await commitBatch({
    token: client2Token,
    ops: [
      {
        docPath: 'bookings/bk_client2_race',
        data: {
          ...baseBookingData,
          bookingRef: 'MK-RACE01',
          clientId: 'client2',
          clientName: 'Omar Tazi',
          clientPhone: '+212661445566',
          paymentMethod: 'cash_on_completion',
          paymentStatus: 'unpaid_cod',
        },
        requestTimeFields: ['createdAt', 'updatedAt'],
        currentDocumentExists: false,
      },
      {
        docPath: 'scheduleLocks/prov1_2026-11-28_09001200',
        data: {
          providerId: 'prov1',
          clientId: 'client2',
          bookingId: 'bk_client2_race',
          preferredDate: '2026-11-28',
          preferredTimeSlot: '09:00 - 12:00',
        },
        requestTimeFields: ['createdAt'],
        currentDocumentExists: false,
      },
    ],
  });
  assert.notEqual(
    concurrentSameSlotAttempt.status,
    200,
    'AUD-006 (Scenario 1): Second client attempting already-locked slot must fail atomic commit'
  );
  // Scenario 6 check: Failed transaction leaves no partial booking document
  const checkRolledBackRaceBooking = await getDocument({
    token: adminToken,
    docPath: 'bookings/bk_client2_race',
  });
  assert.equal(
    checkRolledBackRaceBooking.status,
    404,
    'AUD-006 (Scenario 6): Failed concurrent booking transaction must not persist partial booking'
  );

  // Client 2 books an open slot (2026-11-28, 14:00 - 17:00)
  const client2ValidBooking = await commitBatch({
    token: client2Token,
    ops: [
      {
        docPath: 'bookings/bk_client2_ok',
        data: {
          ...baseBookingData,
          bookingRef: 'MK-C2OK01',
          clientId: 'client2',
          clientName: 'Omar Tazi',
          clientPhone: '+212661445566',
          preferredDate: '2026-11-28',
          preferredTimeSlot: '14:00 - 17:00',
          paymentMethod: 'cash_on_completion',
          paymentStatus: 'unpaid_cod',
        },
        requestTimeFields: ['createdAt', 'updatedAt'],
        currentDocumentExists: false,
      },
      {
        docPath: 'scheduleLocks/prov1_2026-11-28_14001700',
        data: {
          providerId: 'prov1',
          clientId: 'client2',
          bookingId: 'bk_client2_ok',
          preferredDate: '2026-11-28',
          preferredTimeSlot: '14:00 - 17:00',
        },
        requestTimeFields: ['createdAt'],
        currentDocumentExists: false,
      },
    ],
  });
  assert.equal(client2ValidBooking.status, 200);
  const client2BookingCreatedIso =
    JSON.parse(client2ValidBooking.body).writeResults?.[0]?.transformResults?.[0]?.timestampValue ??
    fixedCreatedIso;

  // Scenario 2: Two simultaneous reschedules to the same new slot (2026-11-29, 14:00 - 17:00)
  // First reschedule (bk_cod_1 moves from 2026-11-28 09:00-12:00 -> 2026-11-29 14:00-17:00) succeeds atomically
  const codBookingCreatedIso =
    JSON.parse(codBookingAttempt.body).writeResults?.[0]?.transformResults?.[0]?.timestampValue ??
    fixedCreatedIso;
  const atomicReschedule1 = await commitBatch({
    token: providerToken,
    ops: [
      {
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
      },
      {
        type: 'delete',
        docPath: 'scheduleLocks/prov1_2026-11-28_09001200',
        currentDocumentExists: true,
      },
      {
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
      },
    ],
  });
  assert.equal(
    atomicReschedule1.status,
    200,
    `AUD-006 (Scenario 2a): First atomic reschedule must succeed: ${atomicReschedule1.body}`
  );

  // Second simultaneous reschedule (bk_client2_ok attempts to move to the same 2026-11-29 14:00-17:00 slot) fails atomically
  const conflictingReschedule2 = await commitBatch({
    token: client2Token,
    ops: [
      {
        docPath: 'bookings/bk_client2_ok',
        data: {
          ...baseBookingData,
          bookingRef: 'MK-C2OK01',
          clientId: 'client2',
          clientName: 'Omar Tazi',
          clientPhone: '+212661445566',
          preferredDate: '2026-11-29',
          preferredTimeSlot: '14:00 - 17:00',
          rescheduleNote: 'Conflit créneau',
          paymentMethod: 'cash_on_completion',
          paymentStatus: 'unpaid_cod',
        },
        rawTimestampFields: { createdAt: client2BookingCreatedIso },
        requestTimeFields: ['updatedAt'],
        currentDocumentExists: true,
      },
      {
        type: 'delete',
        docPath: 'scheduleLocks/prov1_2026-11-28_14001700',
        currentDocumentExists: true,
      },
      {
        docPath: 'scheduleLocks/prov1_2026-11-29_14001700',
        data: {
          providerId: 'prov1',
          clientId: 'client2',
          bookingId: 'bk_client2_ok',
          preferredDate: '2026-11-29',
          preferredTimeSlot: '14:00 - 17:00',
        },
        requestTimeFields: ['createdAt'],
        currentDocumentExists: false,
      },
    ],
  });
  assert.notEqual(
    conflictingReschedule2.status,
    200,
    'AUD-006 (Scenario 2b): Competing reschedule to the same new slot must fail'
  );
  // Scenario 6 check: bk_client2_ok original lock is still intact after failed reschedule
  const checkOriginalLockIntact = await getDocument({
    token: client2Token,
    docPath: 'scheduleLocks/prov1_2026-11-28_14001700',
  });
  assert.equal(
    checkOriginalLockIntact.status,
    200,
    'AUD-006 (Scenario 6): Original scheduleLock must remain intact when a reschedule transaction fails'
  );

  // Scenario 5: Cancellation after a previous reschedule (live booking read derives new lock prov1_2026-11-29_14001700 and deletes it)
  const liveRescheduledBookingDoc = await getDocument({
    token: clientToken,
    docPath: 'bookings/bk_cod_1',
  });
  assert.equal(liveRescheduledBookingDoc.status, 200);
  const parsedLiveBooking = JSON.parse(liveRescheduledBookingDoc.body);
  const liveDate = parsedLiveBooking.fields.preferredDate.stringValue;
  const liveSlot = parsedLiveBooking.fields.preferredTimeSlot.stringValue;
  assert.equal(liveDate, '2026-11-29');
  assert.equal(liveSlot, '14:00 - 17:00');
  const derivedLiveLockPath = `scheduleLocks/prov1_${liveDate}_${liveSlot.replace(/[^0-9]/g, '')}`;

  const cancelAfterReschedule = await commitBatch({
    token: clientToken,
    ops: [
      {
        docPath: 'bookings/bk_cod_1',
        data: {
          ...baseBookingData,
          paymentMethod: 'cash_on_completion',
          paymentStatus: 'unpaid_cod',
          preferredDate: liveDate,
          preferredTimeSlot: liveSlot,
          rescheduleNote: 'Reporté au lendemain après-midi',
          status: 'cancelled',
          cancelledBy: 'client',
          cancellationReason: 'Empêchement personnel après report',
          providerPayoutMad: 0,
          platformFeeMad: 0,
          refundedClientMad: 0,
        },
        rawTimestampFields: { createdAt: codBookingCreatedIso },
        requestTimeFields: ['updatedAt'],
        currentDocumentExists: true,
      },
      {
        type: 'delete',
        docPath: derivedLiveLockPath,
        currentDocumentExists: true,
      },
    ],
  });
  assert.equal(
    cancelAfterReschedule.status,
    200,
    `AUD-006 (Scenario 5): Cancellation after reschedule must succeed and delete current lock: ${cancelAfterReschedule.body}`
  );
  const verifyOldLockGone = await getDocument({
    token: clientToken,
    docPath: 'scheduleLocks/prov1_2026-11-28_09001200',
  });
  const verifyNewLockGone = await getDocument({
    token: clientToken,
    docPath: derivedLiveLockPath,
  });
  assert.equal(verifyOldLockGone.status, 404, 'Old lock must remain deleted');
  assert.equal(verifyNewLockGone.status, 404, 'Rescheduled lock must be deleted on cancellation');

  // Scenario 3: Cancellation racing with rescheduling (a reschedule arriving after cancellation is rejected with 403 and creates no lock)
  const rescheduleAfterCancelRace = await commitBatch({
    token: providerToken,
    ops: [
      {
        docPath: 'bookings/bk_cod_1',
        data: {
          ...baseBookingData,
          paymentMethod: 'cash_on_completion',
          paymentStatus: 'unpaid_cod',
          preferredDate: '2026-11-30',
          preferredTimeSlot: '09:00 - 12:00',
          rescheduleNote: 'Tentative tardive après annulation',
          status: 'cancelled',
          cancelledBy: 'client',
          cancellationReason: 'Empêchement personnel après report',
          providerPayoutMad: 0,
          platformFeeMad: 0,
          refundedClientMad: 0,
        },
        rawTimestampFields: { createdAt: codBookingCreatedIso },
        requestTimeFields: ['updatedAt'],
        currentDocumentExists: true,
      },
      {
        docPath: 'scheduleLocks/prov1_2026-11-30_09001200',
        data: {
          providerId: 'prov1',
          clientId: 'client1',
          bookingId: 'bk_cod_1',
          preferredDate: '2026-11-30',
          preferredTimeSlot: '09:00 - 12:00',
        },
        requestTimeFields: ['createdAt'],
        currentDocumentExists: false,
      },
    ],
  });
  assert.equal(
    rescheduleAfterCancelRace.status,
    403,
    'AUD-006 (Scenario 3): Reschedule racing after cancellation must be rejected by Firestore rules'
  );
  const verifyNoOrphanLockOnRace = await getDocument({
    token: providerToken,
    docPath: 'scheduleLocks/prov1_2026-11-30_09001200',
  });
  assert.equal(
    verifyNoOrphanLockOnRace.status,
    404,
    'AUD-006 (Scenario 3 & 6): Failed reschedule race must not leave an orphaned scheduleLock'
  );

  // Scenario 4: Provider rejection of a pending booking releases its scheduleLock so another client can book that slot
  const providerRejectBooking = await commitBatch({
    token: providerToken,
    ops: [
      {
        docPath: 'bookings/bk_client2_ok',
        data: {
          ...baseBookingData,
          bookingRef: 'MK-C2OK01',
          clientId: 'client2',
          clientName: 'Omar Tazi',
          clientPhone: '+212661445566',
          preferredDate: '2026-11-28',
          preferredTimeSlot: '14:00 - 17:00',
          paymentMethod: 'cash_on_completion',
          paymentStatus: 'unpaid_cod',
          status: 'cancelled',
          cancelledBy: 'provider',
          cancellationReason: 'Indisponibilité signalée par le Maâlem',
          providerPayoutMad: 0,
          platformFeeMad: 0,
          refundedClientMad: 0,
        },
        rawTimestampFields: { createdAt: client2BookingCreatedIso },
        requestTimeFields: ['updatedAt'],
        currentDocumentExists: true,
      },
      {
        type: 'delete',
        docPath: 'scheduleLocks/prov1_2026-11-28_14001700',
        currentDocumentExists: true,
      },
    ],
  });
  assert.equal(
    providerRejectBooking.status,
    200,
    `AUD-006 (Scenario 4a): Provider rejecting pending booking and releasing scheduleLock must succeed: ${providerRejectBooking.body}`
  );

  const rebookFreedSlotAfterProviderReject = await commitBatch({
    token: clientToken,
    ops: [
      {
        docPath: 'bookings/bk_rebooked_after_reject',
        data: {
          ...baseBookingData,
          bookingRef: 'MK-REBOOK1',
          preferredDate: '2026-11-28',
          preferredTimeSlot: '14:00 - 17:00',
          paymentMethod: 'cash_on_completion',
          paymentStatus: 'unpaid_cod',
        },
        requestTimeFields: ['createdAt', 'updatedAt'],
        currentDocumentExists: false,
      },
      {
        docPath: 'scheduleLocks/prov1_2026-11-28_14001700',
        data: {
          providerId: 'prov1',
          clientId: 'client1',
          bookingId: 'bk_rebooked_after_reject',
          preferredDate: '2026-11-28',
          preferredTimeSlot: '14:00 - 17:00',
        },
        requestTimeFields: ['createdAt'],
        currentDocumentExists: false,
      },
    ],
  });
  assert.equal(
    rebookFreedSlotAfterProviderReject.status,
    200,
    `AUD-006 (Scenario 4b): Another client booking the slot released by provider rejection must succeed: ${rebookFreedSlotAfterProviderReject.body}`
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

  // --- SystemSettings: optional supportWhatsAppPhone ('') vs strict Moroccan phone & existing bounds ---
  const baseSystemSettings = {
    platformFeePct: 0,
    minWithdrawalMad: 200,
    autoRefundOnProviderCancel: true,
    requireKycForEscrowPayout: true,
    updatedByEmail: 'admin1@test.ma',
  };

  // 1. Empty supportWhatsAppPhone ('') accepted for admin
  const settingsEmptyPhone = await commitWrite({
    token: adminToken,
    docPath: 'systemSettings/global',
    data: {
      ...baseSystemSettings,
      supportWhatsAppPhone: '',
    },
    requestTimeFields: ['updatedAt'],
  });
  assert.equal(
    settingsEmptyPhone.status,
    200,
    `SystemSettings: Admin saving empty supportWhatsAppPhone must succeed: ${settingsEmptyPhone.body}`
  );

  // 2. Valid Moroccan supportWhatsAppPhone accepted for admin
  const settingsValidPhone = await commitWrite({
    token: adminToken,
    docPath: 'systemSettings/global',
    data: {
      ...baseSystemSettings,
      supportWhatsAppPhone: '+212661234567',
    },
    requestTimeFields: ['updatedAt'],
  });
  assert.equal(
    settingsValidPhone.status,
    200,
    `SystemSettings: Admin saving valid Moroccan supportWhatsAppPhone must succeed: ${settingsValidPhone.body}`
  );

  // 3. Invalid non-empty supportWhatsAppPhone values rejected by Firestore rules
  for (const invalidPhone of ['0661234567', '+33612345678', '+212123456789', 'abc', '   ']) {
    const settingsBadPhone = await commitWrite({
      token: adminToken,
      docPath: 'systemSettings/global',
      data: {
        ...baseSystemSettings,
        supportWhatsAppPhone: invalidPhone,
      },
      requestTimeFields: ['updatedAt'],
    });
    assert.equal(
      settingsBadPhone.status,
      403,
      `SystemSettings: Invalid non-empty supportWhatsAppPhone "${invalidPhone}" must be rejected`
    );
  }

  // 4. Existing systemSettings validations & admin-only RBAC remain strictly enforced
  const settingsOutOfRangeFee = await commitWrite({
    token: adminToken,
    docPath: 'systemSettings/global',
    data: {
      ...baseSystemSettings,
      platformFeePct: 55,
      supportWhatsAppPhone: '',
    },
    requestTimeFields: ['updatedAt'],
  });
  assert.equal(
    settingsOutOfRangeFee.status,
    403,
    'SystemSettings: platformFeePct > 50 must still be rejected'
  );

  const settingsLowMinWithdrawal = await commitWrite({
    token: adminToken,
    docPath: 'systemSettings/global',
    data: {
      ...baseSystemSettings,
      minWithdrawalMad: 25,
      supportWhatsAppPhone: '',
    },
    requestTimeFields: ['updatedAt'],
  });
  assert.equal(
    settingsLowMinWithdrawal.status,
    403,
    'SystemSettings: minWithdrawalMad < 50 must still be rejected'
  );

  const settingsExtraField = await commitWrite({
    token: adminToken,
    docPath: 'systemSettings/global',
    data: {
      ...baseSystemSettings,
      supportWhatsAppPhone: '',
      unexpectedExtraField: true,
    },
    requestTimeFields: ['updatedAt'],
  });
  assert.equal(
    settingsExtraField.status,
    403,
    'SystemSettings: Unexpected extra keys must still be rejected'
  );

  const settingsNonAdmin = await commitWrite({
    token: clientToken,
    docPath: 'systemSettings/global',
    data: {
      ...baseSystemSettings,
      supportWhatsAppPhone: '',
    },
    requestTimeFields: ['updatedAt'],
  });
  assert.equal(
    settingsNonAdmin.status,
    403,
    'SystemSettings: Non-admin write to /systemSettings/global must remain rejected'
  );

  // --- AUD-011: Law 09-08 termsAcceptedAt consent timestamp enforcement on /users/{uid} create ---
  const termsOkToken = makeJwt({ uid: 'u_terms_ok', email: 'termsok@test.ma' });
  const createUserWithTermsTs = await commitWrite({
    token: termsOkToken,
    docPath: 'users/u_terms_ok',
    data: {
      uid: 'u_terms_ok',
      role: 'client',
      fullName: 'Nadia Consent',
      phone: '+212661556677',
      city: 'Rabat',
      neighborhood: 'Agdal',
      languagePref: 'fr',
      verifiedBadge: false,
    },
    requestTimeFields: ['termsAcceptedAt', 'createdAt', 'updatedAt'],
    currentDocumentExists: false,
  });
  assert.equal(
    createUserWithTermsTs.status,
    200,
    `AUD-011: Initial user creation with serverTimestamp termsAcceptedAt must succeed: ${createUserWithTermsTs.body}`
  );

  const termsForgedToken = makeJwt({ uid: 'u_terms_forged', email: 'termsforged@test.ma' });
  const createUserWithForgedTermsTs = await commitWrite({
    token: termsForgedToken,
    docPath: 'users/u_terms_forged',
    data: {
      uid: 'u_terms_forged',
      role: 'client',
      fullName: 'Forged Consent',
      phone: '+212661556678',
      city: 'Rabat',
      neighborhood: 'Agdal',
      languagePref: 'fr',
      verifiedBadge: false,
    },
    rawTimestampFields: { termsAcceptedAt: '2020-01-01T00:00:00.000Z' },
    requestTimeFields: ['createdAt', 'updatedAt'],
    currentDocumentExists: false,
  });
  assert.equal(
    createUserWithForgedTermsTs.status,
    403,
    'AUD-011: Forged/backdated termsAcceptedAt timestamp on user create must be rejected'
  );

  // --- AUD-013: Atomic proposal acceptance + auto-rejection of competing pending proposals ---
  assert.equal(
    (
      await commitWrite({
        token: 'owner',
        docPath: 'users/prov2',
        data: {
          uid: 'prov2',
          role: 'provider',
          fullName: 'Maâlem Hassan Second',
          phone: '+212662112233',
          city: 'Casablanca',
          neighborhood: 'Anfa',
          languagePref: 'fr',
          verifiedBadge: true,
        },
        rawTimestampFields: { createdAt: fixedCreatedIso, updatedAt: fixedCreatedIso },
      })
    ).status,
    200
  );
  assert.equal(
    (
      await commitWrite({
        token: 'owner',
        docPath: 'providers/prov2',
        data: {
          uid: 'prov2',
          fullNameFr: 'Maâlem Hassan Second',
          fullNameAr: 'المعلم حسن الثاني',
          category: 'Plomberie',
          bioFr: 'Plombier qualifié à Casablanca disponible rapidement.',
          bioAr: 'رصاص مؤهل في الدار البيضاء متاح بسرعة.',
          hourlyRateMAD: 160,
          fixedVisitFeeMAD: 60,
          experienceYears: 7,
          skills: ['Plomberie'],
          portfolioImages: ['https://example.com/p2.jpg'],
          ratingAvg: 4.9,
          reviewCount: 4,
          isAvailableNow: true,
          verifiedBadge: true,
          phone: '+212662112233',
          location: { lat: 33.5883, lng: -7.6325, city: 'Casablanca', quartier: 'Anfa' },
        },
        rawTimestampFields: { createdAt: fixedCreatedIso, updatedAt: fixedCreatedIso },
      })
    ).status,
    200
  );

  const aud13JobBase = {
    jobRef: 'JOB-AUD013',
    clientId: 'client1',
    clientName: 'Salma Client',
    clientPhone: '+212661234567',
    title: 'Remplacement robinetterie cuisine',
    category: 'Plomberie',
    city: 'Casablanca',
    neighborhood: 'Maârif',
    description: 'Besoin de remplacer le mitigeur de cuisine qui fuit fortement.',
    budgetMad: 400,
    urgency: 'this_week',
    preferredDate: '2026-12-10',
    preferredTimeSlot: '09:00 - 12:00',
    status: 'open',
    proposalCount: 2,
  };
  assert.equal(
    (
      await commitWrite({
        token: 'owner',
        docPath: 'jobPosts/job_aud013',
        data: aud13JobBase,
        rawTimestampFields: { createdAt: fixedCreatedIso, updatedAt: fixedCreatedIso },
      })
    ).status,
    200
  );

  const prop1Aud13 = {
    ...baseProposalData,
    jobId: 'job_aud013',
    providerId: 'prov1',
    status: 'pending',
  };
  const prop2Aud13 = {
    ...baseProposalData,
    jobId: 'job_aud013',
    providerId: 'prov2',
    providerName: 'Maâlem Hassan Second',
    providerPhone: '+212662112233',
    proposedPriceMad: 380,
    laborCostMad: 280,
    materialsCostMad: 100,
    status: 'pending',
  };

  const p1Create = await commitWrite({
    token: providerToken,
    docPath: 'jobPosts/job_aud013/proposals/prov1',
    data: prop1Aud13,
    requestTimeFields: ['createdAt', 'updatedAt'],
    currentDocumentExists: false,
  });
  assert.equal(p1Create.status, 200, `AUD-013: Seed prov1 proposal failed: ${p1Create.body}`);
  const p1CreatedIso =
    JSON.parse(p1Create.body).writeResults?.[0]?.transformResults?.[0]?.timestampValue ??
    fixedCreatedIso;

  const p2Create = await commitWrite({
    token: provider2Token,
    docPath: 'jobPosts/job_aud013/proposals/prov2',
    data: prop2Aud13,
    requestTimeFields: ['createdAt', 'updatedAt'],
    currentDocumentExists: false,
  });
  assert.equal(p2Create.status, 200, `AUD-013: Seed prov2 proposal failed: ${p2Create.body}`);
  const p2CreatedIso =
    JSON.parse(p2Create.body).writeResults?.[0]?.transformResults?.[0]?.timestampValue ??
    fixedCreatedIso;

  // Standalone accept without atomically assigning jobPosts/job_aud013 must be rejected
  const standaloneAccept = await commitWrite({
    token: clientToken,
    docPath: 'jobPosts/job_aud013/proposals/prov1',
    data: { ...prop1Aud13, status: 'accepted' },
    rawTimestampFields: { createdAt: p1CreatedIso },
    requestTimeFields: ['updatedAt'],
    currentDocumentExists: true,
  });
  assert.equal(
    standaloneAccept.status,
    403,
    'AUD-013: Accepting a proposal without atomically assigning parent job must be rejected'
  );

  // Atomic acceptance batch (assigns job to prov1 + marks prov1 proposal accepted) succeeds
  const atomicAccept = await commitBatch({
    token: clientToken,
    ops: [
      {
        docPath: 'jobPosts/job_aud013',
        data: {
          ...aud13JobBase,
          status: 'assigned',
          assignedProviderId: 'prov1',
          assignedProviderName: prop1Aud13.providerName,
          assignedBookingId: 'bk_aud013',
        },
        rawTimestampFields: { createdAt: fixedCreatedIso },
        requestTimeFields: ['updatedAt'],
        currentDocumentExists: true,
      },
      {
        docPath: 'jobPosts/job_aud013/proposals/prov1',
        data: { ...prop1Aud13, status: 'accepted' },
        rawTimestampFields: { createdAt: p1CreatedIso },
        requestTimeFields: ['updatedAt'],
        currentDocumentExists: true,
      },
    ],
  });
  assert.equal(
    atomicAccept.status,
    200,
    `AUD-013: Atomic acceptance of winning proposal must succeed: ${atomicAccept.body}`
  );

  // Accepting competing proposal prov2 after job is already assigned must be rejected
  const doubleAcceptCompeting = await commitWrite({
    token: clientToken,
    docPath: 'jobPosts/job_aud013/proposals/prov2',
    data: { ...prop2Aud13, status: 'accepted' },
    rawTimestampFields: { createdAt: p2CreatedIso },
    requestTimeFields: ['updatedAt'],
    currentDocumentExists: true,
  });
  assert.equal(
    doubleAcceptCompeting.status,
    403,
    'AUD-013: Accepting competing proposal after job is assigned must be rejected'
  );

  // Auto-rejecting competing pending proposal prov2 after job assignment succeeds
  const autoRejectCompeting = await commitWrite({
    token: clientToken,
    docPath: 'jobPosts/job_aud013/proposals/prov2',
    data: { ...prop2Aud13, status: 'rejected' },
    rawTimestampFields: { createdAt: p2CreatedIso },
    requestTimeFields: ['updatedAt'],
    currentDocumentExists: true,
  });
  assert.equal(
    autoRejectCompeting.status,
    200,
    `AUD-013: Client auto-rejecting competing pending proposal after assignment must succeed: ${autoRejectCompeting.body}`
  );

  // --- AUD-019: Collection-group batch lookup on proposals (own providerId allowed, cross-provider denied) ---
  async function runCollectionGroupQuery(params: {
    token: string;
    providerIdFilter: string;
  }): Promise<{ status: number; body: string }> {
    const payload = JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'proposals', allDescendants: true }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'providerId' },
            op: 'EQUAL',
            value: { stringValue: params.providerIdFilter },
          },
        },
        limit: 50,
      },
    });
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: `${dbBase}:runQuery`,
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
      req.write(payload);
      req.end();
    });
  }

  const ownProposalsCg = await runCollectionGroupQuery({
    token: providerToken,
    providerIdFilter: 'prov1',
  });
  assert.equal(
    ownProposalsCg.status,
    200,
    `AUD-019: Provider querying own proposals via collectionGroup must succeed: ${ownProposalsCg.body}`
  );
  assert.ok(
    ownProposalsCg.body.includes('jobPosts/job_aud013/proposals/prov1'),
    'AUD-019: Own collectionGroup query should return prov1 proposal'
  );

  const otherProposalsCg = await runCollectionGroupQuery({
    token: providerToken,
    providerIdFilter: 'prov2',
  });
  assert.equal(
    otherProposalsCg.status,
    403,
    'AUD-019: Provider querying another provider proposals via collectionGroup must be rejected'
  );
});


