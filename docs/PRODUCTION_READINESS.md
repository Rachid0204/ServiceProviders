# Production Readiness & Launch Checklist — Moul L'Khedma (مول الخدمة)

This checklist documents the verified security, infrastructure, localization, and operational controls completed across Phases 1–7 for `https://servicepro-one.vercel.app/` (Firebase project `serviceproviders-530c4`, named Firestore DB `ai-studio-721fde67-a110-4e25-bcc2-2f011a526460`).

---

## 1. Automated Verification Gates (CI Enforced via `.github/workflows/ci.yml`)
- [x] **TypeScript strict typecheck:** `npm run lint` (`tsc --noEmit`) — 0 errors.
- [x] **100% Bilingual FR/AR parity:** `node scripts/check-i18n.mjs` + Arabic RTL Vitest suite (`src/tests/productionReadiness.test.tsx`).
- [x] **Firestore Security Rules lint:** `npm run lint:rules` (`eslint firestore.rules`) — 0 errors.
- [x] **Production bundle & lazy code-splitting:** `npm run build` + `buildConfig.test.ts` confirming zero upfront `modulepreload` for lazy routes, dashboards, modals, and Leaflet map.
- [x] **Automated test suite:** `npm test` (unit, domain, payments, rules policy, routing guards, and Arabic RTL QA).

---

## 2. Firebase & Cloud Deployment Status
- [x] **Firestore Rules & Composite Indexes Auto-Deploy:** `.github/workflows/firebase-deploy.yml` automatically deploys `firestore.rules` and `firestore.indexes.json` to named database `ai-studio-721fde67-a110-4e25-bcc2-2f011a526460` on merges to `main`.
- [ ] **Firebase Storage Rules (Console Publish):** Copy/publish the latest `storage.rules` in **Firebase Console → Storage → Rules** (covers `/providers`, `/users`, `/bookings`, `/chats`, `/jobPosts`, strictly private `/providerDocuments`, `/reviews`, and `/disputes`), or grant `roles/firebasestorage.admin` to the CI service account to enable automated Storage deploys.
- [ ] **Firebase App Check (Recommended):** Configure `VITE_FIREBASE_RECAPTCHA_SITE_KEY` in Vercel environment variables and enforce App Check in Firebase Console (Auth, Firestore, Storage) to block automated scraping/abuse.
- [ ] **Admin Custom Claims & Bootstrapping:** Verify production admin UIDs exist in `/admins/{uid}` or carry signed custom claim `{ admin: true }`.

---

## 3. Commercial, Legal & Security Compliance (Morocco)
- [x] **0% Default Launch Commission:** `DEFAULT_SYSTEM_SETTINGS.platformFeePct` defaults to `0` (`src/utils/systemSettings.ts`); configurable anytime via `/admin/settings` with immutable `/adminLogs` audit trails.
- [x] **No Browser-Simulated Escrow:** Live checkout uses **Cash on Completion (`cash_on_completion`)** with bilingual downloadable receipts (`src/utils/paymentsAdapter.ts`). Online CMI Card / Bank Transfer remain disabled until certified server-side HMAC webhook endpoints are provisioned; `/payments` and `/refunds` collections are strictly Admin/server-write-only in `firestore.rules`.
- [x] **Moroccan Law 09-08 / CNDP Compliance:**
  - Dedicated `/terms` and `/privacy` pages + mandatory registration consent checkbox (`termsAcceptedAt`).
  - Strictly private KYC document storage (`/providerDocuments/{uid}`) with mandatory `document_viewed` audit logs every time an Admin inspects CIN/diploma documents in `/admin/kyc`.
  - Marketing notifications opt-out by default (`marketingUpdates: false`).
- [x] **HTTP Security Headers & SEO:** `vercel.json` enforces HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and `Permissions-Policy`. `public/robots.txt` blocks private routes while `public/sitemap.xml` indexes all 12 service categories and legal pages.
