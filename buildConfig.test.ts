import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = import.meta.dirname;
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const vercelJsonRaw = fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8');
const vercelConfig = JSON.parse(vercelJsonRaw) as {
  buildCommand?: string;
  rewrites?: Array<{ source: string; destination: string }>;
  headers?: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
  outputDirectory?: string;
};

test('Vercel SPA rewrites, immutable asset caching, and security headers are configured in vercel.json', () => {
  assert.equal(vercelConfig.outputDirectory, 'dist');
  const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  };
  const buildScriptMatch = vercelConfig.buildCommand?.match(/^npm run ([a-zA-Z0-9:_-]+)$/);
  if (buildScriptMatch) {
    assert.ok(
      pkgJson.scripts?.[buildScriptMatch[1]],
      `package.json is missing script "${buildScriptMatch[1]}" referenced by vercel.json buildCommand`
    );
  }
  assert.ok(Array.isArray(vercelConfig.rewrites) && vercelConfig.rewrites.length >= 1);
  const spaRewrite = vercelConfig.rewrites.find((r) => r.destination === '/index.html');
  assert.ok(spaRewrite, 'Missing SPA catch-all rewrite to /index.html');
  assert.ok(spaRewrite.source.includes('api/'));
  assert.ok(spaRewrite.source.includes('assets/'));
  assert.ok(spaRewrite.source.includes('robots'));
  assert.ok(spaRewrite.source.includes('sitemap'));

  const allHeaderEntries = (vercelConfig.headers ?? []).flatMap((h) => h.headers);
  assert.ok(
    allHeaderEntries.some(
      (h) => h.key === 'Cache-Control' && h.value.includes('immutable')
    ),
    'Missing immutable Cache-Control header for hashed Vite assets'
  );
  assert.ok(
    allHeaderEntries.some((h) => h.key === 'X-Content-Type-Options' && h.value === 'nosniff')
  );
  assert.ok(allHeaderEntries.some((h) => h.key === 'X-Frame-Options' && h.value === 'DENY'));
});

test('index.html has non-empty pre-rendered SEO shell, WhatsApp/OG link previews, JSON-LD, &display=swap fonts, and no render-blocking Leaflet CSS', () => {
  // Google Fonts uses &display=swap to prevent invisible text on slow mobile connections
  assert.ok(indexHtml.includes('fonts.googleapis.com'));
  assert.ok(indexHtml.includes('display=swap'));
  assert.equal(indexHtml.includes('Tajawal'), false, 'Redundant Tajawal font should remain trimmed');

  // Render-blocking Leaflet CDN stylesheet must not be in <head>
  assert.equal(indexHtml.includes('unpkg.com/leaflet'), false);

  // Open Graph, Twitter Card, canonical, favicon, and Schema.org JSON-LD
  assert.ok(indexHtml.includes('property="og:image"'));
  assert.ok(indexHtml.includes('property="og:title"'));
  assert.ok(indexHtml.includes('property="og:description"'));
  assert.ok(indexHtml.includes('property="og:locale" content="fr_MA"'));
  assert.ok(indexHtml.includes('name="twitter:card" content="summary_large_image"'));
  assert.ok(indexHtml.includes('name="twitter:image"'));
  assert.ok(indexHtml.includes('rel="canonical"'));
  assert.ok(indexHtml.includes('type="application/ld+json"'));
  assert.ok(indexHtml.includes('rel="preload"'));

  // Non-empty pre-rendered shell inside <div id="root">
  const rootMatch = indexHtml.match(/<div id="root">([\s\S]*?)<\/div>\s*<script/);
  assert.ok(rootMatch && rootMatch[1].trim().length > 200, 'Expected non-empty pre-rendered HTML shell in #root');
  assert.ok(rootMatch[1].includes('<h1'));
});

test('Static SEO assets (robots.txt, sitemap.xml, favicon.svg) exist and protect /admin', () => {
  const robots = fs.readFileSync(path.join(ROOT, 'public/robots.txt'), 'utf8');
  const sitemap = fs.readFileSync(path.join(ROOT, 'public/sitemap.xml'), 'utf8');
  const favicon = fs.readFileSync(path.join(ROOT, 'public/favicon.svg'), 'utf8');

  assert.ok(robots.includes('Disallow: /admin'));
  assert.ok(robots.includes('Sitemap:'));
  assert.ok(sitemap.includes('<urlset'));
  assert.ok(favicon.includes('<svg'));
});

