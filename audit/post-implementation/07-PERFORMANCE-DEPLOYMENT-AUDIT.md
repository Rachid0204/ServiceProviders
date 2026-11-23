# 07 — PERFORMANCE, INTEGRATIONS & DEPLOYMENT READINESS AUDIT
**Project:** Moul L'Khedma (مول الخدمة)  
**Audit Date:** 2026-11-23  
**Production Target:** Vercel Static Edge CDN (`https://servicepro-one.vercel.app/`) + Firebase (`serviceproviders-530c4`)

---

## 1. Frontend Build & Bundle Size Analysis

Measured directly from `npm run build` (`vite build`) on `2026-11-23`:

| Asset File (`dist/assets/`) | Uncompressed Size | Gzipped Size | Loading Strategy | Assessment |
|---|---:|---:|---|---|
| `vendor-firebase-DAsvDaLw.js` | `607.18 KB` | `141.73 KB` | Eager vendor chunk (`manualChunks`) | Standard for Firebase Auth + Firestore + Storage SDKs; cached separately from app code. |
| `vendor-react-CPfbOMBu.js` | `271.21 KB` | `86.44 KB` | Eager vendor chunk (`manualChunks`) | React 19 + React DOM + React Router v7 + Lucide icons. |
| `index-Cq3VhoKy.js` | `215.13 KB` | `59.40 KB` | Eager entry chunk | Core shell, context providers, and public landing route. |
| `vendor-leaflet-oulNkMTi.js` | `149.40 KB` | `43.25 KB` | Lazy chunk (loaded only when map view is opened) | Well-isolated via `React.lazy`. |
| `AdminDashboardPage-BB2TRPpM.js` | `113.15 KB` | `26.59 KB` | Lazy route chunk (`/admin/*`) | Zero impact on customer/provider bundle size. |
| `ProviderDashboardPage-CYM5qyyC.js` | `78.90 KB` | `19.65 KB` | Lazy route chunk (`/provider/*`) | Loaded only for authenticated service providers. |
| `index-Nmg2QRLs.css` | `57.24 KB` | `9.82 KB` | Eager stylesheet | Tailwind CSS v4 compiled stylesheet. |
| `CustomerDashboardPage-D3YabvbG.js` | `34.10 KB` | `9.05 KB` | Lazy route chunk (`/customer/*`) | Loaded only for authenticated customers. |
| `ProfileSettingsPage-BSgxmRio.js` | `22.90 KB` | `5.86 KB` | Lazy route chunk (`/profile`) | Lazy-loaded. |
| `BookingModal-G_ueEDQ5.js` | `22.39 KB` | `6.14 KB` | Lazy modal chunk | Loaded on demand when a customer initiates a booking. |
| `BookingLifecycleModals-BJPNf98h.js` | `21.75 KB` | `5.62 KB` | Lazy modal chunk | Loaded on demand for review/reschedule/cancel/detail modals. |
| `MessagesInboxPage-DY6U-ykM.js` | `18.37 KB` | `5.25 KB` | Lazy route chunk (`/messages`) | Lazy-loaded. |
| `ProviderPublicProfilePage-BpW0_P5L.js` | `15.10 KB` | `4.03 KB` | Lazy route chunk (`/providers/:providerId`) | Lazy-loaded. |
| `PostJobModal-BxmhoyaD.js` | `15.05 KB` | `4.54 KB` | Lazy modal chunk | Lazy-loaded. |
| `DisputesPage-CkB5RLVA.js` | `9.45 KB` | `2.83 KB` | Lazy route chunk (`/disputes`) | Lazy-loaded. |
| `NotificationsPage-Db8q1GwE.js` | `7.38 KB` | `2.39 KB` | Lazy route chunk (`/notifications`) | Lazy-loaded. |

### 1.1 Asset Caching & Image Optimization
- **Long-Term Immutable Asset Caching:** Verified in `vercel.json` (lines 7–15): `/assets/(.*)` serves `Cache-Control: public, max-age=31536000, immutable`.
- **Static Images:** Category and hero images in `src/assets/images/` are compressed JPEGs (`43 KB` – `145 KB` each) and use `loading="lazy"` on below-the-fold cards.

---

## 2. Database Query & Listener Scalability Analysis (`AUD-019` — LOW)

| Hook / Component | Current Query Pattern | Scalability Bottleneck | Recommended Remediation |
|---|---|---|---|
| `src/hooks/useProviders.ts` (lines 171–215) | Subscribes on app mount to `query(collection(db, 'providers'), orderBy('rating', 'desc'), limit(200))` via `onSnapshot` for all visitors (including unauthenticated landing page visits). | At 200 providers, every page load incurs up to 200 Firestore document reads, and any single provider rating update pushes a real-time read to every connected browser. | Use `getDocs` with smaller page size (`limit(24)`) + server-side `where('city', '==', selectedCity)` / `where('verified', '==', true)` filters and cursor pagination (`startAfter`). |
| `src/hooks/useJobPosts.ts` (lines 214–247) | After receiving up to 50 open job posts via `onSnapshot`, loops over every job post and issues an individual `getDoc(doc(db, 'jobPosts', job.id, 'proposals', currentUser.uid))` (`N+1` queries). | Up to 50 additional serial/parallel `getDoc` reads per snapshot update for every logged-in provider. | Query a collection group `proposals` with `where('providerId', '==', currentUser.uid)` once, or store `submittedProposalJobIds` for the provider. |
| `src/hooks/useAdminData.ts` (lines 380–650) | Attaches 7 concurrent `onSnapshot` listeners (`providers`, `bookings`, `jobPosts`, `withdrawals`, `disputes`, `reports`, `adminAuditLogs`) immediately upon entering `/admin`. | High read amplification when an admin opens `/admin`, even if they only view one tab (e.g. `/admin/kyc`). | Scope real-time listeners to the active `section` parameter in `/admin/:section`. |
| `src/components/ProviderCard.tsx` & `ProviderPublicProfilePage.tsx` | Displays static fallback `responseMinutes: 20` (`Répond en ~20 min`). | Hardcoded response time metric rather than computed from actual proposal/message response latency. | Compute rolling average response time or remove static `"~20 min"` claim until measured. |

