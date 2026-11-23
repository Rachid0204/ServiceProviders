# 10 — WAVE 0 & WAVE 1 PRE-MERGE VERIFICATION REPORT

**Project:** Moul L'Khedma (مول الخدمة) — Moroccan Service-Provider Marketplace  
**Repository:** `Rachid0204/ServiceProviders`  
**Verification Date:** 2026-11-23  
**Reviewed Pull Requests:**
- **PR #14 (`fix/audit-wave0-security-financial` → `main`):** Wave 0 Security, Financial Ledger & Suspension Remediation (`AUD-001`..`AUD-005`, `AUD-009`)
- **PR #15 (`fix/audit-wave1-workflows-integrity` → `fix/audit-wave0-security-financial`):** Wave 1 Workflow Integrity, Transactional Schedule Locks, Proposal Revision & WhatsApp Hardening (`AUD-006`..`AUD-008`, `AUD-010`, `AUD-015`)

**Authoritative Sources:**
- `audit/post-implementation/08-MASTER-REMEDIATION-WORKLIST.md`
- `audit/post-implementation/01-EXECUTIVE-AUDIT-REPORT.md`

---

## 1. Original Finding ID Reconciliation (All 21 Authoritative Findings)

Every finding below preserves its exact ID, title, severity, and definition from `audit/post-implementation/08-MASTER-REMEDIATION-WORKLIST.md`:

