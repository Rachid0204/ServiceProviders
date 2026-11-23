# 02 — MODULE-BY-MODULE FUNCTIONAL AUDIT
## Project: Moul L'Khedma (مول الخدمة)

Each module is classified using the strict audit taxonomy:
- **VERIFIED WORKING:** End-to-end functionality, persistence, validation, and rules verified.
- **PARTIALLY WORKING:** Core workflow functions, but specific sub-flows contain defects, contract mismatches, or bypasses.
- **IMPLEMENTED BUT UNVERIFIED:** Code exists in repo, but requires external console/cloud verification.
- **BROKEN:** Workflow fails or is non-functional under real usage.
- **MISSING:** Capability required for full production operations is not implemented.

---

## 1. Module Coverage Matrix

| § | Module | Primary Source Files | Firestore / Storage Collections | Status |
| :--- | :--- | :--- | :--- | :--- |
| **4.1** | Authentication & User Management | `src/firebase.ts`, `src/hooks/useMarketplaceAuth.ts`, `src/pages/auth/*`, `src/components/AuthModal.tsx`, `src/components/VerifyEmailView.tsx` | `/users/{uid}`, `/admins/{adminId}` | **PARTIALLY WORKING** |
| **4.2** | Customer Module | `src/pages/customer/*`, `src/components/dashboards/ClientDashboard.tsx`, `src/hooks/useFavorites.ts`, `src/utils/paymentsAdapter.ts` | `/users/{uid}`, `/jobPosts/{jobId}`, `/bookings/{bookingId}`, `/favorites/{favId}` | **PARTIALLY WORKING** |
| **4.3** | Service Provider Module | `src/pages/provider/ProviderDashboardPage.tsx`, `src/components/dashboards/ProviderDashboard.tsx`, `src/components/dashboards/ProviderServicesManager.tsx`, `src/components/dashboards/ProviderAvailabilityCalendar.tsx` | `/providers/{uid}`, `/services/{serviceId}`, `/providerAvailability/{uid}`, `/withdrawals/{withdrawalId}` | **PARTIALLY WORKING** |
| **4.4** | Identity & Document Verification (KYC) | `src/hooks/useProviderVerification.ts`, `src/components/dashboards/ProviderVerificationPanel.tsx`, `src/components/admin/AdminKycReviewSection.tsx`, `src/utils/storageUpload.ts` | `/providerDocuments/{uid}`, Storage `/providerDocuments/{uid}/{docType}/{fileName}` | **IMPLEMENTED BUT UNVERIFIED (Storage)** |
| **4.5** | Service Catalog & Discovery | `src/pages/public/HomePage.tsx`, `src/pages/public/ServicesPage.tsx`, `src/pages/public/ProviderPublicProfilePage.tsx`, `src/components/ProviderDiscoverySection.tsx`, `src/hooks/useProviders.ts` | `/providers/{uid}`, `/services/{serviceId}`, `/reviews/{reviewId}` | **VERIFIED WORKING** |
| **4.6** | Service Requests & Provider Matching | `src/hooks/useJobPosts.ts`, `src/components/PostJobModal.tsx`, `src/components/dashboards/ClientDashboard.tsx`, `src/components/dashboards/ProviderDashboard.tsx` | `/jobPosts/{jobId}`, Storage `/jobPosts/{jobId}/{userId}/{fileName}` | **PARTIALLY WORKING** |
| **4.7** | Quotations | `src/hooks/useJobPosts.ts`, `src/components/dashboards/ProviderDashboard.tsx`, `src/components/dashboards/ClientDashboard.tsx` | `/jobPosts/{jobId}/proposals/{providerId}`, `/scheduleLocks/{lockId}` | **PARTIALLY WORKING** |
| **4.8** | Booking & Scheduling | `src/hooks/useBookings.ts`, `src/components/BookingModal.tsx`, `src/components/BookingLifecycleModals.tsx`, `src/components/BookingTimeline.tsx`, `src/hooks/useProviderAvailability.ts` | `/bookings/{bookingId}`, `/scheduleLocks/{lockId}`, `/providerAvailability/{uid}` | **PARTIALLY WORKING** |
| **4.9** | Messaging & Notifications | `src/pages/messages/MessagesInboxPage.tsx`, `src/pages/notifications/NotificationsPage.tsx`, `src/components/ChatDrawerModal.tsx`, `src/hooks/useConversations.ts`, `src/hooks/useNotifications.ts` | `/conversations/{bookingId}`, `/chats/{bookingId}/messages/{messageId}`, `/chatReports/{reportId}`, `/notifications/{notificationId}`, `/notificationPreferences/{uid}` | **PARTIALLY WORKING** |
| **4.10** | Payments & Financial Workflows | `src/utils/paymentsAdapter.ts`, `src/utils/systemSettings.ts`, `src/hooks/useBookings.ts`, `src/components/BookingModal.tsx`, `src/components/BookingLifecycleModals.tsx`, `server.ts` | `/bookings/{bookingId}`, `/withdrawals/{withdrawalId}`, `/payments/{paymentId}`, `/refunds/{refundId}`, `/systemSettings/global` | **PARTIALLY WORKING (COD) / MISSING (Online Gateway)** |
| **4.11** | Reviews & Ratings | `src/components/ReviewModal.tsx`, `src/hooks/useBookings.ts`, `src/pages/public/ProviderPublicProfilePage.tsx`, `src/components/admin/AdminUsersReviewsSection.tsx` | `/reviews/{reviewId}`, `/reviewReports/{reportId}`, `/providers/{uid}`, Storage `/reviews/{bookingId}/{userId}/{fileName}` | **VERIFIED WORKING** |
| **4.12** | Disputes & Support | `src/pages/disputes/DisputesPage.tsx`, `src/hooks/useDisputes.ts`, `src/components/admin/AdminDisputesModerationSection.tsx` | `/disputes/{disputeId}`, Storage `/disputes/{disputeId}/{userId}/{fileName}` | **PARTIALLY WORKING** |
| **4.13** | Admin Dashboard | `src/pages/admin/AdminDashboardPage.tsx`, `src/components/admin/*`, `src/hooks/useAdminData.ts`, `src/hooks/useAdminModeration.ts`, `src/hooks/useAdminAccess.ts` | `/admins/{adminId}`, `/adminLogs/{logId}`, all collections | **PARTIALLY WORKING** |

