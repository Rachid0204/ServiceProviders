# 09 — PRODUCTION GO / NO-GO CHECKLIST & SCORECARD
**Project:** Moul L'Khedma (مول الخدمة)  
**Audit Date:** 2026-11-23  
**Final Readiness Decision:** **CONDITIONALLY READY** (**Weighted Score: `73.6 / 100`**)

---

## 1. Itemized Go / No-Go Checklist

Every check below is evaluated with concrete evidence from the repository and executed verification suite:

| # | Production Readiness Criterion | Status | Concrete Evidence |
|---|---|---|---|
| 1 | **All routes work without router errors** | **PASS** | Single `BrowserRouter` in `src/main.tsx`; all 29 routes in `src/app/AppRoutes.tsx` and deep-link rewrites in `vercel.json` verified across `27` Vitest tests (`src/tests/routing.test.tsx`, `src/tests/productionReadiness.test.tsx`). |
| 2 | **All roles have proper permissions** | **FAIL (`AUD-003`)** | Role guards (`RequireRole`, `RequireAdmin`) and Firestore collection rules separate `client`, `provider`, and `admin`, **but** `accountStatus: 'suspended'` is not checked in `firestore.rules` (`isVerifiedUser()`) or `RouteGuards.tsx`. |
| 3 | **Customer onboarding and service request flow works end to end** | **PASS (With Caveat `AUD-004`, `AUD-015`)** | Registration, email verification, job posting (`PostJobModal`), and quote acceptance (`acceptProposalAndCreateBooking`) work end-to-end, though saving `/profile` fails if `accountStatus` or `termsAcceptedAt` exists (`AUD-004`) and `BookingModal` shows a demo photo button (`AUD-015`). |
| 4 | **Provider onboarding and verification works end to end** | **PASS (With Caveat `AUD-004`, `AUD-012`)** | Private KYC upload (`provider-kyc/{uid}` + `/providerDocuments/{uid}`), CNDP-audited admin reveal (`document_viewed`), approval/rejection, and re-upload work end-to-end. Requires fixing `saveFullProviderCard` field whitelist (`AUD-004`) and adding `storage.rules` to CI (`AUD-012`). |
| 5 | **Identity documents are private and securely handled** | **PASS** | `/providerDocuments/{uid}` (`firestore.rules` L1822–1847) and `provider-kyc/{userId}/{allPaths=**}` (`storage.rules` L45–59) restrict access strictly to owner + admin, enforce 5 MB image/PDF limits, and log every admin reveal to `/adminAuditLogs`. |
| 6 | **Service discovery uses real database data** | **PASS** | `src/hooks/useProviders.ts` queries real Firestore `/providers` documents and gates `VETTED_PROVIDERS` strictly behind `import.meta.env.DEV` (L190, L209). Production builds show an honest empty state if 0 providers match. |
| 7 | **Quotations, bookings, and statuses remain synchronized** | **FAIL (`AUD-006`, `AUD-007`, `AUD-013`)** | Quote acceptance atomically locks the slot and creates a booking, **but** direct bookings bypass `/scheduleLocks`, cancelling a booking leaves `/scheduleLocks/{lockId}` permanently orphaned (`AUD-006`), and withdrawing a proposal permanently blocks re-quoting (`AUD-007`). |
| 8 | **Messaging and notifications are isolated and reliable** | **FAIL (`AUD-005`, `AUD-008`)** | `/messages` inbox (`MessagesInboxPage.tsx`) is participant-isolated, **but** booking cards open legacy `ChatDrawerModal.tsx` which bypasses `/conversations` and `/notifications` (`AUD-008`), and `firestore.rules` allows cross-user notification spoofing (`AUD-005`). |
| 9 | **Payment method claims match real integration capabilities** | **FAIL (`AUD-001`, `AUD-002`)** | `paymentsAdapter.ts` disables CMI/Payzone (`isLive: false`), **but** `firestore.rules` still allows client-created `paymentMethod: 'cmi_escrow'` bookings (`AUD-002`), and `/provider/earnings` counts completed `cash_on_completion` jobs as withdrawable platform balance (`AUD-001`). |
| 10 | **Reviews cannot be forged or duplicated** | **PASS** | Deterministic review ID `/bookings/{bookingId}/reviews/main` (`firestore.rules` L899–951) enforces `booking.status == 'completed'`, `booking.clientId == request.auth.uid`, `!booking.reviewed`, and atomic `1..5` integer rating updates. |
| 11 | **Admin moderation and audit logging work** | **PASS** | All 9 `/admin/:section` sub-routes work, `/adminAuditLogs` is strictly append-only (`allow update, delete: if false`), and KYC reveal/approve/reject, dispute resolution, report moderation, and user suspension write immutable audit logs. |
| 12 | **No critical or high security vulnerabilities remain** | **FAIL (`AUD-001`–`AUD-010`)** | `2 CRITICAL` and `8 HIGH` findings remain open, including 4 High `npm audit` entries in `@grpc/grpc-js < 1.13.6` (`AUD-009`). |
| 13 | **No mock data or demo fallbacks leak into production** | **FAIL (`AUD-010`, `AUD-015`)** | `VETTED_PROVIDERS` is properly isolated to `import.meta.env.DEV`, **but** hardcoded placeholder phone numbers (`+212661428910`, `+212661000000`) exist in data normalizers (`AUD-010`), and a demo sample photo button (`"Joindre photo chantier témoin"`) is visible in `BookingModal.tsx` (`AUD-015`). |
| 14 | **Automated build, typecheck, and tests pass** | **PASS** | `npm run lint` (`0` errors), `node scripts/check-i18n.mjs` (`OK`), `npm run lint:rules` (`0` errors), `npm run build` (`6.84s`), and `npm test` (`94/94` tests passing) all executed and verified. |
| 15 | **Environment variables, backups, and monitoring are configured** | **BLOCKED (`AUD-012`, `AUD-016`)** | `.github/workflows/firebase-deploy.yml` auto-deploys Firestore rules & indexes, **but** `storage.rules` is excluded (`AUD-012`), Firebase App Check (`VITE_FIREBASE_RECAPTCHA_SITE_KEY`) is not yet enforced (`AUD-016`), and Firestore PITR backup + external error monitoring (Sentry) must be enabled in cloud consoles. |

