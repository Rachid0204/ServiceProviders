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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 8080);

app.use(express.json({ limit: '64kb' }));

// Health check for Google Cloud Run
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: "Moul L'Khedma API",
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'serviceproviders-530c4',
    port: PORT,
    cities: MOROCCAN_CITIES,
    categories: SERVICE_CATEGORIES,
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

// Server-boundary CMI Escrow payment intent preparation endpoint (ready for live CMI/Stripe credentials)
app.post('/api/payments/cmi-intent', (req, res) => {
  const bookingRef = String(req.body?.bookingRef ?? '').trim();
  const amountMad = Math.round(Number(req.body?.amountMad ?? 0));
  if (!bookingRef || bookingRef.length < 3 || bookingRef.length > 32) {
    res.status(400).json({ error: 'Invalid bookingRef' });
    return;
  }
  if (!Number.isFinite(amountMad) || amountMad < 50 || amountMad > 100000) {
    res.status(400).json({ error: 'Amount must be between 50 and 100000 MAD' });
    return;
  }
  const gatewayConfigured = Boolean(process.env.CMI_MERCHANT_ID && process.env.CMI_STORE_KEY);
  res.json({
    bookingRef,
    amountMad,
    currency: 'MAD',
    paymentStatus: 'escrow_held',
    mode: gatewayConfigured ? 'live_cmi' : 'sandbox_escrow',
    escrowIntentId: `cmi_${bookingRef.toLowerCase()}_${Date.now()}`,
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
    const distPath = path.join(__dirname, 'dist');
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