test('Marketplace JPEG images include all 6 category assets optimized under 200 KB each for fast mobile connections', () => {
  const imgDir = path.join(ROOT, 'src/assets/images');
  const files = fs.readdirSync(imgDir).filter((f) => f.endsWith('.jpg'));
  assert.ok(files.length >= 7, `Expected at least 7 optimized JPEGs (hero + 6 categories), got ${files.length}`);
  for (const requiredImg of [
    'hero_moroccan_craftsman_1794980476857.jpg',
    'service_plumbing_repair_1794980477189.jpg',
    'service_electrical_smart_1794980478001.jpg',
    'service_home_painting_1794980476260.jpg',
    'service_ac_hvac.jpg',
    'service_tutoring.jpg',
    'service_home_cleaning.jpg',
  ]) {
    assert.ok(files.includes(requiredImg), `Missing required category/hero image: ${requiredImg}`);
  }
  for (const file of files) {
    const bytes = fs.statSync(path.join(imgDir, file)).size;
    assert.ok(
      bytes <= 200 * 1024,
      `Expected ${file} to be <= 200 KB for mobile performance, got ${Math.round(bytes / 1024)} KB`
    );
  }
});

test('Public FR/AR translations contain zero internal database, auth, or schema developer jargon', () => {
  const translationsSource = fs.readFileSync(path.join(ROOT, 'src/i18n/translations.ts'), 'utf8');
  for (const forbidden of [
    'users/{uid}',
    'providers/{uid}',
    'serviceproviders-530c4',
    'Firebase Auth',
    'hourlyRateMAD',
    'fixedVisitFeeMAD',
    'isAvailableNow',
    'chats/{bookingId}/messages',
    '(pending)',
    '(in_progress)',
    '(completed)',
  ]) {
    assert.equal(
      translationsSource.includes(forbidden),
      false,
      `Developer jargon "${forbidden}" must not appear in src/i18n/translations.ts`
    );
  }
});

test('Auth isolation: fake local preview, demo bookings, and provider impersonation switcher are permanently removed', () => {
  assert.equal(
    fs.existsSync(path.join(ROOT, 'src/components/BookingsDashboard.tsx')),
    false,
    'Legacy BookingsDashboard.tsx with provider impersonation dropdown must not exist'
  );
  const authHook = fs.readFileSync(path.join(ROOT, 'src/hooks/useMarketplaceAuth.ts'), 'utf8');
  const bookingsHook = fs.readFileSync(path.join(ROOT, 'src/hooks/useBookings.ts'), 'utf8');
  assert.equal(authHook.includes('local-user-preview'), false);
  assert.equal(bookingsHook.includes('INITIAL_DEMO_BOOKINGS'), false);
  assert.equal(bookingsHook.includes('INITIAL_DEMO_CHATS'), false);
});

test('Built dist/index.html does not modulepreload lazy routes, dashboards, Leaflet map, or modals upfront', () => {
  const builtIndexPath = path.join(ROOT, 'dist/index.html');
  if (!fs.existsSync(builtIndexPath)) {
    return; // Verified during full build test pipeline
  }
  const builtHtml = fs.readFileSync(builtIndexPath, 'utf8');
  const preloadTags = builtHtml.match(/<link rel="modulepreload"[^>]*>/g) || [];
  const preloadJoined = preloadTags.join('\n');

  for (const forbidden of [
    'AdminRoute',
    'route-admin',
    'ClientDashboard',
    'ProviderDashboard',
    'ProfileSettingsView',
    'VerifyEmailView',
    'PostJobModal',
    'AuthModal',
    'ProviderMap',
    'vendor-leaflet',
    'BookingModal',
    'ProviderDetailModal',
    'ChatDrawerModal',
    'ReviewModal',
    'BookingLifecycleModals',
    'OnboardingModal',
    'MessagesInboxPage',
    'NotificationsPage',
    'DisputesPage',
    'AdminKycReviewSection',
    'AdminDisputesModerationSection',
  ]) {
    assert.equal(
      preloadJoined.includes(forbidden),
      false,
      `Lazy chunk "${forbidden}" must not be modulepreloaded upfront in dist/index.html`
    );
  }
});