---

## 2. Final Audit Scorecard (0–100 Scale)

| # | Audit Category | Score (0–100) | Weight | Weighted Contribution | Scoring Rationale |
|---|---|:---:|:---:|:---:|---|
| 1 | **Architecture & Code Quality** | **76 / 100** | 10% | `7.60` | Clean React Router v7 + domain hook architecture and strict TypeScript (`0` errors), offset by dead `server.ts`, duplicate legacy modals (`ChatDrawerModal`, `ProviderDetailModal`), and oversized `ProviderDashboard.tsx` (`2,512` lines) (`AUD-014`). |
| 2 | **Routing & Navigation Stability** | **95 / 100** | 8% | `7.60` | Single `BrowserRouter`, 29 verified routes, role/email/auth guards, `?redirect=` preservation, and SPA rewrite rules work cleanly; only missing `accountStatus === 'suspended'` guard check (`AUD-003`). |
| 3 | **Functional Completeness** | **74 / 100** | 15% | `11.10` | All 12 modules are implemented with real Firestore persistence, but edge-case bugs exist in profile saving (`AUD-004`), direct-booking/cancelled slot locks (`AUD-006`), withdrawn quote revision (`AUD-007`), and drawer chat sync (`AUD-008`). |
| 4 | **Security & Access Control** | **64 / 100** | 15% | `9.60` | Private KYC vault, append-only audit logs, and HTTP security headers are strong, but degraded by unenforced account suspension (`AUD-003`), cross-user notification spoofing (`AUD-005`), `cmi_escrow` rules bypass (`AUD-002`), and `@grpc/grpc-js` CVEs (`AUD-009`). |
| 5 | **Database & Data Integrity** | **72 / 100** | 10% | `7.20` | 17 collections + 17 composite indexes and atomic review/KYC/dispute batches, offset by `/users/{uid}` `{ merge: false }` contract mismatch (`AUD-004`), orphaned `/scheduleLocks` on cancel (`AUD-006`), and hardcoded phone fallbacks (`AUD-010`). |
| 6 | **Payments & Financial Integrity** | **48 / 100** | 12% | `5.76` | Cash on Completion and 0% commission receipts work, **but** counting cash jobs inside platform withdrawable earnings (`AUD-001`) and leaving `cmi_escrow` open in `firestore.rules` (`AUD-002`) are Critical financial defects. |
| 7 | **UX/UI & Accessibility** | **82 / 100** | 8% | `6.56` | Polished responsive Tailwind UI, clear role workspaces, and CNDP blur/reveal UX; minor deductions for `BookingModal` demo photo button (`AUD-015`) and missing modal focus trapping (`AUD-020`). |
| 8 | **Moroccan Localization (FR/AR/RTL/MAD)** | **84 / 100** | 6% | `5.04` | Authentic Moroccan cities/quartiers, MAD currency, Moroccan phone regex, Cairo Arabic font, and verified RTL layout; deductions for ~60% inline `isAr` strings outside `translations.ts` (`AUD-017`) and UTC date slicing (`AUD-020`). |
| 9 | **Performance & Scalability** | **78 / 100** | 6% | `4.68` | Fast Vite code-splitting (`15` lazy chunks) and immutable CDN asset caching, offset by global `limit(200)` provider `onSnapshot` listener and N+1 proposal `getDoc` checks (`AUD-019`). |
| 10 | **Automated Testing & QA Coverage** | **75 / 100** | 5% | `3.75` | `94/94` unit, policy, build, routing, and RTL tests pass in CI (`.github/workflows/ci.yml`), but `firestore.rules.test.ts` uses static text assertions rather than live Firebase Emulator execution (`AUD-021`). |
| 11 | **Deployment & Operational Readiness** | **74 / 100** | 5% | `3.70` | Automated Firestore rules/indexes deploy workflow, HSTS/CSP-lite headers, `sitemap.xml`, and `robots.txt` are in place; `storage.rules` auto-deploy (`AUD-012`), App Check enforcement (`AUD-016`), and Sentry/PITR remain pending. |
| | **OVERALL PRODUCTION READINESS** | **`73.6 / 100`** | **100%** | **`73.60`** | **Verdict: `CONDITIONALLY READY` (Launch Cash-Only Pilot after completing Wave 0 & Wave 1 fixes)** |
