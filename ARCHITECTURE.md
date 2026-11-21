# Architecture — Moul L'Khedma (مول الخدمة)

## 1. Overview
**Moul L'Khedma (مول الخدمة)** is a bilingual (French LTR / Arabic RTL) Moroccan service marketplace web application connecting households and businesses with vetted local craftsmen and service providers (*Maâlems*).

## 2. Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Leaflet + OpenStreetMap (`ProviderMap.tsx`).
- **Backend Server**: Node.js + Express (`server.ts`) serving `/api/health`, `/api/providers`, and Vite middleware on port 3000.
- **Database & Authentication**: Firebase Authentication (Google Sign-In) and Cloud Firestore (`serviceproviders-530c4`, database `ai-studio-721fde67-a110-4e25-bcc2-2f011a526460`).

## 3. Data Model & Security Rules (`firestore.rules`)
- **`/users/{userId}`**:
  - Stores dual-role user profiles (`role`: `'client'` or `'provider'`, `fullName`, `phone` matching `^\+212[5-7][0-9]{8}$`, `city`, `neighborhood`, `languagePref`, `verifiedBadge`, `createdAt`).
- **`/providers/{providerId}`**:
  - Stores public marketplace profiles for Maâlems (`category`, `bioFr`, `bioAr`, `hourlyRateMAD`, `fixedVisitFeeMAD`, `experienceYears`, `skills`, `portfolioImages`, `ratingAvg`, `reviewCount`, `isAvailableNow`, `verifiedBadge`, `location`).
- **`/bookings/{bookingId}`**:
  - Stores client service bookings (`bookingRef`, `clientId`, `clientName`, `clientPhone`, `providerId`, `providerName`, `providerPhone`, `category`, `serviceType`, `city`, `neighborhood`, `addressPin`, `description`, `problemPhotoUrl`, `preferredDate`, `preferredTimeSlot`, `paymentMethod`, `estimatedMad`, `status`, `reviewRating`, `reviewComment`, `createdAt`).
  - Readable and updatable only by the booking's `clientId` or `providerId`.
- **`/chats/{bookingId}/messages/{messageId}`**:
  - Stores real-time chat messages (`bookingId`, `clientId`, `providerId`, `senderId`, `senderName`, `senderRole`, `text`, `photoUrl`, `createdAt`).
  - Access restricted to the booking's `clientId` and `providerId`.
