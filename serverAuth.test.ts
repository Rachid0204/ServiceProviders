import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  extractBearerToken,
  verifyFirebaseIdToken,
  createRequireFirebaseAuth,
  requireFirebaseAdmin,
  type AuthenticatedRequest,
} from './serverAuth';
import type { Response } from 'express';

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const TEST_PROJECT_ID = 'serviceproviders-530c4';
const TEST_KID = 'test-key-1';

function toBase64Url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function signTestJwt(
  payload: Record<string, unknown>,
  headerOverride: Record<string, unknown> = {}
): string {
  const header = { alg: 'RS256', typ: 'JWT', kid: TEST_KID, ...headerOverride };
  const h = toBase64Url(JSON.stringify(header));
  const p = toBase64Url(JSON.stringify(payload));
  const sig = crypto.sign('RSA-SHA256', Buffer.from(`${h}.${p}`, 'utf8'), privateKey);
  return `${h}.${p}.${toBase64Url(sig)}`;
}

const mockFetchCerts = async () => ({ [TEST_KID]: publicKey });

test('extractBearerToken parses valid Bearer JWT headers and rejects malformed values', () => {
  assert.equal(extractBearerToken('Bearer aaa.bbb.ccc'), 'aaa.bbb.ccc');
  assert.equal(extractBearerToken('Basic dXNlcjpwYXNz'), null);
  assert.equal(extractBearerToken('Bearer not-a-jwt'), null);
  assert.equal(extractBearerToken(undefined), null);
});

test('verifyFirebaseIdToken accepts valid RS256 token and extracts uid, verification, and admin claim', async () => {
  const nowSec = 1_750_000_000;
  const token = signTestJwt({
    aud: TEST_PROJECT_ID,
    iss: `https://securetoken.google.com/${TEST_PROJECT_ID}`,
    sub: 'uid-admin-1',
    email: 'admin@moul-lkhedma.ma',
    email_verified: true,
    admin: true,
    iat: nowSec - 60,
    auth_time: nowSec - 60,
    exp: nowSec + 3600,
  });

  const verified = await verifyFirebaseIdToken(token, {
    projectId: TEST_PROJECT_ID,
    nowSec,
    fetchCerts: mockFetchCerts,
  });

  assert.equal(verified.uid, 'uid-admin-1');
  assert.equal(verified.email, 'admin@moul-lkhedma.ma');
  assert.equal(verified.emailVerified, true);
  assert.equal(verified.isAdmin, true);
});

test('verifyFirebaseIdToken rejects expired, wrong-audience, wrong-alg, and tampered tokens', async () => {
  const nowSec = 1_750_000_000;
  const basePayload = {
    aud: TEST_PROJECT_ID,
    iss: `https://securetoken.google.com/${TEST_PROJECT_ID}`,
    sub: 'uid-user-1',
    email_verified: true,
    iat: nowSec - 60,
    auth_time: nowSec - 60,
    exp: nowSec + 3600,
  };

  // Expired
  await assert.rejects(
    verifyFirebaseIdToken(signTestJwt({ ...basePayload, exp: nowSec - 1 }), {
      projectId: TEST_PROJECT_ID,
      nowSec,
      fetchCerts: mockFetchCerts,
    }),
    /Expired JWT/
  );

  // Wrong audience
  await assert.rejects(
    verifyFirebaseIdToken(signTestJwt({ ...basePayload, aud: 'other-project' }), {
      projectId: TEST_PROJECT_ID,
      nowSec,
      fetchCerts: mockFetchCerts,
    }),
    /Invalid JWT audience/
  );

  // Alg none downgrade attempt
  await assert.rejects(
    verifyFirebaseIdToken(signTestJwt(basePayload, { alg: 'none' }), {
      projectId: TEST_PROJECT_ID,
      nowSec,
      fetchCerts: mockFetchCerts,
    }),
    /Unsupported JWT algorithm/
  );

  // Tampered payload
  const validToken = signTestJwt(basePayload);
  const parts = validToken.split('.');
  const tamperedPayload = toBase64Url(JSON.stringify({ ...basePayload, admin: true }));
  await assert.rejects(
    verifyFirebaseIdToken(`${parts[0]}.${tamperedPayload}.${parts[2]}`, {
      projectId: TEST_PROJECT_ID,
      nowSec,
      fetchCerts: mockFetchCerts,
    }),
    /Invalid JWT signature/
  );
});

test('createRequireFirebaseAuth and requireFirebaseAdmin enforce 401/403 correctly', async () => {
  const middleware = createRequireFirebaseAuth({
    projectId: TEST_PROJECT_ID,
    fetchCerts: mockFetchCerts,
  });

  const makeMockRes = () => {
    let statusCode = 200;
    let body: unknown = null;
    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(payload: unknown) {
        body = payload;
        return this;
      },
    } as unknown as Response;
    return { res, getStatus: () => statusCode, getBody: () => body };
  };

  // Missing Authorization header -> 401
  const r1 = makeMockRes();
  let nextCalled = false;
  await middleware({ headers: {} } as AuthenticatedRequest, r1.res, () => {
    nextCalled = true;
  });
  assert.equal(r1.getStatus(), 401);
  assert.equal(nextCalled, false);

  // Unverified email -> 403
  const nowSec = Math.floor(Date.now() / 1000);
  const unverifiedToken = signTestJwt({
    aud: TEST_PROJECT_ID,
    iss: `https://securetoken.google.com/${TEST_PROJECT_ID}`,
    sub: 'uid-unverified',
    email_verified: false,
    iat: nowSec - 10,
    auth_time: nowSec - 10,
    exp: nowSec + 3600,
  });
  const r2 = makeMockRes();
  await middleware(
    { headers: { authorization: `Bearer ${unverifiedToken}` } } as AuthenticatedRequest,
    r2.res,
    () => {
      nextCalled = true;
    }
  );
  assert.equal(r2.getStatus(), 403);
  assert.equal(nextCalled, false);

  // Verified non-admin passes auth, blocked by requireFirebaseAdmin with 403
  const verifiedToken = signTestJwt({
    aud: TEST_PROJECT_ID,
    iss: `https://securetoken.google.com/${TEST_PROJECT_ID}`,
    sub: 'uid-client',
    email_verified: true,
    iat: nowSec - 10,
    auth_time: nowSec - 10,
    exp: nowSec + 3600,
  });
  const req3 = { headers: { authorization: `Bearer ${verifiedToken}` } } as AuthenticatedRequest;
  const r3 = makeMockRes();
  await middleware(req3, r3.res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
  assert.equal(req3.authUser?.uid, 'uid-client');

  const r4 = makeMockRes();
  let adminNext = false;
  requireFirebaseAdmin(req3, r4.res, () => {
    adminNext = true;
  });
  assert.equal(r4.getStatus(), 403);
  assert.equal(adminNext, false);
});
