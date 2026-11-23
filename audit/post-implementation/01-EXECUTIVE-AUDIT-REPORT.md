# 01 — EXECUTIVE AUDIT REPORT
## Project: Moul L'Khedma (مول الخدمة) — Moroccan Service-Provider Marketplace
**Audit Date:** 2026-11-22  
**Audited Repository:** `Rachid0204/ServiceProviders`  
**Audited Commit / Branch State:** `feat/phase7-production-qa-audit` (`272ba0d`, PR #13 open against `main` @ `e662091`)  
**Live Frontend Deployment:** `https://servicepro-one.vercel.app/` (Vercel Static SPA)  
**Firebase Project:** `serviceproviders-530c4` (Named Firestore DB: `ai-studio-721fde67-a110-4e25-bcc2-2f011a526460`, Storage Bucket: `serviceproviders-530c4.firebasestorage.app`)  
**Audit Mode:** Strictly Read-Only Post-Implementation Assessment (Zero application source code or production data modified)

---

## 1. Overall Platform Status & Production-Readiness Verdict

| Metric | Result |
| :--- | :--- |
| **Overall Weighted Score** | **73.6 / 100** |
| **Final Production-Readiness Verdict** | **CONDITIONALLY READY (Not Ready for Unsupervised Financial / Escrow Operations; Conditionally Ready for Cash-on-Completion Beta after Wave 0 Fixes)** |
| **CRITICAL Issues** | **2** |
| **HIGH Issues** | **8** |
| **MEDIUM Issues** | **7** |
| **LOW Issues** | **4** |
| **Blocked / Unverified External Checks** | **4** |

### Executive Verdict Explanation
Across Phases 1–7 (PRs #1–#13), **Moul L'Khedma** evolved from a single-file prototype into a feature-rich, bilingual (French LTR + Arabic RTL) React 19 + Firebase marketplace with centralized `react-router-dom` v7 routing, 12 Moroccan trade categories, itemized quotations, real-time messaging, in-app notifications, structured disputes, private KYC document workflows, and a multi-section administration portal. All **94 automated tests** (`67` Node unit/policy tests + `27` Vitest routing/RTL tests), TypeScript strict checks (`tsc --noEmit`), FR/AR i18n parity checks, and Firestore rules lint checks pass.

However, an independent end-to-end technical and security audit reveals that **implementation completion does not yet equal full production readiness**:

1. **Pure Browser-to-Firebase Architecture on Vercel:** The live deployment on Vercel (`vercel.json`) builds and serves only the static Vite SPA (`dist/`). The Express backend ([`server.ts`](file:///home/antigravity/Rachid0204/ServiceProviders/server.ts)) is **not deployed on Vercel**. Every production read, write, notification dispatch, and financial calculation executes directly from the client browser against Firestore and Storage.
2. **Two Critical Financial & Security Flaws (`AUD-001`, `AUD-002`):**
   - **Unbounded Withdrawal Requests & COD Balance Inflation (`AUD-001` — CRITICAL):** In [`ProviderDashboard.tsx`](file:///home/antigravity/Rachid0204/ServiceProviders/src/components/dashboards/ProviderDashboard.tsx#L391-L423) and [`firestore.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/firestore.rules#L969-L995), Cash-on-Completion (`cash_on_completion`) bookings — where the customer pays the Maâlem directly in cash — are added into `settledEarningsMad`, and neither the client nor `firestore.rules` enforces that a withdrawal request (`amountMad` up to `100,000 MAD`) is backed by actual platform-held funds.
   - **Residual Client-Mutated Simulated Escrow in Firestore Rules (`AUD-002` — CRITICAL):** While [`BookingModal.tsx`](file:///home/antigravity/Rachid0204/ServiceProviders/src/components/BookingModal.tsx#L768-L786) disables the CMI button in the UI, [`firestore.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/firestore.rules#L747-L784) still permits any authenticated client using the Firebase JS SDK to create a booking with `paymentMethod == 'cmi_escrow'` and `paymentStatus == 'escrow_held'` and subsequently transition `paymentStatus` to `'paid'` with zero payment gateway verification.

---

## 2. Audit Scope & Methodology

This audit inspected **100% of the repository** (`22,486` lines across `src/`, [`firestore.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/firestore.rules), [`storage.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/storage.rules), [`firestore.indexes.json`](file:///home/antigravity/Rachid0204/ServiceProviders/firestore.indexes.json), [`server.ts`](file:///home/antigravity/Rachid0204/ServiceProviders/server.ts), [`serverAuth.ts`](file:///home/antigravity/Rachid0204/ServiceProviders/serverAuth.ts), [`vercel.json`](file:///home/antigravity/Rachid0204/ServiceProviders/vercel.json), and `.github/workflows/`):
- Executed static typechecking (`npm run lint`), i18n dictionary parity (`node scripts/check-i18n.mjs`), security rules linting (`npm run lint:rules`), production builds (`npm run build`), bundle analysis (`dist/assets/`), unit/policy/component test suites (`npm test`), and dependency vulnerability scanning (`npm audit --json`).
- Cross-checked every Firestore write payload in `src/hooks/*.ts` and `src/components/**/*.tsx` line-by-line against the 36 validation blueprints and match blocks in [`firestore.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/firestore.rules) (`2,059` lines) and [`storage.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/storage.rules) (`119` lines).

---

## 3. Architecture Summary

| Layer | Actual Implementation | Audit Assessment |
| :--- | :--- | :--- |
| **Frontend SPA** | React `19.0.1`, TypeScript `7.0.2` (`strict: true`), Vite `8.3.0` (Rolldown), Tailwind CSS `4.3.3`, `react-router-dom` `7.18.6`, `leaflet` `1.9.4` | Clean single-router foundation (`BrowserRouter` mounted once in [`src/main.tsx`](file:///home/antigravity/Rachid0204/ServiceProviders/src/main.tsx)) with lazy route & modal code-splitting. Several dashboard files remain oversized (`ProviderDashboard.tsx` at 2,512 LOC). |
| **Backend / API** | [`server.ts`](file:///home/antigravity/Rachid0204/ServiceProviders/server.ts) (Express `4.21.2`) + [`serverAuth.ts`](file:///home/antigravity/Rachid0204/ServiceProviders/serverAuth.ts) (custom RS256 JWT verifier) | **Unused in Vercel production.** Only runs in local dev or if separately deployed to Cloud Run. `/api/providers` serves static `VETTED_PROVIDERS`; `/api/payments/cmi-intent` returns `HTTP 501`. |
| **Database** | Cloud Firestore named DB `ai-studio-721fde67-a110-4e25-bcc2-2f011a526460` (17 collections/subcollections) + 17 composite indexes in [`firestore.indexes.json`](file:///home/antigravity/Rachid0204/ServiceProviders/firestore.indexes.json) | Strong schema validation in [`firestore.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/firestore.rules), but contains specific contract mismatches on profile updates, notification spoofing, schedule locks, and withdrawal bounds. |
| **File Storage** | Firebase Storage (`serviceproviders-530c4.firebasestorage.app`) governed by [`storage.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/storage.rules) | Private `/providerDocuments` and `/disputes` rules are well-structured, but `storage.rules` is excluded from GitHub Actions auto-deploy (`firebase-deploy.yml`) and relies on manual Console publishing. |
| **Authentication** | Firebase Auth (Google OAuth popup + redirect fallback, Email/Password signup/login/reset, Email verification polling) | Solid session isolation and email verification gating; lacks enforcement of `accountStatus == 'suspended'` and lacks Firebase Phone OTP verification. |

---

## 4. Major Findings & Critical Risks

### CRITICAL Severity
- **`AUD-001` (CRITICAL — Payments / Financial Integrity):** Providers can submit arbitrary bank withdrawal requests (`/withdrawals/{withdrawalId}`) up to `100,000 MAD` without any balance check in [`ProviderDashboard.tsx`](file:///home/antigravity/Rachid0204/ServiceProviders/src/components/dashboards/ProviderDashboard.tsx#L740-L812) or [`firestore.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/firestore.rules#L969-L995), and Cash-on-Completion (`cash_on_completion`) bookings are erroneously counted in `settledEarningsMad` ([`ProviderDashboard.tsx`](file:///home/antigravity/Rachid0204/ServiceProviders/src/components/dashboards/ProviderDashboard.tsx#L403-L409)).
- **`AUD-002` (CRITICAL — Payments / Security):** [`firestore.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/firestore.rules#L747-L784) still permits client-side creation and client-side settlement (`escrow_held` → `paid`) of simulated `cmi_escrow` bookings, and Admin/Customer modals still expose simulated CMI escrow release/refund controls despite no payment gateway integration existing.

### HIGH Severity
- **`AUD-003` (HIGH — Authorization / Account Suspension Bypass):** Toggling `accountStatus: 'suspended'` in Admin ([`useAdminModeration.ts`](file:///home/antigravity/Rachid0204/ServiceProviders/src/hooks/useAdminModeration.ts#L418-L455)) is purely cosmetic. Neither [`firestore.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/firestore.rules#L15-L20) nor [`RouteGuards.tsx`](file:///home/antigravity/Rachid0204/ServiceProviders/src/app/guards/RouteGuards.tsx) blocks a suspended user from logging in, accessing workspaces, or writing bookings/jobs/messages.
- **`AUD-004` (HIGH — Database Contract Mismatch on Profile Save):** [`handleSaveProfile`](file:///home/antigravity/Rachid0204/ServiceProviders/src/hooks/useMarketplaceAuth.ts#L269-L278) and [`saveFullProviderCard`](file:///home/antigravity/Rachid0204/ServiceProviders/src/hooks/useMarketplaceAuth.ts#L559-L568) overwrite `users/{uid}` with `{ merge: false }` without preserving `accountStatus` or `termsAcceptedAt`. Because [`firestore.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/firestore.rules#L582-L593) restricts user `affectedKeys()` to a 10-field whitelist excluding `accountStatus` and `termsAcceptedAt`, any user whose document has `accountStatus` (e.g., reactivated by Admin) or `termsAcceptedAt` will permanently fail with `PERMISSION_DENIED` whenever they try to edit their profile.
- **`AUD-005` (HIGH — Security / Cross-User Notification Spoofing):** [`firestore.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/firestore.rules#L1764-L1770) (`match /notifications/{notificationId}`) allows any verified user to create a notification for any `userId` with any `type` (including `'kyc_updated'` and `'system'`) and arbitrary text/links as long as `actorId == request.auth.uid`.
- **`AUD-006` (HIGH — Scheduling Integrity / Anti-Double-Booking Bypass):** Direct bookings created via [`submitBooking`](file:///home/antigravity/Rachid0204/ServiceProviders/src/hooks/useBookings.ts#L235-L341) and reschedules via [`rescheduleBooking`](file:///home/antigravity/Rachid0204/ServiceProviders/src/hooks/useBookings.ts#L499-L529) completely bypass `/scheduleLocks/{lockId}` and `/providerAvailability/{uid}`. Furthermore, cancelling a quote-assigned booking ([`cancelBookingWithReason`](file:///home/antigravity/Rachid0204/ServiceProviders/src/hooks/useBookings.ts#L459-L496)) never deletes its `/scheduleLocks/{lockId}` document, permanently deadlocking that provider's time slot.
- **`AUD-007` (HIGH — Quotation Lifecycle Deadlock After Withdrawal):** Because proposal IDs are deterministic (`/jobPosts/{jobId}/proposals/{providerId}`) and [`firestore.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/firestore.rules#L1264) requires `!exists(.../proposals/$(request.auth.uid))` to increment `proposalCount` while `allow update` forbids changing `proposedPriceMad`, a provider who withdraws a quote can never re-submit or revise a quote on that job.
- **`AUD-008` (HIGH — Messaging Dual-Component Desynchronization):** Opening chat from booking cards launches legacy [`ChatDrawerModal.tsx`](file:///home/antigravity/Rachid0204/ServiceProviders/src/components/ChatDrawerModal.tsx), which writes to `chats/{bookingId}/messages` but **never** updates `/conversations/{bookingId}` or dispatches `message_received` notifications — leaving the `/messages` inbox (`MessagesInboxPage.tsx`) and unread badges out of sync.
- **`AUD-009` (HIGH — Dependency Security):** `npm audit` identifies 4 High-severity vulnerability entries in `firebase` → `@firebase/firestore` → `@grpc/grpc-js < 1.13.6` (`GHSA-m9gg-hp2v-232j`, CVSS 7.4).
- **`AUD-010` (HIGH — Security / Hardcoded Admin & Phone Fallbacks):** A personal bootstrap admin email is hardcoded inside [`firestore.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/firestore.rules#L36-L37) and [`storage.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/storage.rules#L30-L31), and placeholder phone numbers (`+212661428910`, `+212661000000`) are used as fallbacks in live booking/provider mappers.

---

## 5. Strong Areas Verified During Audit

1. **Centralized Routing & Role Guards:** Single `<BrowserRouter>` in [`src/main.tsx`](file:///home/antigravity/Rachid0204/ServiceProviders/src/main.tsx), clean layout separation (`PublicLayout`, `CustomerLayout`, `ProviderLayout`, `AdminLayout`), and zero manual `window.history.pushState` calls.
2. **Bid Privacy & Anti-Self-Dealing:** Competing Maâlems cannot read each other's proposals on `/jobPosts/{jobId}/proposals/{providerId}`, and users are blocked from booking their own provider profile or bidding on their own job posts in both UI and `firestore.rules`.
3. **Transactional Rating Aggregation & Deterministic Reviews:** [`submitClientReview`](file:///home/antigravity/Rachid0204/ServiceProviders/src/hooks/useBookings.ts#L533-L659) uses `runTransaction` with deterministic `reviews/{bookingId}` IDs and strict mathematical bounds verified by `firestore.rules` (`Action 2`).
4. **Bundle Discipline & Mobile Performance:** Initial landing bundle (`index.html`) pre-renders the SEO shell and does not `modulepreload` heavy dashboards, Admin, modals, or Leaflet (`buildConfig.test.ts`). All 7 category/hero JPEG assets are optimized between `37 KB` and `112 KB`.
5. **Bilingual FR/AR Parity:** 100% key parity across `TRANSLATIONS.fr` and `TRANSLATIONS.ar` verified by `scripts/check-i18n.mjs`, with automatic `dir="rtl"` / `dir="ltr"` synchronization.

---

## 6. Top Priorities & Final Recommendation

1. **Execute Wave 0 Remediations Immediately (`AUD-001` through `AUD-005`):**
   - Lock down `/withdrawals` and remove COD cash bookings from platform withdrawal balances (`AUD-001`).
   - Disable client-side `cmi_escrow` creation/mutation in `firestore.rules` until a real server-side CMI webhook backend exists (`AUD-002`).
   - Enforce `accountStatus != 'suspended'` in `firestore.rules` and `RouteGuards.tsx` (`AUD-003`), and preserve `accountStatus` / `termsAcceptedAt` when saving profiles (`AUD-004`).
   - Restrict `/notifications` creation in `firestore.rules` so non-admins cannot spoof `kyc_updated` or `system` notifications (`AUD-005`).
2. **Publish `storage.rules` & Enable Firebase App Check:** Deploy [`storage.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/storage.rules) to Firebase Storage and enable reCAPTCHA v3 App Check in Firebase Console.
3. **Launch Recommendation:** **Do not enable online payments or withdrawals yet.** After completing **Wave 0 & Wave 1** fixes (estimated 1–2 days of focused engineering), the platform is recommended for **production launch in Cash-on-Completion (`0%` launch commission) mode**.