| ID | Exact Authoritative Title (`08-MASTER-REMEDIATION-WORKLIST.md`) | Severity | Target Wave | Classification | Resolution / Deferral Details |
|---|---|---|---|---|---|
| `AUD-001` | Cash-on-Completion Earnings Counted as Withdrawable Platform Balance & Unbounded Withdrawal Requests | **CRITICAL** | **Wave 0 (PR #14)** | **RESOLVED AND VERIFIED** | Separated `cashCollectedDirectlyMad` from `platformHeldWithdrawableMad` (`0 MAD` while CMI escrow is disabled); added transaction-safe `/withdrawalLocks/{providerId}` + historical `/withdrawals/{withdrawalId}` lifecycle enforcing single active pending request, new requests after `approved`/`rejected`/`completed`, immutable history, and server-side balance & `minWithdrawalMad` bounds in `firestore.rules`. Verified against live Firebase Firestore Emulator across all 7 lifecycle conditions. |
| `AUD-002` | Simulated `cmi_escrow` Bypass in `firestore.rules` & Residual Escrow UI Actions | **CRITICAL** | **Wave 0 (PR #14)** | **RESOLVED AND VERIFIED** | Locked client booking creation in `firestore.rules` and `useBookings.ts` strictly to `paymentMethod == 'cash_on_completion'` (`paymentStatus in ['unpaid_cod', 'pending_cash']`); removed client `escrow_held -> paid` rule and removed simulated escrow release/refund controls from customer and admin interfaces. Verified against live Firebase Firestore Emulator. |
| `AUD-003` | Account Suspension Not Enforced in `firestore.rules` or `RouteGuards.tsx` | **HIGH** | **Wave 0 (PR #14)** | **RESOLVED AND VERIFIED** | Added `isNotSuspended()` and `isActiveVerifiedUser()` in `firestore.rules` across all protected Firestore writes (while keeping `isAdmin()` unrestricted) and added `isSuspendedUserProfile` + `SuspendedAccountScreen` (`data-testid="suspended-account-screen"`) in `src/app/guards/RouteGuards.tsx`. Verified in Vitest and live Firebase Firestore Emulator. |
| `AUD-004` | Profile & Provider Card Save Fails with `PERMISSION_DENIED` When `accountStatus` or `termsAcceptedAt` Exists | **HIGH** | **Wave 0 (PR #14)** | **RESOLVED AND VERIFIED** | Added `preserveProtectedUserFields` and `preserveProtectedProviderFields` in `src/utils/authHelpers.ts`, wired into `handleSaveProfile` and `saveFullProviderCard` in `src/hooks/useMarketplaceAuth.ts`, and updated `firestore.rules` (`/users/{uid}` and `/providers/{uid}`) to preserve `accountStatus`, `termsAcceptedAt`, and `completedJobs`. Verified in unit tests and live Firebase Firestore Emulator. |
| `AUD-005` | Cross-User Notification Spoofing (`kyc_updated` / `system`) in `firestore.rules` | **HIGH** | **Wave 0 (PR #14)** | **RESOLVED AND VERIFIED** | Restricted `match /notifications/{notificationId}` `allow create` in `firestore.rules` so non-admins cannot create `'kyc_updated'`, `'dispute_resolved'`, or `'system'` notifications and cannot self-notify (`userId != request.auth.uid`), while preserving workflow notifications (`booking_created`, `booking_status`, `quote_received`, `quote_accepted`, `quote_rejected`, `message_received`, `review_received`, `dispute_opened`). Verified against live Firebase Firestore Emulator. |
| `AUD-006` | Direct Booking & Reschedule Bypass `/scheduleLocks` + Booking Cancellation Leaves Orphaned Lock | **HIGH** | **Wave 1 (PR #15)** | **RESOLVED AND VERIFIED** | Wrapped `submitBooking`, `cancelBookingWithReason`, `rescheduleBooking` (`src/hooks/useBookings.ts`) and `acceptProposalAndCreateBooking` (`src/hooks/useJobPosts.ts`) in `runTransaction` reading the live booking/job/proposal documents inside the transaction, validating live status and participant identity, deriving `oldLockId` from live booking data, enforcing `/providerAvailability/{uid}`, acquiring/moving/deleting `/scheduleLocks/{lockId}`, and requiring active booking status (`pending` or `accepted`) on `/scheduleLocks` creation in `firestore.rules`. Verified against live Firebase Firestore Emulator across all 6 concurrency scenarios. |
| `AUD-007` | Proposal Deterministic ID Prevents Price Revision or Re-submission After Withdrawal | **HIGH** | **Wave 1 (PR #15)** | **RESOLVED AND VERIFIED** | Updated `match /jobPosts/{jobId}/proposals/{providerId}` `allow update` in `firestore.rules`, `submitJobProposal` (`runTransaction`) in `src/hooks/useJobPosts.ts`, and `ProviderDashboard.tsx` to allow the proposing provider to revise and resubmit their own `'pending'` or `'withdrawn'` proposal while the job post is `'open'` without double-incrementing `proposalCount`. Verified against live Firebase Firestore Emulator. |
| `AUD-008` | Legacy `ChatDrawerModal` Desynchronized from `/conversations` Inbox & Notifications | **HIGH** | **Wave 1 (PR #15)** | **RESOLVED AND VERIFIED** | Wired `markConversationRead` and `updateConversationOnMessage` from `GlobalModals.tsx` into `ChatDrawerModal.tsx` and dispatched `'message_received'` notifications when sending messages from the booking chat drawer. |
| `AUD-009` | High-Severity Transitive Vulnerabilities in `@grpc/grpc-js < 1.13.6` (`firebase@13.4.0`) | **HIGH** | **Wave 0 (PR #14)** | **RESOLVED AND VERIFIED** | Added `"overrides": { "@grpc/grpc-js": "^1.13.6" }` in `package.json` and updated `package-lock.json` (`@grpc/grpc-js@1.14.7`). `npm audit` reports `0` vulnerabilities. |
| `AUD-010` | Hardcoded Fallback Phone Numbers (`+212661428910`) & Bootstrap Admin Email in Rules | **HIGH** | **Wave 1 (PR #15)** | **PARTIALLY RESOLVED** | **Resolved portion:** Removed all hardcoded placeholder phone fallbacks (`+212661428910`, `+212661000000`) across `buildWhatsAppUrl` (`src/utils/marketplace.ts`), `useBookings.ts`, `useProviders.ts`, `useAdminData.ts`, `ProviderDashboard.tsx`, `MarketplaceContext.tsx`, `systemSettings.ts`, and `AdminUsersReviewsSection.tsx`, and hid WhatsApp CTAs whenever `phone` is empty/invalid. **Intentionally retained portion:** The bootstrap administrator email check (`isBootstrappedAdmin()`) in `firestore.rules` and `storage.rules` is preserved alongside custom claims (`request.auth.token.admin == true`) and `/admins/{uid}` so current administrator access is not broken before an alternative admin provisioning workflow is implemented, tested, and approved. |
| `AUD-011` | Law 09-08 `termsAcceptedAt` Consent Timestamp Never Persisted to `/users/{uid}` | **MEDIUM** | **Wave 2** | **DEFERRED** | Deferred to Wave 2 per approved scope boundary. (`AUD-004` ensures `termsAcceptedAt` is preserved on profile updates whenever present.) |
| `AUD-012` | `storage.rules` Excluded from GitHub Actions Firebase Auto-Deploy Pipeline | **MEDIUM** | **Wave 2** | **DEFERRED** | Deferred to Wave 2 pending GCP IAM `roles/firebasestorage.admin` grant on the CI deployment service account. |
| `AUD-013` | Accepting a Proposal Does Not Auto-Close Competing Pending Proposals | **MEDIUM** | **Wave 2** | **DEFERRED** | Deferred to Wave 2 per approved scope boundary. |
| `AUD-014` | Dead Express Server (`server.ts`), Duplicate Modals, and Oversized Monolithic Components | **MEDIUM** | **Wave 3** | **DEFERRED** | Deferred to Wave 3 per approved scope boundary. |
| `AUD-015` | Production `BookingModal` Displays Demo Sample Photo Button (`"Joindre photo chantier témoin"`) | **MEDIUM** | **Wave 1 (PR #15)** | **RESOLVED AND VERIFIED** | Removed the `"Joindre photo chantier témoin"` (`t.attachSamplePhotoBtn`) button from `src/components/BookingModal.tsx`, preserving only real customer photo upload and removal. Verified by Vitest component test in `src/tests/productionReadiness.test.tsx`. |
| `AUD-016` | Public Unauthenticated Scraping of Provider Phone Numbers & Unenforced Firebase App Check | **MEDIUM** | **Wave 2** | **DEFERRED** | Deferred to Wave 2 per approved scope boundary. |
| `AUD-017` | ~60% of Dashboard & Page Copy Uses Inline `isAr ? ... : ...` Ternaries Outside `translations.ts` | **MEDIUM** | **Wave 3** | **DEFERRED** | Deferred to Wave 3 per approved scope boundary. |
| `AUD-018` | Unrestricted Self-Service Role Switching (`client` ↔ `provider` ↔ `both`) | **LOW** | **Wave 4** | **DEFERRED** | Deferred to Wave 4 per approved scope boundary. |
| `AUD-019` | Global `limit(200)` Real-Time Provider Listener, N+1 Proposal Checks & Static `responseMinutes: 20` | **LOW** | **Wave 3** | **DEFERRED** | Deferred to Wave 3 per approved scope boundary. |
| `AUD-020` | Modal Focus Trapping & Explicit `Africa/Casablanca` Timezone Formatting | **LOW** | **Wave 4** | **DEFERRED** | Deferred to Wave 4 per approved scope boundary (`getTodayIsoDate` in `marketplace.ts` already uses `Africa/Casablanca`; modal focus trap hook remains in Wave 4). |
| `AUD-021` | `firestore.rules.test.ts` Uses Static Substring Checks Instead of Live Firebase Emulator Execution | **LOW** | **Wave 3 (Accelerated in Wave 0/1)** | **RESOLVED AND VERIFIED (FOR WAVE 0 & WAVE 1 RULES)** | Live Firebase Firestore Emulator execution (`cloud-firestore-emulator-v1.19.8.jar`) was added in `firestore.rules.test.ts` and `.github/workflows/ci.yml` to verify all Wave 0 and Wave 1 security rules and transactional preconditions against the real emulator. |

---

## 2. `AUD-001` Withdrawal Lifecycle Correction

### Problem Fixed
Using a single static document ID `wd_${uid}` in `/withdrawals/{withdrawalId}` prevented duplicate pending requests but blocked a provider from ever submitting a second withdrawal request after their first request reached a terminal status (`approved`, `rejected`, or `completed`), or would overwrite historical withdrawal records.

### Architecture Implemented
1. **Separate Immutable Historical Records (`/withdrawals/{withdrawalId}`) + Per-Provider Active Lock Pointer (`/withdrawalLocks/{providerId}`):**
   - Each withdrawal request is created with a unique document ID via `buildWithdrawalRequestId(providerId)` (`wd_${uid}_${timestamp}`) in `/withdrawals/{withdrawalId}`.
   - `allow delete: if false;` on `match /withdrawals/{withdrawalId}` guarantees that historical withdrawal records can never be deleted.
   - `match /withdrawals/{withdrawalId}` `allow create` requires `existsAfter(/databases/$(database)/documents/withdrawalLocks/$(request.auth.uid))` and `getAfter(/databases/$(database)/documents/withdrawalLocks/$(request.auth.uid)).data.activeWithdrawalId == withdrawalId`.
   - `match /withdrawalLocks/{providerId}` is keyed deterministically by `providerId == request.auth.uid`:
     - On **first request (`allow create`)**: verifies `!exists(/databases/$(database)/documents/withdrawals/$(incoming().activeWithdrawalId))` and `getAfter(.../withdrawals/$(incoming().activeWithdrawalId)).data.status == 'pending'`.
     - On **subsequent requests (`allow update`)**: verifies `incoming().activeWithdrawalId != existing().activeWithdrawalId`, verifies that the previous withdrawal pointed to by `existing().activeWithdrawalId` has reached a terminal status in Firestore (`get(/databases/$(database)/documents/withdrawals/$(existing().activeWithdrawalId)).data.status in ['approved', 'rejected', 'completed']`), and verifies that the newly created withdrawal `incoming().activeWithdrawalId` did not previously exist and has `status == 'pending'`.
2. **Server-Controlled Balance & Minimum Threshold Enforcement:**
   - Providers cannot set or modify `withdrawableBalanceMad` on `/providers/{uid}` (excluded from non-admin `affectedKeys().hasOnly([...])` and locked via `incoming().get('withdrawableBalanceMad', 0) == existing().get('withdrawableBalanceMad', 0)`).
   - `match /withdrawals/{withdrawalId}` `allow create` requires `'withdrawableBalanceMad' in get(.../providers/$(request.auth.uid)).data`, `incoming().amountMad <= get(.../providers/$(request.auth.uid)).data.withdrawableBalanceMad`, and `incoming().amountMad >= get(.../systemSettings/global).data.minWithdrawalMad` (with `amountMad >= 100` enforced in `isValidWithdrawal`).
   - In `src/hooks/useAdminData.ts` (`updateWithdrawalStatus`), transitioning a withdrawal to `'approved'` or `'completed'` executes inside `runTransaction` and atomically decrements `/providers/{providerId}.withdrawableBalanceMad` by `withdrawal.amountMad` (clamped to `>= 0`).
   - In `src/components/dashboards/ProviderDashboard.tsx` (`handleRequestWithdrawal`), withdrawal submission executes inside `runTransaction`, reading `/providers/{uid}` and `/withdrawalLocks/{uid}` (and the previous `/withdrawals/{activeWithdrawalId}` when present) before atomically writing `/withdrawals/{withdrawalId}` and `/withdrawalLocks/{uid}`.

---

## 3. `AUD-006` Transaction Concurrency Correction

### Problem Fixed
`cancelBookingWithReason` and `rescheduleBooking` in `src/hooks/useBookings.ts` previously derived `oldLockId`, participant roles, and booking status from React state (`bookings.find(...)`) outside `runTransaction` without reading the live `bookings/{bookingId}` document inside the transaction. Under concurrent rescheduling or cancellation, stale client state could cause a transaction to delete the wrong `/scheduleLocks/{lockId}` or create an orphaned lock on a cancelled booking.

### Architecture Implemented
1. **Live Booking Document Read Inside Every Transaction (`tx.get(bookingDocRef)`):**
   - Both `cancelBookingWithReason` and `rescheduleBooking` in `src/hooks/useBookings.ts` now read `bookingSnap = await tx.get(bookingDocRef)` as the first step inside `runTransaction(db, async (tx) => { ... })`, registering `bookings/{bookingId}` in Firestore's optimistic concurrency read-set.
   - Both functions parse `liveBooking = mapFirestoreBooking(bookingId, bookingSnap.data())` inside the transaction and validate:
     - **Participant identity:** `liveBooking.clientId === firebaseUser.uid` or `liveBooking.providerId === firebaseUser.uid` (and role-matched for cancellation).
     - **Live booking status:** `canTransitionBookingStatus(liveBooking.status, 'cancelled', effectiveRole)` for cancellation/rejection, and `liveBooking.status === 'pending' || liveBooking.status === 'accepted'` for rescheduling.
     - **Live lock derivation:** `liveLockId` / `oldLockId` is computed from `liveBooking.providerId`, `liveBooking.preferredDate`, and `liveBooking.preferredTimeSlot` read inside the transaction.
   - `acceptProposalAndCreateBooking` in `src/hooks/useJobPosts.ts` also derives `livePreferredDate`, `livePreferredTimeSlot`, `livePriceMad`, `liveLockId`, and quote expiration directly from `liveJobSnap.data()` and `livePropSnap.data()` inside `runTransaction`.
2. **Rule-Level Prevention of Orphaned Locks on Cancelled Bookings:**
   - Updated `match /scheduleLocks/{lockId}` `allow create` in `firestore.rules` to require:
     `getAfter(/databases/$(database)/documents/bookings/$(incoming().bookingId)).data.status in ['pending', 'accepted']`
     in addition to matching `clientId`, `providerId`, `preferredDate`, and `preferredTimeSlot`.
3. **Missing `/providerAvailability/{uid}` Document Decision:**
   - **Documented Decision:** When a provider has not yet saved a custom `/providerAvailability/{uid}` document (`availSnap.exists() === false`, so `schedule === null`), `isProviderSlotAvailable(null, dateIso, timeSlot)` validates that `dateIso` is a valid `YYYY-MM-DD` calendar date and `TIME_SLOTS.includes(timeSlot)` is true, and defaults to `true` (available). This preserves existing marketplace behavior so newly onboarded providers and vetted catalog providers can receive bookings immediately before customizing their weekly calendar, while strictly enforcing `blockedDates` and `days` as soon as `/providerAvailability/{uid}` is saved.

---

## 4. `AUD-010` Partial-Resolution Status

- **Classification:** **PARTIALLY RESOLVED**
- **Resolved & Verified in Wave 1 (PR #15):**
  - Removed all hardcoded fallback phone numbers (`+212661428910` and `+212661000000`) from `buildWhatsAppUrl` (`src/utils/marketplace.ts`), `src/hooks/useBookings.ts`, `src/hooks/useProviders.ts`, `src/hooks/useAdminData.ts`, `src/components/dashboards/ProviderDashboard.tsx`, `src/app/providers/MarketplaceContext.tsx`, `src/utils/systemSettings.ts`, and `src/components/admin/AdminUsersReviewsSection.tsx`.
  - `buildWhatsAppUrl` returns `''` when `phone` is empty or invalid, and all WhatsApp CTAs across customer, provider, public profile, home, booking modal, chat drawer, and inbox views render only when the resulting WhatsApp URL is non-empty.
- **Intentionally Retained Pending Alternative Admin Provisioning:**
  - The bootstrap administrator check (`isBootstrappedAdmin()` in `firestore.rules` L34–40 and `storage.rules` L28–33) remains in place alongside custom claims (`request.auth.token.admin == true`) and `/admins/{uid}` document lookup so that production administrator access is not broken prior to an approved custom-claim or `/admins/{uid}` provisioning migration.

---

## 5. Exact Files Modified

### PR #14 — Wave 0 (`fix/audit-wave0-security-financial` vs `main`)
- `firestore.rules`
- `firestore.rules.test.ts`
- `package.json`
- `package-lock.json`
- `src/app/guards/RouteGuards.tsx`
- `src/components/BookingLifecycleModals.tsx`
- `src/components/admin/AdminBookingsSection.tsx`
- `src/components/admin/AdminOverviewSection.tsx`
- `src/components/dashboards/ClientDashboard.tsx`
- `src/components/dashboards/ProviderDashboard.tsx`
- `src/hooks/useAdminData.ts`
- `src/hooks/useAdminModeration.ts`
- `src/hooks/useBookings.ts`
- `src/hooks/useDisputes.ts`
- `src/hooks/useMarketplaceAuth.ts`
- `src/tests/routing.test.tsx`
- `src/utils/adminMetrics.ts`
- `src/utils/authHelpers.test.ts`
- `src/utils/authHelpers.ts`
- `src/utils/marketplace.test.ts`
- `src/utils/marketplace.ts`
- `audit/post-implementation/01..09-*.md`

### PR #15 — Wave 1 (`fix/audit-wave1-workflows-integrity` vs `fix/audit-wave0-security-financial`)
- `firestore.rules`
- `firestore.rules.test.ts`
- `src/app/providers/GlobalModals.tsx`
- `src/app/providers/MarketplaceContext.tsx`
- `src/components/BookingModal.tsx`
- `src/components/ChatDrawerModal.tsx`
- `src/components/admin/AdminUsersReviewsSection.tsx`
- `src/components/dashboards/ClientDashboard.tsx`
- `src/components/dashboards/ProviderDashboard.tsx`
- `src/hooks/useAdminData.ts`
- `src/hooks/useBookings.ts`
- `src/hooks/useJobPosts.ts`
- `src/hooks/useProviders.ts`
- `src/pages/messages/MessagesInboxPage.tsx`
- `src/pages/public/HomePage.tsx`
- `src/pages/public/ProviderPublicProfilePage.tsx`
- `src/tests/productionReadiness.test.tsx`
- `src/utils/marketplace.test.ts`
- `src/utils/marketplace.ts`
- `src/utils/systemSettings.ts`
- `audit/post-implementation/10-WAVE0-WAVE1-PREMERGE-VERIFICATION.md`

---

## 6. Tests Executed and Actual Results

| Command | Scope | Actual Result |
|---|---|---|
| `npm run lint` | TypeScript strict typecheck (`tsc --noEmit`) | **PASS (`0` errors)** |
| `npm run lint:rules` | Firestore rules static lint (`eslint firestore.rules`) | **PASS (`0` errors)** |
| `node scripts/check-i18n.mjs` | Bilingual FR/AR dictionary key parity | **PASS (`249` FR keys / `249` AR keys, 100% parity)** |
| `npm run test:unit` | 71 Node unit, policy & live Firebase Firestore Emulator tests | **PASS (`71/71` passed, `0` failed)** |
| `npm run test:routes` | 28 Vitest route guard, suspended-account, RTL & UI readiness tests | **PASS (`28/28` passed across 2 test suites, `0` failed)** |
| `npm run build` | Production Vite client bundle + esbuild server bundle | **PASS (`dist/index.html` + `dist/server.js` built cleanly)** |
| `npm audit` | NPM dependency vulnerability audit | **PASS (`found 0 vulnerabilities`)** |

---

## 7. Live Firebase Firestore Emulator Test Evidence

All security rule and transactional precondition assertions in `firestore.rules.test.ts` (`Wave 0 Live Firebase Firestore Emulator Execution`) were executed against a real local `cloud-firestore-emulator-v1.19.8.jar` instance (`127.0.0.1:8091`) via HTTP REST `:commit` (atomic multi-document writes with `currentDocument` preconditions and `REQUEST_TIME` transforms) and `GET` document verification:

### `AUD-001` — All 7 Withdrawal Lifecycle Conditions Verified on Live Emulator
1. **Single active pending withdrawal per provider:** `prov2` creating `withdrawals/wd_prov2_1` (`300 MAD`, `status: 'pending'`) + `withdrawalLocks/prov2` (`activeWithdrawalId: 'wd_prov2_1'`) succeeds (`HTTP 200`). Attempting a second withdrawal `withdrawals/wd_prov2_dup` + updating `withdrawalLocks/prov2` while `wd_prov2_1` is still `'pending'` is rejected by `firestore.rules` (`HTTP 403 PERMISSION_DENIED`).
2. **New request allowed after `rejected`, `approved`, or `completed`:**
   - Admin updates `wd_prov2_1` to `'rejected'` (`HTTP 200`) → `prov2` submits `wd_prov2_2` + updates `withdrawalLocks/prov2.activeWithdrawalId = 'wd_prov2_2'` (`HTTP 200`).
   - Admin updates `wd_prov2_2` to `'approved'` (`HTTP 200`) → `prov2` submits `wd_prov2_3` + updates `withdrawalLocks/prov2.activeWithdrawalId = 'wd_prov2_3'` (`HTTP 200`).
   - Admin updates `wd_prov2_3` to `'completed'` (`HTTP 200`) → `prov2` submits `wd_prov2_4` + updates `withdrawalLocks/prov2.activeWithdrawalId = 'wd_prov2_4'` (`HTTP 200`).
3. **Full withdrawal history preserved & immutable against deletion:** Live emulator `GET` confirms `wd_prov2_1` (`rejected`), `wd_prov2_2` (`approved`), `wd_prov2_3` (`completed`), and `wd_prov2_4` (`pending`) all coexist in `/withdrawals`, and `DELETE` on `withdrawals/wd_prov2_1` (even with `adminToken`) is rejected (`HTTP 403`).
4. **Providers cannot self-modify `withdrawableBalanceMad`:** `prov1` attempting to update `/providers/prov1` with `withdrawableBalanceMad: 5000` is rejected (`HTTP 403`).
5. **`platformHeldWithdrawableMad` stays `0` while CMI escrow is disabled:** Verified in `marketplace.test.ts` (`AUD-001`) and live emulator (`prov1` has `0` platform-held balance despite COD bookings).
6. **COD-based payout requests rejected:** `prov1` (COD-only provider without server-assigned `withdrawableBalanceMad`) attempting to create `withdrawals/wd_prov1_cod` + `withdrawalLocks/prov1` is rejected (`HTTP 403`).
7. **Minimum withdrawal amount & available balance enforced in rules:** With `systemSettings/global.minWithdrawalMad = 250` and `providers/prov2.withdrawableBalanceMad = 900`, `amountMad: 150` is rejected (`HTTP 403`) and `amountMad: 1200` is rejected (`HTTP 403`).

### `AUD-006` — All 6 Concurrency & Schedule Lock Scenarios Verified on Live Emulator
1. **Two clients attempting the same provider slot concurrently:** `client1` locks `scheduleLocks/prov1_2026-11-28_09001200` (`bk_cod_1`, `HTTP 200`). `client2` attempting an atomic commit of `bookings/bk_client2_race` + `scheduleLocks/prov1_2026-11-28_09001200` (`currentDocumentExists: false`) fails precondition (`HTTP 400`), and `GET bookings/bk_client2_race` returns `HTTP 404` (atomic rollback).
2. **Two simultaneous reschedules to the same new slot (`2026-11-29`, `14:00 - 17:00`):** `bk_cod_1` atomically moves from `2026-11-28 09:00-12:00` to `2026-11-29 14:00-17:00` (`HTTP 200`). `bk_client2_ok` attempting to atomically move from `2026-11-28 14:00-17:00` to `2026-11-29 14:00-17:00` (`currentDocumentExists: false`) fails (`HTTP 400`), and `GET scheduleLocks/prov1_2026-11-28_14001700` returns `HTTP 200` (original lock intact).
3. **Cancellation racing with rescheduling:** After `bk_cod_1` is cancelled, a racing reschedule attempt on `bk_cod_1` + `scheduleLocks/prov1_2026-11-30_09001200` is rejected (`HTTP 403 PERMISSION_DENIED`), and `GET scheduleLocks/prov1_2026-11-30_09001200` returns `HTTP 404`.
4. **Provider rejection releasing a slot:** `prov1` rejects `bk_client2_ok` (`status: 'cancelled', cancelledBy: 'provider'`) and deletes `scheduleLocks/prov1_2026-11-28_14001700` atomically (`HTTP 200`). `client1` immediately books `2026-11-28 14:00 - 17:00` (`bk_rebooked_after_reject` + `scheduleLocks/prov1_2026-11-28_14001700`, `HTTP 200`).
5. **Cancellation after a previous reschedule:** Reading live `bookings/bk_cod_1` (`GET` → `2026-11-29`, `14:00 - 17:00`) derives `scheduleLocks/prov1_2026-11-29_14001700` and atomically cancels `bk_cod_1` while deleting `scheduleLocks/prov1_2026-11-29_14001700` (`HTTP 200`). Both old and new locks return `HTTP 404`.
6. **Booking and lock consistency after failed transactions:** Verified via `GET` after every rejected/conflicting batch commit that zero partial booking updates or orphaned `/scheduleLocks` documents remain.

---

## 8. GitHub Actions Results for Each PR Branch

| Branch / PR | Workflow | Run ID | Commit SHA | Steps Executed in GitHub Actions | Status / Conclusion |
|---|---|---|---|---|---|
| `fix/audit-wave0-security-financial` (PR #14) | `CI Quality Gate` | `45143478743` | `abd8850` | `npm ci`, Download Firebase Firestore Emulator JAR (`v1.19.8`), `npm run lint`, `node scripts/check-i18n.mjs`, `npm run lint:rules`, `npm run build`, `npm test` (including live Firestore Emulator execution), `npm audit --audit-level=high` | **COMPLETED — `success` (33s)** |
| `fix/audit-wave1-workflows-integrity` (PR #15) | `CI Quality Gate` | `45143478791` | `861ffad` | `npm ci`, Download Firebase Firestore Emulator JAR (`v1.19.8`), `npm run lint`, `node scripts/check-i18n.mjs`, `npm run lint:rules`, `npm run build`, `npm test` (including live Firestore Emulator execution), `npm audit --audit-level=high` | **COMPLETED — `success` (34s)** |

---

## 9. Remaining Risks (Deferred Waves 2–4)

1. **`AUD-010` (Partial — Bootstrap Admin Email):** `isBootstrappedAdmin()` remains active in `firestore.rules` and `storage.rules` until custom claims or `/admins/{uid}` provisioning is operationalized.
2. **`AUD-011` (Wave 2 — `termsAcceptedAt` Persistence):** New registrations validate the Law 09-08 checkbox in UI state; writing `termsAcceptedAt: serverTimestamp()` on initial `/users/{uid}` creation is scheduled for Wave 2.
3. **`AUD-012` (Wave 2 — `storage.rules` CI Auto-Deploy):** `.github/workflows/firebase-deploy.yml` currently deploys `firestore:rules,firestore:indexes` on merge to `main`; `storage.rules` deployment requires granting `roles/firebasestorage.admin` to the CI service account.
4. **`AUD-013` (Wave 2 — Auto-Closing Competing Proposals):** Accepting a winning quote marks the job `'assigned'`, preventing any new quotes or acceptance of other quotes, while batch-transitioning competing `'pending'` proposal documents to `'rejected'` is scheduled for Wave 2.
5. **`AUD-016` (Wave 2 — Public Phone Scraping & App Check):** Unauthenticated directory browsing can read provider phone numbers until public phone masking and production reCAPTCHA v3 App Check enforcement are enabled in Wave 2.

---

## 10. Explicit Merge Recommendation

- **PR #14 (`fix/audit-wave0-security-financial` → `main`):** **RECOMMENDED FOR MERGE (First)** — All 6 Wave 0 findings (`AUD-001`, `AUD-002`, `AUD-003`, `AUD-004`, `AUD-005`, `AUD-009`), including the 7-condition transaction-safe `AUD-001` withdrawal lifecycle with `/withdrawalLocks/{providerId}` and immutable `/withdrawals/{withdrawalId}` history, are **RESOLVED AND VERIFIED**.
- **PR #15 (`fix/audit-wave1-workflows-integrity` → `fix/audit-wave0-security-financial`):** **RECOMMENDED FOR MERGE (Second, immediately after PR #14 merges into `main`)** — `AUD-006` (including live transactional booking reads and all 6 concurrency scenarios), `AUD-007`, `AUD-008`, and `AUD-015` are **RESOLVED AND VERIFIED**, and `AUD-010` is **PARTIALLY RESOLVED** as specified (all fake fallback phone numbers removed; bootstrap admin authorization preserved).
