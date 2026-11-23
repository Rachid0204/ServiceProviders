# 05 — UX, UI, ACCESSIBILITY & MOROCCAN LOCALIZATION AUDIT
**Project:** Moul L'Khedma (مول الخدمة)  
**Audit Date:** 2026-11-23  
**Target Market:** Kingdom of Morocco (French / Arabic RTL, MAD Currency, Moroccan Cities & Quartiers)

---

## 1. Role-by-Role User Experience Evaluation

### 1.1 Customer Experience
- **Strengths:**
  - Instant search and filtering across 12 Moroccan home/personal service categories and major cities (Casablanca, Rabat, Marrakech, Tanger, Fès, Agadir) with neighborhood (`quartier`) specificity.
  - Clear distinction between **Direct Booking** (`BookingModal`) and **Public Request for Quotations** (`PostJobModal` → side-by-side quote comparison table in `ClientDashboard`).
  - Cash on Completion (`Paiement Cash à la fin / الدفع نقداً عند انتهاء الخدمة`) is clearly presented as the primary payment mode, with 0% commission transparency and downloadable HTML/print bilingual receipts (`src/services/receiptGenerator.ts`).
  - Easy access to WhatsApp fallback links (`buildWhatsAppUrl`) alongside in-app messaging (`/messages`).
- **UX Defects Identified:**
  - **Demo Sample Photo Button in Production (`AUD-015` — MEDIUM):** `src/components/BookingModal.tsx` (lines 697–709) displays a `"Joindre photo chantier témoin"` button next to the real camera/file uploader. Clicking it attaches a hardcoded stock plumbing image (`/src/assets/images/service_plumbing_repair_1794980477189.jpg`) to a real customer booking request.
  - **Dual Messaging Interfaces (`AUD-008` — HIGH):** Clicking "Ouvrir le chat" on a booking card opens `ChatDrawerModal`, whereas clicking "Messages" in the top bar or sidebar opens `/messages` (`MessagesInboxPage`). Messages sent via `ChatDrawerModal` do not update the `/messages` conversation list or notify the recipient.
  - **Residual CMI Escrow UI in Detail Modal (`AUD-002` — CRITICAL):** While `BookingModal` marks CMI as *"Bientôt disponible"*, `BookingDetailModal.tsx` still displays CMI escrow release explanation text if a booking has `paymentMethod: 'cmi_escrow'`.

### 1.2 Service Provider (Maâlem) Experience
- **Strengths:**
  - Dedicated 5-tab workspace (`/provider/dashboard`, `/provider/leads`, `/provider/bookings`, `/provider/Verification`, `/provider/earnings`).
  - Guided KYC verification card uploading CIN Front, CIN Back, and Diplomas/Certificates to private Firebase Storage (`provider-kyc/{uid}/...`) with clear status badges (`Non soumis`, `En cours de vérification`, `Vérifié CNDP`, `Action requise : Motif de refus`).
  - Interactive 7-day × 3-slot (`Matin 08h-12h`, `Après-midi 14h-18h`, `Soir 18h-22h`) availability grid (`/providerAvailability/{uid}`).
  - Itemized quotation builder supporting dynamic line items (`Main d'œuvre`, `Pièces & fournitures`, `Déplacement`), live total calculation in `MAD`, and estimated duration.
- **UX Defects Identified:**
  - **Misleading Wallet & Withdrawal Balance (`AUD-001` — CRITICAL):** The `/provider/earnings` tab includes completed `cash_on_completion` bookings inside `"Revenus Encaissés (Net)"` and allows the provider to submit a bank transfer withdrawal request (`Demander un virement`) even when the platform holds `0 MAD` on their behalf.
  - **Irreversible Quote Withdrawal (`AUD-007` — HIGH):** If a provider withdraws a proposal on a lead to adjust their price, the UI shows *"Offre retirée"*, and they are permanently blocked from submitting a revised proposal on that lead.

### 1.3 Administrator Experience
- **Strengths:**
  - Dedicated `/admin/:section` layout (`src/app/layouts/AdminLayout.tsx`) with 9 bookmarkable sections (`overview`, `kyc`, `bookings`, `disputes`, `jobs`, `finance`, `users`, `reviews`, `audit`).
  - CNDP Law 09-08 compliant KYC review (`src/components/admin/AdminKycSection.tsx`): CIN numbers are masked (`••••••`) and document previews are blurred until the admin clicks `"Révéler & Auditer"`, which writes an immutable `document_viewed` record to `/adminAuditLogs`.
  - Structured dispute mediation (`AdminDisputesSection.tsx`) and user account suspension modal (`AdminUsersReviewsSection.tsx`) with mandatory reason prompts.
- **UX Defects Identified:**
  - **Ineffective Suspension Enforcement (`AUD-003` — HIGH):** Although the admin sees an `"Account Suspended"` badge after suspending a user, the suspended user is not blocked from continuing to use the platform.

---

## 2. Mobile Responsiveness & Ergonomics Audit

