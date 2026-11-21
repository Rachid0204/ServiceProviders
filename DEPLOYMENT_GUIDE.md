# Deployment & Firebase Configuration Guide — Moul L'Khedma (مول الخدمة)

## 1. Firebase Project Configuration (`serviceproviders-530c4`)
The application is wired to Firebase project **`serviceproviders-530c4`** (Firestore database `ai-studio-721fde67-a110-4e25-bcc2-2f011a526460`).

### Environment Variables (`.env.example` / `src/firebase.ts`)
`src/firebase.ts` resolves all Firebase configuration keys from `VITE_FIREBASE_*` environment variables first, falling back to `firebase-applet-config.json` and safe placeholder values for CI/CD builds:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN` (`serviceproviders-530c4.firebaseapp.com`)
- `VITE_FIREBASE_PROJECT_ID` (`serviceproviders-530c4`)
- `VITE_FIREBASE_STORAGE_BUCKET` (`serviceproviders-530c4.firebasestorage.app`)
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_FIRESTORE_DATABASE_ID` (`ai-studio-721fde67-a110-4e25-bcc2-2f011a526460`)
- `VITE_FIREBASE_MEASUREMENT_ID`

## 2. Firestore & Storage Security Rules (`firestore.rules` & `storage.rules`)
- **Public Reads on `providers` and `reviews`**:
  - Anyone can read `/providers/{uid}` and `/reviews/{reviewId}` to browse the marketplace, view geolocated pins, and inspect verified customer reviews.
- **Strict Owner-Only Profile Edits**:
  - Authenticated users with verified emails can only create or update their own `/users/{uid}` and `/providers/{uid}` documents (`request.auth.uid == uid`).
  - `verifiedBadge` cannot be self-assigned or escalated by standard users.
- **Participant-Isolated Bookings & Real-Time Chat**:
  - Only authenticated users can create documents in `/bookings/{bookingId}` (`incoming().clientId == request.auth.uid`).
  - Only the involved `clientId` or `providerId` on a booking can read or update `/bookings/{bookingId}` or read/send messages in `/chats/{bookingId}/messages/{messageId}`.
- **Firebase Storage Rules (`storage.rules`)**:
  - `/providers/{uid}/portfolio/{fileName}`: Publicly readable (`allow read: if true;`), writable only by the owner (`request.auth.uid == uid`) for image uploads $\le 5\text{ MB}$.
  - `/bookings/{bookingId}/{userId}/{fileName}` & `/chats/{bookingId}/{userId}/{fileName}`: Readable and writable only by the authenticated booking participants for image uploads $\le 5\text{ MB}$.

## 3. Google Cloud Run Container Startup (`server.ts`)
- `server.ts` listens on `Number(process.env.PORT || 8080)` bound to `0.0.0.0`.
- Build and start commands in `package.json`:
  - Build frontend bundle: `npm run build`
  - Start production server on Cloud Run: `npm start` (`node server.ts`)
  - Health check endpoint: `GET /api/health`
