# Security Specification — Moul L'Khedma (`serviceproviders-530c4`)

## 1. Data Invariants
1. **Default-Deny Catch-All**: All paths not explicitly matched (`match /{document=**}`) deny all reads and writes.
2. **PII Isolation (`users/{uid}`)**: Because `users/{uid}` contains PII (`phone` in `+212` format), `get` and `list` access is strictly restricted to the document owner (`request.auth.uid == uid`) or a verified administrator (`isAdmin()`). Blanket `isSignedIn()` reads are forbidden.
3. **Self-Assigned Verification Prevention**: On user creation (`users/{uid}`), `verifiedBadge` MUST be `false` unless written by `isAdmin()`. During client/provider profile updates, users cannot modify `verifiedBadge`, `uid`, or `createdAt`.
4. **Strict Moroccan Schema & Bounds**:
   - `role` must be `'client'` or `'provider'`.
   - `phone` must match `^\+212[5-7][0-9]{8}$` and be between 12 and 16 chars.
   - `city` must be one of `'Casablanca'`, `'Rabat'`, `'Marrakech'`, `'Tangier'`, `'Fes'`, `'Agadir'`.
   - `languagePref` must be `'fr'` or `'ar'`.
   - `createdAt` and `updatedAt` must equal authoritative server time `request.time`.
5. **Service Request Ownership & Terminal Locking (`requests/{requestId}`)**:
   - A `ServiceRequest` can only be created when `clientId == request.auth.uid`, `exists(/databases/$(database)/documents/users/$(request.auth.uid))`, and initial `status == 'pending'`.
   - Once `status` reaches `'completed'` or `'cancelled'`, terminal state locking prevents further client/provider mutations.
   - List queries on `/requests/{requestId}` must filter by `resource.data.clientId == request.auth.uid || resource.data.providerId == request.auth.uid`.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Profile Creation**: `auth = null`, creating `/users/user_1` -> `PERMISSION_DENIED`.
2. **Unverified Email Write**: `auth.token.email_verified = false`, creating `/users/user_1` -> `PERMISSION_DENIED`.
3. **Identity Spoofing on User Create**: `auth.uid = 'user_1'`, writing `/users/user_2` or setting `uid: 'user_2'` -> `PERMISSION_DENIED`.
4. **Privilege Escalation (`verifiedBadge: true`) on Create**: `auth.uid = 'user_1'` setting `verifiedBadge: true` on registration -> `PERMISSION_DENIED`.
5. **Shadow Field Injection on Profile**: Payload includes `isAdmin: true` or `ghostField: 'x'` -> Rejected by `hasOnly()`.
6. **Invalid Moroccan Phone Format**: `phone: '0661234567'` (missing `+212`) or `phone: '+33612345678'` -> Rejected by regex `^\+212[5-7][0-9]{8}$`.
7. **Unsupported City Injection**: `city: 'Paris'` -> Rejected by city enum check.
8. **Cross-Customer PII Read**: `auth.uid = 'user_2'` attempting `get(/users/user_1)` -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: `createdAt` set to past/future timestamp instead of `request.time` -> `PERMISSION_DENIED`.
10. **Immutable Field Tampering on Update**: Modifying `createdAt` or `uid` on `/users/user_1` -> `PERMISSION_DENIED`.
11. **Orphaned Booking Creation**: Creating `/bookings/bk_1` when `/users/$(request.auth.uid)` does not exist -> `PERMISSION_DENIED`.
12. **Terminal State Re-opening**: Non-admin updating `/bookings/bk_1` when `resource.data.status` is `'reviewed'` or `'cancelled'` -> `PERMISSION_DENIED`.

## 3. Admin Dashboard RBAC & Audit Invariants
- **Bootstrapped Admin Guard**: `isAdmin()` requires `request.auth.token.email_verified == true` AND either `request.auth.token.email == 'wahbi.rachid@gmail.com'` or `exists(/databases/$(database)/documents/admins/$(request.auth.uid))`. Unverified emails spoofing the admin address are strictly denied.
- **Admin CIN Verification (`/users/{uid}` & `/providers/{uid}`)**: Verified admins can update `verifiedBadge` and availability across provider/user documents while schema validation (`isValidUserProfile`, `isValidProviderProfile`) and immutable fields (`uid`, `createdAt`) remain strictly enforced.
- **Admin Booking & CMI Escrow Oversight (`/bookings/{bookingId}`)**: Verified admins can list all bookings, release CMI escrow (`paymentStatus: 'paid'`), or override disputed booking states while preserving `isValidBooking(incoming())` and immutable `clientId`, `providerId`, and `createdAt`.
- **Admin Review Moderation (`/reviews/{reviewId}`)**: Verified admins can delete policy-violating reviews; non-admins are denied.
- **Immutable Audit Trail (`/adminLogs/{logId}`)**: Only verified admins can read and append audit log entries (`incoming().adminUid == request.auth.uid && incoming().createdAt == request.time`). Updates and deletes on `/adminLogs/{logId}` are permanently forbidden for all actors, including admins.

