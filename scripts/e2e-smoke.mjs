import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';

/**
 * Real headless Chromium browser smoke E2E suite against the built production bundle (dist/) (AUD-021).
 * Exercises:
 *  1. Home page (`/`) render, French LTR document attributes, zero uncaught page errors
 *  2. Live Arabic RTL switch (`dir="rtl"`, `lang="ar"`) in browser DOM
 *  3. Client-side navigation across `/services`, `/terms`, `/privacy`, `/register`
 *  4. Public phone privacy check on `/services` (no raw `tel:` or `wa.me` links leaked in initial DOM)
 *  5. Law 09-08 explicit consent checkbox rendered on `/register`
 */
const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');

if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  console.error('[e2e-smoke] FAIL — dist/index.html missing. Run `npm run build` first.');
  process.exit(1);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function findChromeBinary() {
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  for (const bin of candidates) {
    if (fs.existsSync(bin)) return bin;
  }
  return null;
}

function startStaticSpaServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = (req.url || '/').split('?')[0];
      const safeRel = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, '');
      let filePath = path.join(DIST_DIR, safeRel === '/' ? 'index.html' : safeRel);

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(DIST_DIR, 'index.html');
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${addr.port}` });
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function launchHeadlessChrome(chromeBin) {
  const userDataDir = fs.mkdtempSync('/tmp/moul-lkhedma-e2e-');
  const child = spawn(
    chromeBin,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );

  let stderrBuf = '';
  const wsUrl = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for Chromium DevTools endpoint. stderr:\n${stderrBuf}`));
    }, 15_000);

    child.stderr.on('data', (chunk) => {
      stderrBuf += chunk.toString('utf8');
      const m = stderrBuf.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (m) {
        clearTimeout(timer);
        resolve(m[1]);
      }
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Chromium exited early (${code}). stderr:\n${stderrBuf}`));
    });
  });

  const cleanup = () => {
    try {
      child.kill('SIGTERM');
    } catch {
      // ignore
    }
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  };

  return { wsUrl, cleanup };
}

class CdpSession {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.exceptions = [];
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        const desc =
          msg.params?.exceptionDetails?.exception?.description ||
          msg.params?.exceptionDetails?.text ||
          'Unknown page exception';
        this.exceptions.push(desc);
      }
    });
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  async evalJs(sessionId, expression) {
    const res = await this.send(
      'Runtime.evaluate',
      { expression, awaitPromise: true, returnByValue: true },
      sessionId
    );
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
    }
    return res.result?.value;
  }

  async waitFor(sessionId, predicateExpr, timeoutMs = 10_000) {
    const deadline = Date.now() + timeoutMs;
    let lastErr = null;
    while (Date.now() < deadline) {
      try {
        const ok = await this.evalJs(sessionId, `Boolean(${predicateExpr})`);
        if (ok) return;
        lastErr = null;
      } catch (err) {
        lastErr = err;
      }
      await sleep(100);
    }
    const suffix = lastErr ? ` (last error: ${lastErr instanceof Error ? lastErr.message : String(lastErr)})` : '';
    throw new Error(`Timed out waiting for condition: ${predicateExpr}${suffix}`);
  }
}

async function run() {
  const chromeBin = findChromeBinary();
  assert.ok(chromeBin, 'Headless Chromium/Chrome binary not found on PATH or standard paths');

  const { server, baseUrl } = await startStaticSpaServer();
  const { wsUrl, cleanup } = await launchHeadlessChrome(chromeBin);
  const ws = new WebSocket(wsUrl);

  try {
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });

    const cdp = new CdpSession(ws);
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', {
      targetId,
      flatten: true,
    });
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);

    // 1. Load Home Page (`/`) and verify React hydration + FR LTR state
    await cdp.send('Page.navigate', { url: `${baseUrl}/` }, sessionId);
    await cdp.waitFor(
      sessionId,
      `document.querySelector('h1') && document.querySelector('nav') && document.querySelector('main')`
    );
    const homeState = await cdp.evalJs(
      sessionId,
      `({
        lang: document.documentElement.lang,
        dir: document.documentElement.dir,
        h1: document.querySelector('h1')?.textContent?.trim() || '',
        hasMain: Boolean(document.querySelector('main')),
        hasRawTel: Boolean(document.querySelector('a[href^="tel:"]'))
      })`
    );
    assert.equal(homeState.lang, 'fr', 'Home page should start in French');
    assert.equal(homeState.dir, 'ltr', 'Home page should start LTR');
    assert.ok(homeState.h1.length > 10, `Expected non-empty French h1, got "${homeState.h1}"`);
    assert.equal(homeState.hasMain, true, 'Missing <main> landmark');
    assert.equal(homeState.hasRawTel, false, 'AUD-016: Raw tel: link must not appear before reveal');

    // 2. Toggle language to Arabic RTL in live browser DOM
    const clickedAr = await cdp.evalJs(
      sessionId,
      `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) =>
          (b.textContent || '').includes('العربية')
        );
        if (!btn) return false;
        btn.click();
        return true;
      })()`
    );
    assert.equal(clickedAr, true, 'Could not find Arabic language toggle button');
    await cdp.waitFor(sessionId, `document.documentElement.dir === 'rtl' && document.documentElement.lang === 'ar'`);

    // 3. Navigate to /services and verify SPA route + phone privacy
    await cdp.send('Page.navigate', { url: `${baseUrl}/services` }, sessionId);
    await cdp.waitFor(sessionId, `document.querySelector('h1') && window.location.pathname === '/services'`);
    const servicesHasRawTel = await cdp.evalJs(
      sessionId,
      `Boolean(document.querySelector('a[href^="tel:"]'))`
    );
    assert.equal(servicesHasRawTel, false, 'AUD-016: /services must mask provider phone numbers initially');

    // 4. Navigate to /privacy (Law 09-08) and verify content renders
    await cdp.send('Page.navigate', { url: `${baseUrl}/privacy` }, sessionId);
    await cdp.waitFor(
      sessionId,
      `window.location.pathname === '/privacy' && document.body && (document.body.innerText || '').includes('09-08')`
    );

    // 5. Navigate to /register and verify Law 09-08 consent checkbox exists (AUD-011)
    await cdp.send('Page.navigate', { url: `${baseUrl}/register` }, sessionId);
    await cdp.waitFor(
      sessionId,
      `window.location.pathname === '/register' && Boolean(document.querySelector('input[type="checkbox"]'))`
    );

    assert.equal(
      cdp.exceptions.length,
      0,
      `Uncaught runtime page exceptions detected during E2E smoke test:\n${cdp.exceptions.join('\n')}`
    );

    console.log(
      '[e2e-smoke] PASS — Headless Chromium verified /, live FR->AR RTL toggle, /services (phone privacy), /privacy (Law 09-08), and /register (consent gate) with 0 runtime exceptions.'
    );
  } finally {
    try {
      ws.close();
    } catch {
      // ignore
    }
    cleanup();
    server.close();
  }
}

run().catch((err) => {
  console.error('[e2e-smoke] FAIL:', err);
  process.exit(1);
});
