# Project Status — Moul L'Khedma (مول الخدمة)

## Completed Work
### Phase 1: Foundation, Bilingual FR/AR Architecture & Firebase Onboarding
- **Bilingual Support (French LTR & Arabic RTL)**: Instant language switcher in the header dynamically updates `document.documentElement.dir` (`ltr` / `rtl`) and `lang` (`fr` / `ar`), typography (`Plus Jakarta Sans` + `Cairo`), and all interface copy.
- **Firebase Provisioning & Security**: Connected to Firebase project `serviceproviders-530c4` (Firestore database `ai-studio-721fde67-a110-4e25-bcc2-2f011a526460`).
- **Dual-Role Onboarding (`users/{uid}`)**: Supports Client and Service Provider (Maâlem / Prestataire) registration with strict validation for Moroccan phone numbers (`+212[5-7]XXXXXXXX`).

### Phase 2: Service Provider Discovery, Geolocation, and Trust Layer
- **Firestore `providers/{uid}` Collection & Security Rules**:
  - Updated `firebase-blueprint.json` and `firestore.rules` with `ProviderProfile` schema validation.
- **Seeded 8 Vetted Moroccan Providers**:
  - Seeded 8 realistic bilingual (FR/AR) providers across **Casablanca**, **Rabat**, and **Tangier** covering all 6 categories.
- **Interactive Search, Filters, Geolocation & Map/List Split View**:
  - Filter by trade category, city, neighborhood, hourly rate slider in MAD, `"CIN Vérifiée"`, `"Disponible maintenant"`, and `"Près de moi / قريب مني"` using `navigator.geolocation` + Leaflet OpenStreetMap split view.

### Phase 3: Booking Workflow, Real-Time In-App Chat, WhatsApp Bridge, and Payment Tracking
- **Booking Lifecycle (`bookings/{bookingId}`)**:
  - Clients can book a Maâlem by selecting Service Type, Preferred Date & Time Slot (`09:00 - 12:00`, `14:00 - 17:00`, `18:00 - 20:00`), Problem Description with optional photo upload, Address/Pin with GPS coordinate helper, and Payment Method (`Cash on Completion / الدفع عند الخدمة` or `Card / CMI Online Escrow`).
  - Full lifecycle statuses: `pending` -> `accepted` -> `in_progress` -> `completed` -> `reviewed` (plus `cancelled`).
  - **Provider Dashboard ("Espace Maâlem / لوحة المعلم")**: Providers can toggle `isAvailableNow`, accept or decline incoming `pending` requests, start `accepted` jobs (`in_progress`), and mark jobs `completed`.
  - **Client Dashboard ("Mes Demandes / طلباتي")**: Clients track active bookings and submit a 1–5 star review + comment once status is `completed`, automatically recalculating `ratingAvg` and `reviewCount` on the provider document.
- **Real-Time In-App Chat (`chats/{bookingId}/messages/{messageId}`)**:
  - Real-time Firestore `onSnapshot` chat drawer inside each booking thread so client and Maâlem can coordinate arrival details and share photos.
- **One-Click WhatsApp Integration**:
  - Every provider card and every active booking includes a green `"Contacter sur WhatsApp / تواصل عبر واتساب"` button that formats the Moroccan phone number (`212...`) and opens `https://wa.me/{phone}?text={encodedMessage}` pre-filled in FR or AR with the booking reference and service category.

## Active Phase
- Phase 3 Complete.

## Blockers
- None.