---

## 2. Detailed Module Evaluations

### 4.1 Authentication & User Management — **PARTIALLY WORKING**
- **Verified Working:**
  - Google OAuth sign-in with automatic redirect fallback for Safari/WebViews ([`src/firebase.ts`](file:///home/antigravity/Rachid0204/ServiceProviders/src/firebase.ts#L168-L199)).
  - Email/Password registration, login, and password reset with localized FR/AR error mapping ([`src/utils/authHelpers.ts`](file:///home/antigravity/Rachid0204/ServiceProviders/src/utils/authHelpers.ts)).
  - Email verification enforcement via `<RequireAuth requireVerified={true} />` and [`VerifyEmailView.tsx`](file:///home/antigravity/Rachid0204/ServiceProviders/src/components/VerifyEmailView.tsx) with 3.5s auto-polling.
  - Self-service account deletion ([`handleDeleteAccount`](file:///home/antigravity/Rachid0204/ServiceProviders/src/hooks/useMarketplaceAuth.ts#L655-L678)) marks any active provider profile unavailable before deleting the Firebase Auth user.
  - Users cannot self-assign `verifiedBadge: true` (`firestore.rules` line 571, 581).
- **Defects & Gaps Found:**
  1. **Account Suspension Not Enforced (`AUD-003` — HIGH):** Admin can set `accountStatus: 'suspended'` on `/users/{uid}`, but neither [`RouteGuards.tsx`](file:///home/antigravity/Rachid0204/ServiceProviders/src/app/guards/RouteGuards.tsx) nor [`firestore.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/firestore.rules) blocks suspended users from accessing routes or writing documents.
  2. **Profile Save Overwrites & Fails if `accountStatus` or `termsAcceptedAt` Exists (`AUD-004` — HIGH):** [`handleSaveProfile`](file:///home/antigravity/Rachid0204/ServiceProviders/src/hooks/useMarketplaceAuth.ts#L269-L278) and [`saveFullProviderCard`](file:///home/antigravity/Rachid0204/ServiceProviders/src/hooks/useMarketplaceAuth.ts#L559-L568) call `batch.set(userRef, ..., { merge: false })` without carrying over `accountStatus` or `termsAcceptedAt`. Because `firestore.rules` line 582 forbids users from modifying/removing `accountStatus` or `termsAcceptedAt`, any profile update on a document containing those fields fails with `PERMISSION_DENIED`.
  3. **Consent Timestamp Never Persisted (`AUD-011` — MEDIUM):** [`RegisterPage.tsx`](file:///home/antigravity/Rachid0204/ServiceProviders/src/pages/auth/RegisterPage.tsx#L24-L66) validates the `termsAccepted` checkbox in React state, and `firestore.rules` line 153 whitelists `termsAcceptedAt`, but no code ever writes `termsAcceptedAt: serverTimestamp()` to `/users/{uid}`.
  4. **Unrestricted Role Switching (`AUD-014` — LOW):** Any user can switch their `role` between `'client'`, `'provider'`, and `'both'` in `/profile` (`firestore.rules` line 583).

### 4.2 Customer Module — **PARTIALLY WORKING**
- **Verified Working:**
  - Customer dashboard (`/dashboard`, `/customer/requests`) displays open job posts, received quotations with side-by-side comparison, direct bookings, visual timelines, favorites (`/favorites`), and downloadable HTML receipts (`recu-MK-XXXX.html`).
  - Customer records are strictly isolated by `clientId == request.auth.uid` in `firestore.rules`.
- **Defects & Gaps Found:**
  1. **Stock Sample Photo Button in Production Booking Modal (`AUD-015` — MEDIUM):** [`BookingModal.tsx`](file:///home/antigravity/Rachid0204/ServiceProviders/src/components/BookingModal.tsx#L697-L709) renders a "Joindre photo chantier témoin" button that attaches a hardcoded stock asset URL (`/src/assets/images/service_plumbing_repair_1794980477189.jpg`) to real customer bookings.
  2. **No Saved Addresses Book or Request Editing:** Customers enter neighborhood/address per booking/request; editing an open job post after submission is not implemented (only cancellation).

### 4.3 Service Provider Module — **PARTIALLY WORKING**
- **Verified Working:**
  - Bookmarkable tabs (`/provider/dashboard`, `/provider/jobs`, `/provider/missions`, `/provider/card`, `/provider/services`, `/provider/calendar`, `/provider/verification`, `/provider/earnings`).
  - Multi-service catalog CRUD (`/services/{serviceId}`) with 5 pricing models (`fixed`, `hourly`, `starting_from`, `quote_required`, `callout_plus_work`) in [`ProviderServicesManager.tsx`](file:///home/antigravity/Rachid0204/ServiceProviders/src/components/dashboards/ProviderServicesManager.tsx).
  - Weekly availability calendar (`/providerAvailability/{uid}`) with 7 days, 3 time slots, and blocked dates in [`ProviderAvailabilityCalendar.tsx`](file:///home/antigravity/Rachid0204/ServiceProviders/src/components/dashboards/ProviderAvailabilityCalendar.tsx).
  - Pure provider accounts (`role === 'provider'`) are prevented from browsing competing providers via `PublicDirectoryGuard`.
- **Defects & Gaps Found:**
  1. **Unbounded Withdrawal Requests & COD Earnings Inflation (`AUD-001` — CRITICAL):** See Section 4.10.
  2. **Single Primary Category Filtering:** Providers select one `category` on `/providers/{uid}`; although they can add services in `/services` under multiple categories, the main directory [`filterProviders`](file:///home/antigravity/Rachid0204/ServiceProviders/src/utils/marketplace.ts#L812) filters only by `p.category`.

### 4.4 Identity & Document Verification (KYC) — **IMPLEMENTED, STORAGE UNVERIFIED**
- **Verified Working (Code & Rules):**
  - Providers upload CIN front, CIN back, and optional diploma/certificate to `/providerDocuments/{uid}/{docType}/{fileName}` (max 8 MB, `image/*` or `application/pdf`) via [`ProviderVerificationPanel.tsx`](file:///home/antigravity/Rachid0204/ServiceProviders/src/components/dashboards/ProviderVerificationPanel.tsx).
  - Masked CIN (`maskMoroccanCin`, e.g., `BK-••••56`) and document URLs are stored in `/providerDocuments/{uid}` with `status: 'submitted'`.
  - Providers cannot self-verify (`firestore.rules` line 1477, 1491).
  - Admin review in [`AdminKycReviewSection.tsx`](file:///home/antigravity/Rachid0204/ServiceProviders/src/components/admin/AdminKycReviewSection.tsx) logs `document_viewed` to `/adminLogs` on every document click and syncs `verifiedBadge` on approval/rejection.
- **Defects & Gaps Found:**
  1. **`storage.rules` Not Auto-Deployed by CI (`AUD-012` — MEDIUM):** `.github/workflows/firebase-deploy.yml` deploys only `firestore:rules,firestore:indexes`. If `storage.rules` has not been manually published in Firebase Console, KYC uploads will fail or use stale rules.
  2. **Firebase Storage Download Token URLs:** [`uploadPrivateKycDocument`](file:///home/antigravity/Rachid0204/ServiceProviders/src/utils/storageUpload.ts#L162) calls `getDownloadURL(snapshot.ref)`, which generates a capability URL containing a Firebase `?token=...` bearer token stored in `/providerDocuments/{uid}`. While `/providerDocuments/{uid}` is private to the owner and admins, the download URL itself does not expire unless the token is revoked in Storage.

### 4.5 Service Catalog & Discovery — **VERIFIED WORKING**
- **Verified Working:**
  - 12 bilingual categories with English and French URL slugs (`/services/plumbing`, `/services/menuiserie`, etc.) resolved via [`resolveCategoryFromSlug`](file:///home/antigravity/Rachid0204/ServiceProviders/src/app/routePaths.ts#L176-L180).
  - Search by keyword, city (6 Moroccan cities), neighborhood (`quartier`), max hourly rate, verified CIN badge, immediate availability, favorites filter, GPS Haversine distance (`Near Me`), 6 sort modes, and pagination.
  - Seeded demo providers (`VETTED_PROVIDERS`) are strictly gated behind `isDemoFixturesEnabled()` (`false` by default in production).

### 4.6 Service Requests & Provider Matching — **PARTIALLY WORKING**
- **Verified Working:**
  - Customers create open job posts (`/jobPosts/{jobId}`) with budget (`50–100,000 MAD`), urgency (`urgent`, `this_week`, `flexible`), preferred date/time slot, and optional photo.
  - Providers filter open jobs (excluding their own) and submit proposals.
- **Defects & Gaps Found:**
  1. **No Automated Push Notification to Matching Providers on New Job Post:** Creating a job post writes to `/jobPosts/{jobId}` (which providers see in real time in `/provider/jobs`), but does not fan out notifications to matching providers in the same city/category.

### 4.7 Quotations — **PARTIALLY WORKING**
- **Verified Working:**
  - Itemized labor + materials breakdown (`laborCostMad + materialsCostMad == proposedPriceMad` enforced in both [`computeQuotationTotals`](file:///home/antigravity/Rachid0204/ServiceProviders/src/utils/marketplace.ts#L967-L979) and [`firestore.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/firestore.rules#L1173)).
  - Validity expiration check (`isQuotationExpired`) blocks accepting expired quotes.
  - Side-by-side quote comparison table in [`ClientDashboard.tsx`](file:///home/antigravity/Rachid0204/ServiceProviders/src/components/dashboards/ClientDashboard.tsx#L157-L199).
  - Accepting a quote runs a Firestore `runTransaction` that verifies the job is still `'open'`, the proposal is `'pending'`, and `/scheduleLocks/{lockId}` does not exist.
- **Defects & Gaps Found:**
  1. **Withdrawn or Rejected Quotes Cannot Be Revised or Re-Submitted (`AUD-007` — HIGH):** Because proposal IDs are `proposals/{providerId}` and `firestore.rules` blocks re-creating or updating `proposedPriceMad`, a provider who withdraws a quote is permanently locked out of quoting on that job.
  2. **Competing Pending Proposals Not Auto-Closed on Assignment (`AUD-013` — MEDIUM):** When a customer accepts Proposal A, Proposals B and C remain in `status: 'pending'` instead of transitioning to `'rejected'`, and competing providers receive no notification that the job was assigned.

### 4.8 Booking & Scheduling — **PARTIALLY WORKING**
- **Verified Working:**
  - Strict sequential state machine (`pending → accepted → in_progress → completed → reviewed`, plus `cancelled` from `pending`/`accepted`) enforced in [`canTransitionBookingStatus`](file:///home/antigravity/Rachid0204/ServiceProviders/src/utils/marketplace.ts) and [`firestore.rules`](file:///home/antigravity/Rachid0204/ServiceProviders/firestore.rules#L754-L913).
  - Completing a booking atomically increments `completedJobs` on `/providers/{uid}` using `lastCompletedBookingId` replay protection (`firestore.rules` lines 653–669).
- **Defects & Gaps Found:**
  1. **Direct Bookings & Reschedules Bypass `/scheduleLocks` and `/providerAvailability` (`AUD-006` — HIGH):** [`submitBooking`](file:///home/antigravity/Rachid0204/ServiceProviders/src/hooks/useBookings.ts#L235-L341) and [`rescheduleBooking`](file:///home/antigravity/Rachid0204/ServiceProviders/src/hooks/useBookings.ts#L499-L529) do not check `isProviderSlotAvailable` or create/update `/scheduleLocks/{lockId}`.
  2. **Cancelled Bookings Leave Orphaned `/scheduleLocks` (`AUD-006` — HIGH):** [`cancelBookingWithReason`](file:///home/antigravity/Rachid0204/ServiceProviders/src/hooks/useBookings.ts#L459-L496) updates `/bookings/{bookingId}` to `'cancelled'` but never deletes `/scheduleLocks/{lockId}`, leaving the provider's slot permanently locked for future quote acceptances.

### 4.9 Messaging & Notifications — **PARTIALLY WORKING**
- **Verified Working:**
  - Dedicated `/messages` & `/messages/:bookingId` inbox ([`MessagesInboxPage.tsx`](file:///home/antigravity/Rachid0204/ServiceProviders/src/pages/messages/MessagesInboxPage.tsx)) with search, pagination ("Charger les anciens messages"), read receipts (`Vu` / `تمت القراءة`), photo attachments, block/unblock toggle, and abuse reporting (`/chatReports/{reportId}`).
  - `/notifications` center ([`NotificationsPage.tsx`](file:///home/antigravity/Rachid0204/ServiceProviders/src/pages/notifications/NotificationsPage.tsx)) + top-bar Notification Bell dropdown + persistent `/notificationPreferences/{uid}`.
  - Conversation and message reads/writes are strictly isolated to booking participants (`clientId` or `providerId`) in `firestore.rules`.
- **Defects & Gaps Found:**
  1. **Cross-User Notification Spoofing (`AUD-005` — HIGH):** Any verified user can write arbitrary notifications to `/notifications/{id}` for any recipient `userId`.
  2. **Legacy `ChatDrawerModal` Does Not Sync `/conversations` or Notifications (`AUD-008` — HIGH):** Clicking "Messagerie" inside booking cards opens [`ChatDrawerModal.tsx`](file:///home/antigravity/Rachid0204/ServiceProviders/src/components/ChatDrawerModal.tsx), which writes to `chats/{bookingId}/messages` without calling `updateConversationOnMessage` or `dispatchUserNotification`, causing `/messages` inbox previews and unread counts to miss those messages.

### 4.10 Payments & Financial Workflows — **PARTIALLY WORKING (COD) / MISSING (ONLINE GATEWAY)**
- **Verified Working:**
  - Default launch commission is `0%` (`DEFAULT_SYSTEM_SETTINGS.platformFeePct = 0` in [`src/utils/systemSettings.ts`](file:///home/antigravity/Rachid0204/ServiceProviders/src/utils/systemSettings.ts)).
  - Cash on Completion (`cash_on_completion`) is the only selectable payment method in [`BookingModal.tsx`](file:///home/antigravity/Rachid0204/ServiceProviders/src/components/BookingModal.tsx#L750-L786).
  - Printable/downloadable bilingual FR/AR HTML receipts (`INV-MK-XXXX`) with XSS-escaped fields in [`src/utils/paymentsAdapter.ts`](file:///home/antigravity/Rachid0204/ServiceProviders/src/utils/paymentsAdapter.ts).
- **Defects & Gaps Found:**
  1. **Unbounded Provider Withdrawals & COD Balance Mixing (`AUD-001` — CRITICAL):** Providers can request withdrawals up to `100,000 MAD` without balance verification, and COD bookings are mixed into `settledEarningsMad`.
  2. **Simulated CMI Escrow Still Permitted in `firestore.rules` and Admin/Booking UI (`AUD-002` — CRITICAL):** `firestore.rules` still allows creating bookings with `paymentMethod: 'cmi_escrow'` and client-side release of `escrow_held → paid`.
  3. **No Live Online Payment Gateway Integration:** `/api/payments/cmi-intent` in `server.ts` returns `501 Not Implemented` (and `server.ts` is not deployed on Vercel). `/payments` and `/refunds` collections have rules in `firestore.rules` but zero application code writing or reading them.

### 4.11 Reviews & Ratings — **VERIFIED WORKING**
- **Verified Working:**
  - Only the booking's `clientId` can review a `'completed'` booking (`firestore.rules` lines 708–716).
  - Deterministic `reviewId == bookingId` prevents duplicate reviews.
  - Atomic transaction updates `/bookings/{bookingId}` (`status: 'reviewed'`), creates `/reviews/{bookingId}` (with up to 3 optional photos), and updates `ratingAvg` and `reviewCount` on `/providers/{uid}`.
  - Verified users can report abusive reviews to `/reviewReports/{reportId}`, and Admins can delete reviews with automatic rating recalculation.

### 4.12 Disputes & Support — **PARTIALLY WORKING**
- **Verified Working:**
  - Verified booking participants can open disputes on `/disputes` ([`DisputesPage.tsx`](file:///home/antigravity/Rachid0204/ServiceProviders/src/pages/disputes/DisputesPage.tsx)) with 6 structured reasons, 15–1000 char description, and up to 4 evidence photos.
  - Admin can update dispute status and resolution summary in `/admin/disputes`, notifying both parties and logging `dispute_resolved` to `/adminLogs`.
- **Defects & Gaps Found:**
  1. **Participant Evidence Append UI Missing:** Although `firestore.rules` line 1938 allows participants to append `evidenceUrls` to an open dispute, `DisputesPage.tsx` only allows uploading evidence at initial dispute creation.

### 4.13 Admin Dashboard — **PARTIALLY WORKING**
- **Verified Working:**
  - Bookmarkable `/admin/*` sub-routes (`/admin/dashboard`, `/admin/kyc`, `/admin/providers`, `/admin/bookings`, `/admin/disputes`, `/admin/withdrawals`, `/admin/users`, `/admin/reviews`, `/admin/settings`, `/admin/audit`).
  - Protected by `<RequireAdmin />` in the router, `isLiveAdmin` in `AdminDashboard.tsx`, and `isAdmin()` in `firestore.rules` and `storage.rules`.
  - Law 09-08 / CNDP mandatory `document_viewed` audit logging when inspecting private KYC files in `/admin/kyc`.
- **Defects & Gaps Found:**
  1. **No Granular Admin Role Separation:** All admins share full `isAdmin()` super-admin privileges (no separate read-only moderator vs. finance vs. super-admin enforcement in `firestore.rules`).
  2. **No Dynamic Category or City CRUD:** The 12 categories and 6 cities are hardcoded in TypeScript (`marketplace.ts`) and `firestore.rules` (`isValidCategory`, `isValidCity`) rather than managed dynamically in Firestore.
