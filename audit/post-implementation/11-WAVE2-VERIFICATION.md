# 11 — WAVE 2 REMEDIATION & VERIFICATION REPORT
**Project:** Moul L'Khedma (مول الخدمة)  
**Repository:** `Rachid0204/ServiceProviders`  
**Branch:** `fix/audit-wave2-compliance-privacy` (branched from `main` @ `fd0d4cc`)  
**Date:** 2026-11-23  
**Authoritative Worklist:** `audit/post-implementation/08-MASTER-REMEDIATION-WORKLIST.md`  
**Scope:** Wave 2 findings (`AUD-011`, `AUD-012`, `AUD-013`, `AUD-016`) only. No Wave 3 / Wave 4 scope expansion, no production merge, no Firebase deployment, and no production secret/configuration edits.

---

## 1. Wave 2 Finding-by-Finding Status

| ID | Authoritative Worklist Title | Severity | Wave 2 Status | Evidence & Notes |
|---|---|---|---|---|
| `AUD-011` | Law 09-08 `termsAcceptedAt` Consent Timestamp Never Persisted to `/users/{uid}` | **MEDIUM** | **RESOLVED** | Initial `/users/{uid}` creation now stamps `termsAcceptedAt: serverTimestamp()` across `handleSaveProfile`, `saveFullProviderCard` (via `preserveProtectedUserFields`), `submitBooking`, and `createJobPost`. `firestore.rules` enforces `incoming().termsAcceptedAt == request.time` on create; `AuthModal` (signup mode) now requires explicit Terms & Law 09-08 consent checkbox matching `RegisterPage`. Existing-user updates preserve `termsAcceptedAt` (or omit when absent on legacy profiles) without breaking `AUD-004`. |
| `AUD-012` | `storage.rules` Excluded from GitHub Actions Firebase Auto-Deploy Pipeline | **MEDIUM** | **VERIFIED COMPLETE** | Verified live in `.github/workflows/firebase-deploy.yml` (`paths` watches `'storage.rules'`, default target `'firestore,storage'`) and confirmed released in production CI Run `45158161870` on `main` (`fd0d4cc`: `✔ storage: released rules storage.rules to firebase.storage`). Added permanent CI/config regression check in `buildConfig.test.ts`. |
| `AUD-013` | Accepting a Proposal Does Not Auto-Close Competing Pending Proposals | **MEDIUM** | **RESOLVED** | `acceptProposalAndCreateBooking` in `src/hooks/useJobPosts.ts` now queries remaining `'pending'` proposals on `jobPosts/{jobId}/proposals`, filters competing quotes via `selectCompetingPendingProposals`, commits a `writeBatch` setting `status: 'rejected'`, and dispatches `'quote_rejected'` notifications. `firestore.rules` strengthened with `get(...) == 'open'` + `getAfter(...) == 'assigned'` + `assignedProviderId == existing().providerId` on `'accepted'` transitions while permitting post-assignment `'rejected'` cleanup. |
| `AUD-016` | Public Unauthenticated Scraping of Provider Phone Numbers & Unenforced Firebase App Check | **MEDIUM** | **PARTIALLY RESOLVED** *(Code & UI Complete; Owner Production Console Step Pending)* | Raw provider phone numbers, `tel:`, and `https://wa.me/` links are removed from initial public DOM on `ProviderCard`, `ProviderPublicProfilePage`, and `ProviderDetailModal`, replaced with click-to-reveal masked phone buttons (`maskMoroccanPhone`, e.g., `+212 6•• ••• •10`). `src/firebase.ts` exports `appCheckStatus` diagnostics and logs a production warning if `VITE_FIREBASE_RECAPTCHA_SITE_KEY` is absent; `AdminSettingsSection` displays a read-only Firebase App Check readiness indicator. **Owner console action required:** provision `VITE_FIREBASE_RECAPTCHA_SITE_KEY` in Vercel Production env vars and enable App Check Enforcement in Firebase Console (`serviceproviders-530c4`). |

---

## 2. Changed Files Summary

