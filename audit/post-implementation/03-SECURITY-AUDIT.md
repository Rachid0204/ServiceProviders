# 03 — APPLICATION SECURITY AUDIT
## Project: Moul L'Khedma (مول الخدمة)
**Framework:** OWASP Top 10 (2021/2025) & Firebase / BaaS Security Best Practices

---

## 1. Security Posture Overview

Because the production deployment on Vercel (`https://servicepro-one.vercel.app/`) is a static SPA that communicates directly with Firebase Auth, Cloud Firestore (`ai-studio-721fde67-a110-4e25-bcc2-2f011a526460`), and Firebase Storage (`serviceproviders-530c4.firebasestorage.app`), **[`firestore.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/firestore.rules) (`2,059` lines) and [`storage.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/storage.rules) (`119` lines) are the sole active server-side security boundary in production**.

### Confirmed Security Strengths
- **Global Default-Deny:** Both `firestore.rules` (lines 6–8) and `storage.rules` (lines 7–9) enforce a global `allow read, write: if false;` fallback.
- **Verified Identity Gate (`isVerifiedUser()`):** Almost all mutations require `request.auth.token.email_verified == true` or a verified phone token.
- **Strict Field Whitelisting (`hasAll` / `hasOnly` / `affectedKeys`):** Every Firestore collection validates exact schema keys, string lengths, regex patterns, and `request.time` server timestamps.
- **PII & Bid Isolation:** `/users/{uid}` is readable only by the owner or Admin; `/providerDocuments/{uid}` is readable only by the owner or Admin; `/jobPosts/{jobId}/proposals/{providerId}` is readable only by the proposing Maâlem, the job-owning Client, or Admin.
- **CSV Formula Injection Neutralization:** [`escapeCsvCell`](file:///home/antigravity/Rachid0204/ServiceProviders/src/utils/adminMetrics.ts) neutralizes `=`, `+`, `-`, `@`, `\t`, and `\r` prefixes in Admin CSV exports.
- **Receipt HTML Escaping:** [`buildBookingReceiptHtml`](file:///home/antigravity/Rachid0204/ServiceProviders/src/utils/paymentsAdapter.ts#L127-L134) escapes `<, >, &, ", '` before generating downloadable HTML receipts.

---

## 2. Detailed Vulnerability & Security Findings

### `AUD-001` — Unbounded Withdrawal Requests & COD Earnings Inflation
- **Severity:** **CRITICAL**
- **Category:** Payments / Business-Logic Security (OWASP A04: Insecure Design)
- **Evidence:**
  - [`src/components/dashboards/ProviderDashboard.tsx`](file:///home/antigravity/Rachid0204/ServiceProviders/src/components/dashboards/ProviderDashboard.tsx#L391-L423) (`metrics` & `withdrawnTotalMad`)
  - [`src/components/dashboards/ProviderDashboard.tsx`](file:///home/antigravity/Rachid0204/ServiceProviders/src/components/dashboards/ProviderDashboard.tsx#L740-L812) (`handleRequestWithdrawal`)
  - [`firestore.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/firestore.rules#L969-L995) (`match /withdrawals/{withdrawalId}`)
- **Technical & Business Risk:**
  1. When a Cash-on-Completion (`cash_on_completion`) booking is completed, the customer pays the provider directly on-site, and `paymentStatus` becomes `'paid'`. `ProviderDashboard.tsx` lines 403–409 adds `b.estimatedMad` from all `paymentStatus === 'paid'` bookings (including `cash_on_completion`) into `settledEarningsMad`.
  2. Neither `handleRequestWithdrawal` nor `firestore.rules` checks whether `incoming().amountMad` is less than or equal to the provider's available platform-held balance, nor does `firestore.rules` prevent a provider from creating dozens of concurrent `pending` withdrawal documents up to `100,000 MAD` each.
- **Remediation:**
  - Exclude `cash_on_completion` bookings from platform-held withdrawal balances (`settledEarningsMad` for withdrawals must only count server-verified online captures in `/payments`).
  - Disable provider withdrawal creation in `firestore.rules` (`allow create: if isAdmin();`) until online gateway payouts are enabled, or enforce a deterministic single active withdrawal request (`withdrawalId == request.auth.uid`) backed by a server-verified balance field.

---

### `AUD-002` — Client-Side Simulated Escrow Creation & Settlement Still Permitted in `firestore.rules`
- **Severity:** **CRITICAL**
- **Category:** Payments / Business-Logic Security (OWASP A04 / A01)
- **Evidence:**
  - [`firestore.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/firestore.rules#L360-L370) (`isValidBooking` allows `paymentMethod == 'cmi_escrow'` and `paymentStatus == 'escrow_held'`)
  - [`firestore.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/firestore.rules#L747-L784) (`match /bookings/{bookingId}` allows client to create `cmi_escrow` with `escrow_held` and update `escrow_held → paid`)
  - [`src/hooks/useBookings.ts`](file:///home/antigravity/Rachid0204/ServiceProviders/src/hooks/useBookings.ts#L430-L461) (`clientConfirmAndReleaseEscrow`)
- **Technical & Business Risk:**
  - Although [`BookingModal.tsx`](file:///home/antigravity/Rachid0204/ServiceProviders/src/components/BookingModal.tsx#L768-L786) disabled the CMI card option in the React UI, any authenticated user can call the Firebase SDK from the browser console to create a booking with `paymentMethod: 'cmi_escrow'` and `paymentStatus: 'escrow_held'` without paying a single dirham, tricking a Maâlem into believing money is held in escrow by the platform, and later flipping `paymentStatus` to `'paid'`.
- **Remediation:**
  - In `firestore.rules` (`match /bookings/{bookingId}` `allow create`), restrict client-created bookings strictly to `incoming().paymentMethod == 'cash_on_completion' && incoming().paymentStatus == 'unpaid_cod'`, and remove client-side `Action 2` (`escrow_held → paid`) so only verified server/Admin flows can ever set online payment statuses.

---

### `AUD-003` — Suspended User Accounts (`accountStatus == 'suspended'`) Are Not Blocked by Security Rules or Route Guards
- **Severity:** **HIGH**
- **Category:** Authentication & Authorization (OWASP A01: Broken Access Control)
- **Evidence:**
  - [`src/hooks/useAdminModeration.ts`](file:///home/antigravity/Rachid0204/ServiceProviders/src/hooks/useAdminModeration.ts#L418-L455) (`toggleUserAccountSuspension`)
  - [`firestore.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/firestore.rules#L15-L20) (`isVerifiedUser()`)
  - [`src/app/guards/RouteGuards.tsx`](file:///home/antigravity/Rachid0204/ServiceProviders/src/app/guards/RouteGuards.tsx#L20-L76) (`RequireAuth`, `RequireRole`)
- **Technical & Business Risk:**
  - When an Admin suspends a malicious customer or provider in `/admin/users`, `users/{uid}.accountStatus` is updated to `'suspended'`. However, neither `RouteGuards.tsx` nor `firestore.rules` checks `accountStatus`. The suspended user retains full read/write access to create bookings, post jobs, send messages, and submit quotes.
- **Remediation:**
  - Add a helper in `firestore.rules`:
    ```
    function isNotSuspended() {
      return !exists(/databases/$(database)/documents/users/$(request.auth.uid)) ||
        !('accountStatus' in get(/databases/$(database)/documents/users/$(request.auth.uid)).data) ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.accountStatus != 'suspended';
    }
    ```
    and enforce it on mutations, plus redirect suspended users in `RouteGuards.tsx` to `/unauthorized`.

---

### `AUD-005` — Arbitrary Cross-User Notification Spoofing in `/notifications/{notificationId}`
- **Severity:** **HIGH**
- **Category:** Authorization / Injection (OWASP A01: Broken Access Control)
- **Evidence:**
  - [`firestore.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/firestore.rules#L1764-L1770) (`match /notifications/{notificationId}`)
- **Technical & Business Risk:**
  - `allow create` on `/notifications/{notificationId}` checks only that the caller is a verified user, `incoming().actorId == request.auth.uid`, `isRead == false`, and `createdAt == request.time`.
  - Any verified user can send fake notifications (including `type: 'kyc_updated'` or `type: 'system'`) to any other user's `userId` with social-engineering messages and internal links.
- **Remediation:**
  - In `firestore.rules`, restrict `type == 'kyc_updated'` and `type == 'system'` to `isAdmin()` (or require an active booking/job relationship for non-admin actors).

---

### `AUD-009` — High-Severity Transitive Dependency Vulnerability in `@grpc/grpc-js` (via `firebase`)
- **Severity:** **HIGH**
- **Category:** File & Dependency Security (OWASP A06: Vulnerable and Outdated Components)
- **Evidence:**
  - Executed command: `npm audit --json`
  - Advisory: `GHSA-m9gg-hp2v-232j` (`@grpc/grpc-js < 1.13.6`, CVSS 7.4 High, CWE-295) and `GHSA-f596-whhp-79r4` (CVSS 3.7 Low), pulled in via `firebase@13.4.0` → `@firebase/firestore`.
- **Technical & Business Risk:**
  - Note: `@grpc/grpc-js` is used by the Node.js gRPC transport of `@firebase/firestore` (the browser bundle uses WebChannel/fetch over HTTPS), so browser clients on Vercel are not directly exposed to Node gRPC certificate parsing. However, any Node runtime importing `@firebase/firestore` is affected.
- **Remediation:**
  - Add an `overrides` entry in `package.json` forcing `"@grpc/grpc-js": "^1.13.6"` and run `npm install` + `npm audit` to eliminate the vulnerable transitive version.

---

### `AUD-010` — Hardcoded Bootstrap Admin Email in Security Rules & Fallback Phone Numbers in Code
- **Severity:** **HIGH**
- **Category:** Data Security / Access Control (OWASP A07 / A05)
- **Evidence:**
  - [`firestore.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/firestore.rules#L34-L39) (`isBootstrappedAdmin()`)
  - [`storage.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/storage.rules#L27-L34) (`isAdmin()`)
  - [`src/app/providers/MarketplaceContext.tsx`](file:///home/antigravity/Rachid0204/ServiceProviders/src/app/providers/MarketplaceContext.tsx#L417) (`+212661428910`)
  - [`src/hooks/useBookings.ts`](file:///home/antigravity/Rachid0204/ServiceProviders/src/hooks/useBookings.ts#L75) (`+212661428910`)
  - [`src/hooks/useProviders.ts`](file:///home/antigravity/Rachid0204/ServiceProviders/src/hooks/useProviders.ts#L129) (`+212661000000`)
- **Technical & Business Risk:**
  - Hardcoding a personal email address in public repository security rules exposes the administrator's identity and couples privilege checks to an email claim rather than `/admins/{uid}` or Firebase Custom Claims (`request.auth.token.admin == true`).
  - Hardcoded fallback phone numbers (`+212661428910`, `+212661000000`) risk routing customer WhatsApp messages or calls to an unintended phone number if a provider or settings record is missing a phone field.
- **Remediation:**
  - Provision the admin's UID in `/admins/{uid}` (and/or custom claim `admin: true`) and remove the hardcoded email from `firestore.rules` and `storage.rules`.
  - Replace fallback phone numbers with empty-state guards that hide the WhatsApp/Call button if no valid phone number is configured.

---

### `AUD-016` — Public Scraping & App Check Not Yet Enforced in Production
- **Severity:** **MEDIUM**
- **Category:** API & Data Security (OWASP A01 / Automated Threats)
- **Evidence:**
  - [`firestore.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/firestore.rules#L603-L604) (`match /providers/{uid}` `allow get, list: if true;` includes unmasked `phone`)
  - [`src/firebase.ts`](file:///home/antigravity/Rachid0204/ServiceProviders/src/firebase.ts#L86-L99) (`VITE_FIREBASE_RECAPTCHA_SITE_KEY` is optional and not enforced)
- **Technical & Business Risk:**
  - Because `providers/{uid}` is publicly readable to support unauthenticated directory browsing and 1-tap mobile calling/WhatsApp, automated bots can list up to all provider documents and scrape Moroccan artisan phone numbers unless Firebase App Check is enforced.
- **Remediation:**
  - Configure `VITE_FIREBASE_RECAPTCHA_SITE_KEY` in Vercel environment variables and enable App Check enforcement on Cloud Firestore and Firebase Storage.
