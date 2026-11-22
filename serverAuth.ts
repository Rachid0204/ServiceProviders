import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

export interface VerifiedFirebaseToken {
  uid: string;
  email?: string;
  emailVerified: boolean;
  phoneNumber?: string;
  isAdmin: boolean;
  claims: Record<string, unknown>;
}

export interface AuthenticatedRequest extends Request {
  authUser?: VerifiedFirebaseToken;
}

type CertMap = Record<string, string>;

let cachedCerts: { certs: CertMap; expiresAt: number } | null = null;

function decodeBase64Url(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padLen), 'base64');
}

function parseMaxAgeSeconds(cacheControl: string | null): number {
  if (!cacheControl) return 3600;
  const match = cacheControl.match(/max-age=(\d+)/i);
  if (!match) return 3600;
  return Math.max(60, Math.min(86400, Number(match[1])));
}

async function defaultFetchCerts(): Promise<CertMap> {
  const now = Date.now();
  if (cachedCerts && cachedCerts.expiresAt > now) {
    return cachedCerts.certs;
  }
  const resp = await fetch(GOOGLE_CERTS_URL);
  if (!resp.ok) {
    throw new Error(`Failed to fetch Firebase public keys (HTTP ${resp.status})`);
  }
  const certs = (await resp.json()) as CertMap;
  const maxAgeSec = parseMaxAgeSeconds(resp.headers.get('cache-control'));
  cachedCerts = { certs, expiresAt: now + maxAgeSec * 1000 };
  return certs;
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+([A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+)$/);
  return match ? match[1] : null;
}

/**
 * Cryptographically verifies a Firebase ID Token (RS256) according to the official
 * Firebase specification without requiring external runtime dependencies.
 */
export async function verifyFirebaseIdToken(
  token: string,
  options: {
    projectId: string;
    nowSec?: number;
    fetchCerts?: () => Promise<CertMap>;
  }
): Promise<VerifiedFirebaseToken> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT');
  }
  const [headerB64, payloadB64, sigB64] = parts;

  let header: { alg?: unknown; kid?: unknown };
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(decodeBase64Url(headerB64).toString('utf8')) as {
      alg?: unknown;
      kid?: unknown;
    };
    payload = JSON.parse(decodeBase64Url(payloadB64).toString('utf8')) as Record<string, unknown>;
  } catch {
    throw new Error('Invalid JWT encoding');
  }

  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) {
    throw new Error('Unsupported JWT algorithm or missing kid');
  }

  const nowSec = options.nowSec ?? Math.floor(Date.now() / 1000);
  const expectedIssuer = `https://securetoken.google.com/${options.projectId}`;

  if (payload.aud !== options.projectId) {
    throw new Error('Invalid JWT audience');
  }
  if (payload.iss !== expectedIssuer) {
    throw new Error('Invalid JWT issuer');
  }
  if (typeof payload.sub !== 'string' || payload.sub.length < 1 || payload.sub.length > 128) {
    throw new Error('Invalid JWT subject');
  }
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
    throw new Error('Expired JWT');
  }
  if (typeof payload.iat !== 'number' || payload.iat > nowSec + 300) {
    throw new Error('Invalid JWT issued-at time');
  }
  if (typeof payload.auth_time !== 'number' || payload.auth_time > nowSec + 300) {
    throw new Error('Invalid JWT auth_time');
  }

  const certs = await (options.fetchCerts ?? defaultFetchCerts)();
  const publicKeyPem = certs[header.kid];
  if (!publicKeyPem) {
    throw new Error('Unknown JWT signing key');
  }

  const signingInput = Buffer.from(`${headerB64}.${payloadB64}`, 'utf8');
  const signature = decodeBase64Url(sigB64);
  const isValidSig = crypto.verify('RSA-SHA256', signingInput, publicKeyPem, signature);
  if (!isValidSig) {
    throw new Error('Invalid JWT signature');
  }

  const email = typeof payload.email === 'string' ? payload.email : undefined;
  const emailVerified = payload.email_verified === true;
  const phoneNumber = typeof payload.phone_number === 'string' ? payload.phone_number : undefined;
  const isAdmin = payload.admin === true;

  return {
    uid: payload.sub,
    email,
    emailVerified,
    phoneNumber,
    isAdmin,
    claims: payload,
  };
}

/**
 * Express middleware requiring a valid, verified Firebase ID token in `Authorization: Bearer <token>`.
 */
export function createRequireFirebaseAuth(options: {
  projectId: string;
  requireVerified?: boolean;
  fetchCerts?: () => Promise<CertMap>;
}) {
  const requireVerified = options.requireVerified ?? true;
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      res.status(401).json({ error: 'Authentication required (Bearer Firebase ID token).' });
      return;
    }
    try {
      const verified = await verifyFirebaseIdToken(token, {
        projectId: options.projectId,
        fetchCerts: options.fetchCerts,
      });
      if (requireVerified && !verified.emailVerified && !verified.phoneNumber) {
        res.status(403).json({ error: 'Verified email or phone number required.' });
        return;
      }
      req.authUser = verified;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired authentication token.' });
    }
  };
}

/**
 * Express middleware requiring a verified admin custom claim (`admin: true`).
 * Must be placed after `createRequireFirebaseAuth`.
 */
export function requireFirebaseAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.authUser?.isAdmin) {
    res.status(403).json({ error: 'Administrator privileges required.' });
    return;
  }
  next();
}