| File | Finding(s) | Change Summary |
|---|---|---|
| `firestore.rules` | `AUD-011`, `AUD-013` | Enforce `incoming().termsAcceptedAt == request.time` on `/users/{uid}` create; require atomic parent job transition (`open` → `assigned`, matching `assignedProviderId`) via `get`/`getAfter` when accepting a proposal while allowing post-assignment `'rejected'` cleanup on competing pending proposals. |
| `src/utils/authHelpers.ts` | `AUD-011` | Added `persistTermsAcceptedIntent`, `hasPendingTermsAcceptedIntent`, `clearTermsAcceptedIntent` and updated `preserveProtectedUserFields` to stamp `termsAcceptedAt` on initial user creation while preserving/omitting it safely on existing user updates. |
| `src/pages/auth/RegisterPage.tsx` | `AUD-011` | Record pending Law 09-08 consent intent via `persistTermsAcceptedIntent()` upon validated email/Google registration. |
| `src/components/AuthModal.tsx` | `AUD-011` | Added required Law 09-08 / CGU consent checkbox (with `/terms` and `/privacy` links) in `signup` mode and blocked email/Google signup submission until checked. |
| `src/hooks/useMarketplaceAuth.ts` | `AUD-011` | Clear pending consent intent after successful `/users/{uid}` persistence in `handleSaveProfile` and `saveFullProviderCard`. |
| `src/hooks/useBookings.ts` | `AUD-011` | Stamp `termsAcceptedAt: serverTimestamp()` when bootstrapping a new `/users/{uid}` profile during direct booking creation. |
| `src/hooks/useJobPosts.ts` | `AUD-011`, `AUD-013` | Stamp `termsAcceptedAt: serverTimestamp()` on client profile bootstrap; query competing pending proposals after `acceptProposalAndCreateBooking` commits, batch-update them to `'rejected'`, and dispatch `'quote_rejected'` notifications. |
| `src/utils/marketplace.ts` | `AUD-013`, `AUD-016` | Added `selectCompetingPendingProposals` and `maskMoroccanPhone` (`+212 6•• ••• •10`). |
| `src/components/ProviderCard.tsx` | `AUD-016` | Replaced always-exposed `tel:`/`wa.me/` links with click-to-reveal masked phone button (`data-testid="reveal-provider-phone-btn"`). |
| `src/pages/public/ProviderPublicProfilePage.tsx` | `AUD-016` | Masked public provider phone behind click-to-reveal button; raw `tel:`/`wa.me/` links only materialize after explicit user click. |
| `src/components/ProviderDetailModal.tsx` | `AUD-016` | Masked public provider phone in modal sticky footer behind click-to-reveal button. |
| `src/firebase.ts` | `AUD-016` | Exported `appCheckStatus` (`configured`, `active`, `siteKeyPresent`, `error`) and added production warning when `VITE_FIREBASE_RECAPTCHA_SITE_KEY` is missing. |
| `src/components/admin/AdminUsersReviewsSection.tsx` | `AUD-016` | Added read-only Firebase App Check readiness indicator (`data-testid="admin-app-check-status"`) inside `AdminSettingsSection`. |
| `src/utils/authHelpers.test.ts` | `AUD-011` | Unit tests for `preserveProtectedUserFields` initial `termsAcceptedAt` stamping and session consent helpers. |
| `src/utils/marketplace.test.ts` | `AUD-013`, `AUD-016` | Unit tests for `selectCompetingPendingProposals` and `maskMoroccanPhone`. |
| `buildConfig.test.ts` | `AUD-012` | Regression test verifying `.github/workflows/firebase-deploy.yml` watches `storage.rules` and deploys `firestore,storage`. |
| `firestore.rules.test.ts` | `AUD-011`, `AUD-013` | Live Firebase Firestore Emulator tests asserting serverTimestamp `termsAcceptedAt` create (200) vs forged timestamp (403), standalone proposal accept blocked (403), atomic accept batch (200), post-assignment second accept blocked (403), and post-assignment competing proposal rejection (200). |
| `src/tests/productionReadiness.test.tsx` | `AUD-011`, `AUD-013`, `AUD-016` | Vitest tests for `AuthModal` signup consent gate, `useJobPosts().acceptProposalAndCreateBooking` competing quote auto-rejection + notifications, `ProviderCard` masked click-to-reveal privacy, and `AdminSettingsSection` App Check banner. |

---

## 3. Executed Verification Suite (All Passed)

| Command | Result | Details |
|---|---|---|
| `npm run lint` | **PASS** | `tsc --noEmit` — 0 TypeScript errors |
| `npm run lint:rules` | **PASS** | `eslint firestore.rules` — 0 rule syntax errors |
| `node scripts/check-i18n.mjs` | **PASS** | 249 FR keys and 249 AR keys with 100% bilingual parity |
| `npm run build` | **PASS** | Vite production bundle built cleanly to `dist/` |
| `npm run test:unit` | **PASS** | **75 / 75 passed (0 failed, 0 skipped)** — includes live Firebase Firestore Emulator (`cloud-firestore-emulator-v1.19.8.jar`) |
| `npm run test:routes` | **PASS** | **33 / 33 passed (2 files)** — Vitest routing, RTL, and Wave 2 component/hook tests |
| `npm audit --audit-level=high` | **PASS** | **0 vulnerabilities** |

---

## 4. Remaining Deferred / Owner-Console Items (Not Modified in Wave 2)

1. **`AUD-016` (Owner Production Console Action):** Provision a Google reCAPTCHA v3 site key in `VITE_FIREBASE_RECAPTCHA_SITE_KEY` on Vercel Production, register it under Firebase Console → App Check (`serviceproviders-530c4`), verify metrics, and enable Firestore & Storage Enforcement. Note: Public directory documents in `/providers/{uid}` still include `phone` for authenticated/click-to-reveal convenience until a future Cloud Function or separate contact-reveal subcollection is introduced if stricter API-level scrubbing is desired alongside App Check enforcement.
2. **`AUD-010` (Residual — Deferred):** Bootstrap administrator email fallback remains in `firestore.rules` / `storage.rules` until an approved claims/role-only admin migration plan is executed.
3. **Wave 3 & Wave 4 (Unchanged, Deferred):** `AUD-014` (component modularization & legacy modal/server cleanup), `AUD-017` (i18n consolidation), `AUD-018` (active-booking role downgrade guard), `AUD-019` (paginated provider directory & batch proposal lookups), `AUD-020` (modal focus trap & `Africa/Casablanca` formatting), `AUD-021` (Playwright browser E2E — live Firestore Emulator rules tests are already active in CI).
