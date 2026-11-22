import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = import.meta.dirname;
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const vercelJsonRaw = fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8');
const vercelConfig = JSON.parse(vercelJsonRaw) as {
  rewrites?: Array<{ source: string; destination: string }>;
  headers?: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
  outputDirectory?: string;
};

test('Vercel SPA rewrites, immutable asset caching, and security headers are configured in vercel.json', () => {
  assert.equal(vercelConfig.outputDirectory, 'dist');
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

test('Marketplace JPEG images are optimized under 200 KB each for fast mobile connections', () => {
  const imgDir = path.join(ROOT, 'src/assets/images');
  const files = fs.readdirSync(imgDir).filter((f) => f.endsWith('.jpg'));
  assert.ok(files.length >= 4);
  for (const file of files) {
    const bytes = fs.statSync(path.join(imgDir, file)).size;
    assert.ok(
      bytes <= 200 * 1024,
      `Expected ${file} to be <= 200 KB for mobile performance, got ${Math.round(bytes / 1024)} KB`
    );
  }
});

test('Built dist/index.html does not modulepreload lazy routes, Leaflet map, or modals upfront', () => {
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
    'ProviderMap',
    'vendor-leaflet',
    'BookingModal',
    'ProviderDetailModal',
    'ChatDrawerModal',
    'ReviewModal',
    'BookingLifecycleModals',
    'OnboardingModal',
    'BookingsDashboard',
  ]) {
    assert.equal(
      preloadJoined.includes(forbidden),
      false,
      `Lazy chunk "${forbidden}" must not be modulepreloaded upfront in dist/index.html`
    );
  }
});