| Check | Implementation Evidence | Verdict |
|---|---|---|
| **320px–430px Small Screen Layout** | Responsive Tailwind grids (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`), horizontal scrollable filter pills (`overflow-x-auto no-scrollbar`), and compact mobile padding (`px-4 sm:px-6`). | **PASS** |
| **Mobile Bottom Navigation Bar** | `src/components/MobileBottomNav.tsx` provides persistent 5-tab thumb navigation on mobile viewports (`md:hidden`), plus slide-out mobile drawer in `DashboardLayout.tsx`. | **PASS** |
| **Touch Target Sizes** | Primary CTA buttons, filter pills, and bottom nav items use `min-h-[44px]` or `py-3 px-4` touch areas. | **PASS** |
| **Modal Overflow on Mobile** | Modals (`BookingModal`, `PostJobModal`, `BookingDetailModal`) use `max-h-[90vh] overflow-y-auto` containers with sticky headers/footers. | **PASS** |

---

## 3. Accessibility (a11y) Audit

| Check | Findings & Evidence | Verdict |
|---|---|---|
| **Document Language & Direction Attributes** | `src/context/MarketplaceContext.tsx` (lines 201–205) dynamically sets `document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'` and `document.documentElement.lang = lang`.Verified via `src/tests/productionReadiness.test.tsx`. | **PASS** |
| **Semantic Landmarks & Headings** | Pages use `<header>`, `<nav>`, `<main>`, `<footer>`, and hierarchical `<h1>`–`<h3>` headings. | **PASS** |
| **Form Labels & Error Announcements** | Inputs in `LoginPage`, `RegisterPage`, `BookingModal`, and `PostJobModal` include visible labels and validation messages. | **PASS** |
| **Keyboard Focus Trapping in Modals (`AUD-020` — LOW)** | Modals (`BookingModal.tsx`, `PostJobModal.tsx`, `OnboardingModal.tsx`, `ChatDrawerModal.tsx`) support `Escape` or backdrop-click dismissal, but do **not** implement keyboard `Tab` focus trapping or automatic focus restoration to the trigger element upon close. | **PARTIAL (`AUD-020`)** |

---

## 4. Moroccan Localization & Bilingual (FR/AR) Audit

| Localization Dimension | Implementation Evidence | Status |
|---|---|---|
| **Dictionary Parity (`src/i18n/translations.ts`)** | `node scripts/check-i18n.mjs` verified 100% key parity between `translations.fr` and `translations.ar` (0 missing keys, 0 empty values). | **PASS** |
| **Inline Hardcoded FR/AR Ternaries (`AUD-017` — MEDIUM)** | Approximately 60% of newly added dashboard and page copy (`ProviderDashboard.tsx`, `ClientDashboard.tsx`, `DisputesPage.tsx`, `NotificationsPage.tsx`, `AdminKycSection.tsx`, `AdminDisputesSection.tsx`) uses inline `isAr ? '...' : '...'` expressions directly in JSX instead of `t(...)` keys in `src/i18n/translations.ts`. While both French and Arabic strings are provided inline, they bypass `scripts/check-i18n.mjs` validation. | **PARTIAL (`AUD-017`)** |
| **Arabic Typography & RTL Layout** | `index.html` loads Google Fonts `Cairo` alongside `Plus Jakarta Sans` and `Inter`. RTL direction (`dir="rtl"`) flips flex/grid order properly across layouts. | **PASS** |
| **Moroccan Currency (`MAD` / `د.م.`)** | Prices consistently display in Moroccan Dirhams (`MAD` in FR, `د.م.` or `درهم` in AR). Minimum booking/quote floor is `50 MAD` (`MIN_PRICE_MAD = 50`). | **PASS** |
| **Moroccan Phone Validation** | `MOROCCO_PHONE_REGEX = /^(?:\+212|0)([5-7]\d{8})$/` enforced in client forms (`src/utils/validation.ts`) and in `firestore.rules` (`isValidMoroccoPhone`). However, hardcoded fallback phone numbers (`+212661428910`, `+212661000000`) exist in normalizers (`AUD-010`). | **PARTIAL (`AUD-010`)** |
| **Moroccan Cities & Quartiers** | Authentic Moroccan cities and neighborhoods (`Maârif`, `Anfa`, `Bourgogne`, `Sidi Maarouf`, `Hay Riad`, `Agdal`, `Guéliz`, `Malabata`, `Talborjt`) with accurate GPS coordinates in `src/data/marketplace.ts`. | **PASS** |
| **Date & Timezone Handling (`AUD-020` — LOW)** | Date pickers use `.toISOString().slice(0, 10)` (UTC date) and `toLocaleDateString(isAr ? 'ar-MA' : 'fr-MA')` without explicitly specifying `timeZone: 'Africa/Casablanca'`. Between 00:00 and 01:00 GMT+1 (Morocco standard time), UTC date strings can shift by 1 day. | **PARTIAL (`AUD-020`)** |
