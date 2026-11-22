import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { VETTED_PROVIDERS } from './src/data/providers.ts';
import {
  MOROCCAN_CITIES,
  SERVICE_CATEGORIES,
  validateUserProfileInput,
  validateServiceRequestInput,
} from './src/utils/marketplace.ts';
import {
  createRequireFirebaseAuth,
  type AuthenticatedRequest,
} from './serverAuth.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 8080);
const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'serviceproviders-530c4';

app.disable('x-powered-by');
// Honor X-Forwarded-For on Cloud Run / reverse proxies so rate limiting isolates per client IP
app.set('trust proxy', 1);
app.use(express.json({ limit: '64kb' }));

// Baseline HTTP security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
  next();
});

// Bounded in-memory sliding-window rate limiter for /api/* routes (120 req/min per IP)
const apiRateBuckets = new Map<string, { count: number; resetAt: number }>();
const MAX_RATE_BUCKETS = 10_000;
app.use('/api', (req, res, next) => {
  const now = Date.now();
  if (apiRateBuckets.size >= MAX_RATE_BUCKETS) {
    for (const [bucketKey, bucket] of apiRateBuckets) {
      if (bucket.resetAt <= now) {
        apiRateBuckets.delete(bucketKey);
      }
    }
    if (apiRateBuckets.size >= MAX_RATE_BUCKETS) {
      apiRateBuckets.clear();
    }
  }
  const key = req.ip || 'unknown';
  const entry = apiRateBuckets.get(key);
  if (!entry || entry.resetAt <= now) {
    apiRateBuckets.set(key, { count: 1, resetAt: now + 60_000 });
    next();
    return;
  }
  entry.count += 1;
  if (entry.count > 120) {
    res.status(429).json({ error: 'Too many requests. Please retry shortly.' });
    return;
  }
  next();
});

const requireFirebaseAuth = createRequireFirebaseAuth({ projectId: FIREBASE_PROJECT_ID });

// Health check for Google Cloud Run
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: "Moul L'Khedma API",
    projectId: FIREBASE_PROJECT_ID,
    port: PORT,
    cities: MOROCCAN_CITIES,
    categories: SERVICE_CATEGORIES,
  });
});

// Authenticated identity inspection endpoint (verifies Firebase RS256 ID token on the server)
app.get('/api/auth/whoami', requireFirebaseAuth, (req: AuthenticatedRequest, res) => {
  res.json({
    uid: req.authUser?.uid,
    emailVerified: req.authUser?.emailVerified ?? false,
    isAdmin: req.authUser?.isAdmin ?? false,
  });
});

// Public vetted providers catalog endpoint
app.get('/api/providers', (req, res) => {
  const { city, category } = req.query;
  let results = VETTED_PROVIDERS;
  if (typeof city === 'string' && city !== 'ALL') {
    results = results.filter((p) => p.location.city === city);
  }
  if (typeof category === 'string' && category !== 'ALL') {
    results = results.filter((p) => p.category === category);
  }
  res.json({ providers: results, currency: 'MAD' });
});

// Server-boundary validation endpoint for user onboarding payloads
app.post('/api/validate-profile', (req, res) => {
  const validation = validateUserProfileInput({
    role: String(req.body?.role ?? ''),
    fullName: String(req.body?.fullName ?? ''),
    phone: String(req.body?.phone ?? ''),
    city: String(req.body?.city ?? ''),
    neighborhood: String(req.body?.neighborhood ?? ''),
    languagePref: req.body?.languagePref === 'ar' ? 'ar' : 'fr',
    specialty: req.body?.specialty ? String(req.body.specialty) : undefined,
    hourlyRateMad:
      req.body?.hourlyRateMad !== undefined ? Number(req.body.hourlyRateMad) : undefined,
    bio: req.body?.bio ? String(req.body.bio) : undefined,
  });

  if (!validation.valid) {
    res.status(400).json(validation);
    return;
  }
  res.json(validation);
});

// Server-boundary validation endpoint for service requests
app.post('/api/validate-request', (req, res) => {
  const lang = req.body?.lang === 'ar' ? 'ar' : 'fr';
  const validation = validateServiceRequestInput(
    {
      clientName: String(req.body?.clientName ?? ''),
      clientPhone: String(req.body?.clientPhone ?? ''),
      neighborhood: String(req.body?.neighborhood ?? ''),
      description: String(req.body?.description ?? ''),
      preferredDate: String(req.body?.preferredDate ?? ''),
    },
    lang
  );

  if (!validation.valid) {
    res.status(400).json(validation);
    return;
  }
  res.json(validation);
});

// Live CMI payment gateway endpoint requires authenticated Firebase ID token verification & CMI HMAC signing
app.post('/api/payments/cmi-intent', requireFirebaseAuth, (_req, res) => {
  res.status(501).json({
    error:
      'Live CMI gateway integration is not enabled on this endpoint. Authenticated server-side CMI signing and webhook verification are required before activating live charges.',
  });
});

// Serve static production bundle or mount Vite dev middleware
async function startServer() {
  if (process.env.NODE_ENV === 'development') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath =
      path.basename(__dirname) === 'dist' ? __dirname : path.join(__dirname, 'dist');
    app.use(express.static(distPath));

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) {
          res.status(200).send("Moul L'Khedma API Server running.");
        }
      });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Moul L'Khedma server listening on port ${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export default app;
