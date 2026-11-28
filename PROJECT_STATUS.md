# Project Status — Moul L'Khedma (مول الخدمة)

## Platform Architecture & Completed Capabilities
### 1. Bilingual Marketplace Discovery (FR LTR / AR RTL)
- **12 Moroccan Trade Categories & 6 Cities**: Plomberie, Électricité, Peinture, Soutien Scolaire, Ménage, Climatisation, Menuiserie, Serrurerie, Électroménager, Jardinage, Déménagement, Maçonnerie across Casablanca, Rabat, Marrakech, Tangier, Fes, and Agadir.
- **Server-Side Filtered Discovery**: Composite-indexed Firestore `providers` queries with interactive list/map Leaflet split view, trade icons, distance sorting, hourly rate bounds, CIN verification, and real-time availability filters.
- **Modular Contexts**: Decomposed `LocaleContext`, `AuthSessionContext`, and `ModalsStateContext` composed cleanly under `MarketplaceProvider`.

### 2. Catalog-Prefilled Booking, Live Slot Availability & Post-Visit Quote Approval
- **Catalog-to-Booking Prefill**: Selecting any structured service from a Maâlem's public profile pre-fills the service item, pricing model (`fixed`, `hourly`, `quote_required`), and dynamic MAD estimate.
- **Live Slot Availability**: `BookingModal` evaluates weekly schedules, blocked dates, and active `scheduleLocks` to disable unavailable slots before submission.
- **Post-Visit On-Site Quote Approval (`revisedQuote`)**: Maâlems can submit an itemized diagnostic quote (labor + materials + note) on accepted bookings; clients approve inline (updating `estimatedMad` and transitioning to `in_progress`) or decline, with itemized printable HTML receipts and one-click rebooking.
- **Empirical Response Times**: Rolling `responseMinutes` updates automatically when providers accept pending bookings.

### 3. COD-First Operations, Dashboards, Messaging & Notifications
- **Cash on Completion (0% Launch Fee)**: Live payment flow with CMI escrow and RIB bank withdrawals cleanly feature-gated behind `systemSettings.cmiEscrowEnabled` (default `false`).
- **Modular Client & Provider Dashboards**: Client quick profile bar, job posts/proposals comparison, direct bookings with inline revised-quote actions; Provider 4-step Activation Checklist, mission management, availability calendar, catalog services, COD revenue & CSV statement export, and CIN KYC submission.
- **Preference-Aware Notifications**: Live notification feed respects user category preferences, with Email and SMS/WhatsApp channels transparently marked as coming soon.

### 4. Trust, Compliance & Admin Operations Console
- **Audited CNDP KYC Preview**: In-app `role="dialog"` document viewer for CIN/certificate inspection with automatic `adminLogs` audit logging before display (no popups or external tab opens).
- **Enhanced Operations Ledger & Settings**: Admin bookings filterable by status, city, payment method, and date range; toggleable `cmiEscrowEnabled` system setting; one-click CSV export for both bookings and immutable `adminLogs`.
- **Hardened Firestore Rules & Blueprint**: Synchronized `firebase-blueprint.json`, `firestore.indexes.json`, and `firestore.rules` enforcing strict state-machine transitions, post-visit quote integrity, and RBAC isolation.

## Active Status
- Production-ready launch posture (COD 0% commission live; CMI escrow feature-gated).