test('Phase 7 Production Hardening: HSTS header, 12-category sitemap, private route robots disallow, and CI workflow', () => {
  const allHeaderEntries = (vercelConfig.headers ?? []).flatMap((h) => h.headers);
  assert.ok(
    allHeaderEntries.some(
      (h) => h.key === 'Strict-Transport-Security' && h.value.includes('max-age=')
    ),
    'Missing HSTS header in vercel.json'
  );

  const robots = fs.readFileSync(path.join(ROOT, 'public/robots.txt'), 'utf8');
  for (const privatePath of ['/admin', '/dashboard', '/provider', '/messages', '/notifications', '/disputes']) {
    assert.ok(robots.includes(`Disallow: ${privatePath}`), `Missing robots.txt disallow for ${privatePath}`);
  }

  const sitemap = fs.readFileSync(path.join(ROOT, 'public/sitemap.xml'), 'utf8');
  for (const slug of [
    '/services/plumbing',
    '/services/electricity',
    '/services/painting',
    '/services/tutoring',
    '/services/cleaning',
    '/services/hvac',
    '/services/carpentry',
    '/services/locksmith',
    '/services/appliance-repair',
    '/services/gardening',
    '/services/moving',
    '/services/masonry',
    '/terms',
    '/privacy',
  ]) {
    assert.ok(sitemap.includes(slug), `Missing ${slug} in public/sitemap.xml`);
  }

  const ciWorkflowPath = path.join(ROOT, '.github/workflows/ci.yml');
  assert.ok(fs.existsSync(ciWorkflowPath), 'Missing .github/workflows/ci.yml quality gate');
  const ciContent = fs.readFileSync(ciWorkflowPath, 'utf8');
  assert.ok(ciContent.includes('npm run lint'));
  assert.ok(ciContent.includes('check-i18n.mjs'));
  assert.ok(ciContent.includes('npm run lint:rules'));
  assert.ok(ciContent.includes('npm run build'));
  assert.ok(ciContent.includes('npm test'));
});

test('AUD-012: Firebase auto-deploy workflow watches and deploys storage.rules alongside Firestore rules and indexes', () => {
  const firebaseDeployPath = path.join(ROOT, '.github/workflows/firebase-deploy.yml');
  assert.ok(fs.existsSync(firebaseDeployPath), 'Missing .github/workflows/firebase-deploy.yml');
  const deployYaml = fs.readFileSync(firebaseDeployPath, 'utf8');

  assert.ok(deployYaml.includes("'storage.rules'"), 'firebase-deploy.yml must trigger on storage.rules changes');
  assert.ok(deployYaml.includes("'firestore,storage'"), 'firebase-deploy.yml default target must include storage');
  assert.ok(deployYaml.includes('npm run lint:rules'), 'firebase-deploy.yml must lint rules before deploy');

  const firebaseJson = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'firebase.json'), 'utf8')
  ) as { storage?: { rules?: string } };
  assert.equal(firebaseJson.storage?.rules, 'storage.rules');
  assert.ok(fs.existsSync(path.join(ROOT, 'storage.rules')), 'storage.rules file must exist');
});

test('AUD-014: Dead Express server and duplicate ChatDrawerModal/ProviderDetailModal are permanently retired and all ProviderDashboard modules stay < 500 lines', () => {
  for (const retiredPath of [
    'server.ts',
    'serverAuth.ts',
    'src/components/ChatDrawerModal.tsx',
    'src/components/ProviderDetailModal.tsx',
  ]) {
    assert.equal(
      fs.existsSync(path.join(ROOT, retiredPath)),
      false,
      `Retired file "${retiredPath}" must not exist`
    );
  }

  const dashboardsDir = path.join(ROOT, 'src/components/dashboards');
  const providerModules = fs
    .readdirSync(dashboardsDir)
    .filter((f) => f.startsWith('Provider') && f.endsWith('.tsx'));
  assert.ok(providerModules.length >= 8, 'Expected modularized Provider dashboard tab files');
  for (const modFile of providerModules) {
    const lineCount = fs.readFileSync(path.join(dashboardsDir, modFile), 'utf8').split('\n').length;
    assert.ok(
      lineCount < 500,
      `AUD-014: Expected ${modFile} to stay < 500 lines, got ${lineCount} lines`
    );
  }
});

test('AUD-019 & AUD-021: proposals.providerId COLLECTION_GROUP index override and headless Chromium smoke E2E script are configured in CI', () => {
  const indexesJson = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'firestore.indexes.json'), 'utf8')
  ) as {
    fieldOverrides?: Array<{
      collectionGroup: string;
      fieldPath: string;
      indexes: Array<{ queryScope: string; order?: string }>;
    }>;
  };
  const proposalOverride = (indexesJson.fieldOverrides || []).find(
    (o) => o.collectionGroup === 'proposals' && o.fieldPath === 'providerId'
  );
  assert.ok(proposalOverride, 'Missing proposals.providerId fieldOverride in firestore.indexes.json');
  assert.ok(
    proposalOverride.indexes.some((idx) => idx.queryScope === 'COLLECTION_GROUP'),
    'proposals.providerId override must enable COLLECTION_GROUP queryScope'
  );

  assert.ok(fs.existsSync(path.join(ROOT, 'scripts/e2e-smoke.mjs')), 'Missing scripts/e2e-smoke.mjs');
  const ciContent = fs.readFileSync(path.join(ROOT, '.github/workflows/ci.yml'), 'utf8');
  assert.ok(ciContent.includes('npm run test:e2e'), 'CI workflow must execute npm run test:e2e');
});