---

## 3. External Integrations Audit

| Integration | Implementation Location | Actual Integration Status | Production Readiness Verdict |
|---|---|---|---|
| **Firebase Authentication** | `src/firebase.ts`, `src/hooks/useMarketplaceAuth.ts` | **Live & Integrated** (Google OAuth popup + Email/Password + verification emails + password reset) | **Production-Ready** |
| **Cloud Firestore (Named DB)** | `src/firebase.ts` (`ai-studio-721fde67-a110-4e25-bcc2-2f011a526460`), `firestore.rules`, `firestore.indexes.json` | **Live & Integrated** (Auto-deployed via `.github/workflows/firebase-deploy.yml`) | **Conditionally Ready** (Requires fixes for `AUD-001` through `AUD-007`) |
| **Firebase Cloud Storage** | `src/firebase.ts`, `storage.rules` | **Live & Integrated** (`provider-kyc/{uid}`, `bookings/{uid}`, `reviews/{uid}`, `chats/{bookingId}/{uid}`) | **Conditionally Ready** (`storage.rules` excluded from CI auto-deploy — `AUD-012`) |
| **Firebase App Check (reCAPTCHA v3)** | `src/firebase.ts` (lines 86–99) | **Optional / Unenforced** (Initializes only if `VITE_FIREBASE_RECAPTCHA_SITE_KEY` is set; not enforced in Firebase Console) | **Partially Configured (`AUD-016`)** |
| **Cash on Completion + Bilingual Receipt** | `src/services/paymentsAdapter.ts`, `src/services/receiptGenerator.ts` | **Live & Integrated** (0% default commission, client/provider status lifecycle, print/PDF HTML receipt) | **Conditionally Ready** (Must exclude cash bookings from platform withdrawal balance — `AUD-001`) |
| **CMI / Payzone Card Escrow Gateway** | `src/services/paymentsAdapter.ts`, `server.ts` (`/api/payments/cmi-intent` returns `501`), `firestore.rules` | **Simulated / Disabled in UI, Open in Rules** (`cmi_card` and `payzone_card` have `isLive: false` in adapter, but `firestore.rules` still allows `paymentMethod: 'cmi_escrow'`) | **NOT Production-Ready (`AUD-002`)** |
| **WhatsApp Deep-Link Fallback** | `src/utils/marketplaceUtils.ts` (`buildWhatsAppUrl`) | **Live Client Link Integration** (`https://wa.me/...` with pre-filled bilingual service message) | **Production-Ready** |
| **OpenStreetMap / Leaflet Map** | `src/components/MoroccanMap.tsx` | **Live & Integrated** (Uses `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` with neighborhood jitter coordinates) | **Production-Ready** |

---

## 4. Deployment, CI/CD, Monitoring & Disaster Recovery Audit

### 4.1 CI/CD Pipelines
1. **`.github/workflows/ci.yml` (Quality Gate):**
   - Triggers on push to `main` and all pull requests.
   - Runs `npm ci`, `npm run lint`, `node scripts/check-i18n.mjs`, `npm run lint:rules`, `npm test`, and `npm run build`.
2. **`.github/workflows/firebase-deploy.yml` (Database Rules & Indexes Auto-Deploy):**
   - Triggers on push to `main` touching `firestore.rules`, `firestore.indexes.json`, or `firebase.json`.
   - Authenticates with `FIREBASE_SERVICE_ACCOUNT` and runs `npx firebase-tools deploy --only firestore:rules,firestore:indexes --project serviceproviders-530c4`.
   - **Gap (`AUD-012` — MEDIUM):** `storage.rules` is excluded from `--only` because the service account currently lacks `roles/firebasestorage.admin`.

### 4.2 Vercel vs. `server.ts` Mismatch (`AUD-014` — MEDIUM)
- `vercel.json` deploys the repository as a static Vite SPA (`outputDirectory: "dist"`).
- `server.ts` and `serverAuth.ts` are compiled by `npm run build:server` into `dist-server/server.mjs`, which is never executed by Vercel.
- Either `server.ts` should be retired (since the app operates 100% serverless against Firebase) or converted into Vercel Serverless Functions under `api/` when a real CMI/Payzone merchant webhook is integrated.

### 4.3 Security Headers & SEO Files
- **HTTP Security Headers (`vercel.json` lines 17–41):**
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=()`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- **SEO Configuration (`public/robots.txt`, `public/sitemap.xml`):**
  - `public/robots.txt` allows public pages and disallows private paths (`/admin`, `/customer`, `/provider`, `/dashboard`, `/profile`, `/messages`, `/notifications`, `/disputes`, `/verify-email`).
  - `public/sitemap.xml` lists all 12 service category slugs and 6 major Moroccan city landing pages.

### 4.4 Backup, Rollback & Error Monitoring Assessment
- **Error Tracking / APM:** Currently logs errors only to `console.error` / `console.warn` in browser devtools. No external error tracker (e.g., Sentry or Firebase Crashlytics/Performance Monitoring) is configured.
- **Database Backups (PITR):** Firestore Point-in-Time Recovery (PITR) and automated daily GCS exports are managed in Google Cloud Console and are not codified in repository IaC. Before onboarding real users, enable 7-day PITR on named database `ai-studio-721fde67-a110-4e25-bcc2-2f011a526460`.
