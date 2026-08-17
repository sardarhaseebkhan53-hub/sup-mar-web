# QAVLIO Phase 2 Completion Report

**Date:** 17 August 2026

**Branch:** `arena/01a00fd0-sup-mar-web`

**Scope:** authentication, customer accounts, seller onboarding/profile, settings, sessions, profile media architecture, authorization and audit

## Status

Phase 2 is complete as a production-oriented web authentication and account foundation. It extends the approved Phase 1 design system without changing QAVLIO's brand or implementing later marketplace search, persisted listings, payments, advertisements, or AI execution.

QAVLIO remains a React/TypeScript web application with a Node/Express/TypeScript backend. No Flutter, Dart, React Native, or native mobile application files or dependencies exist.

## Authentication delivered

- Email/password registration with full name, email, optional phone, country, province/city, customer/seller intent, and backend-enforced Terms acceptance.
- Existing phone registration and phone-OTP verification remain available through the same identity rather than a separate account.
- Configurable password minimum plus mandatory uppercase, lowercase, number, and special character checks on frontend and backend.
- Password visibility fields and five-part strength feedback.
- Generic password login errors, account-unverified guidance, suspended/banned/locked states, and network-error mapping.
- Secure recovery responses that do not reveal account existence.
- Purpose-bound, HMAC-hashed, expiring, attempt-limited, resend-limited, single-use verification and reset challenges.
- GET and POST email-verification contracts plus rate-limited resend verification.
- Short-lived JWT access tokens held in memory and random refresh tokens stored hash-only server-side in `HttpOnly`, production-`Secure`, `SameSite=Lax` cookies.
- Refresh rotation, token-family reuse response, session/device listing, single-device logout, logout-all, password-change invalidation, and graceful login return paths.
- Origin validation on cookie-authenticated refresh/logout plus explicit credentialed CORS.
- Google/Facebook provider interface remains safely disabled until real OIDC credentials are configured.

## Roles and authorization

Supported server roles:

```text
customer
seller
admin
super_admin
support
moderator
```

Phase 2 actively exposes customer and seller experiences. Registration never accepts arbitrary roles. Seller privileges are granted by server-owned onboarding/profile services. Administrative routes continue to require current server roles; frontend route guards are UX only.

Central frontend identity now exposes `user`, `loading`, `isAuthenticated`, `role`, `hasRole`, login, logout, refresh-profile, OTP verification, and session clearing through typed `AuthProvider`/`useAuth`. `ProtectedRoute`, `SellerRoute`, and reusable `RoleRoute` preserve clear navigation boundaries.

## Customer account delivered

- `/account` overview plus compatibility `/dashboard` route.
- Profile editing for name, username, bio, language, country/province/city/area.
- Coarse location only; no precise home address required or displayed.
- Public profile preview, member-since value, contact presence, and independent verification states.
- Privacy settings for public/registered/private profile visibility and chat/call preference.
- Topic-level controls for messages, listing updates, account notices, promotions, platform announcements, and email delivery.
- Security alerts remain mandatory.
- Active-session management, password change, duplicate-account linking intake, deactivation, and separately confirmed anonymizing deletion.
- Favorites, saved searches, messages, recently viewed, reviews, notifications, security, and settings navigation with honest later-phase empty/foundation states.

## Seller account delivered

- Separate `SellerProfile` Mongoose model rather than exposing internal `User` fields publicly.
- Six-step onboarding: profile type/name, seller information, coarse location, contact preference, standards review, completion.
- One account can hold customer and seller roles; no duplicate account is required.
- Seller profile contains display name, description, avatar reference, coarse location, contact preference, verification status, rating/review aggregates, active/sold counts, response rate/time, account type, and timestamps.
- `/api/v1/sellers/profile` GET/POST/PATCH services with backend validation and authorization.
- `/seller`, `/seller/profile`, and `/seller/settings` protected UI routes.
- Seller navigation covers overview, listings, listing entry point, messages, promotions, analytics, reviews, payments, profile, verification, and settings.
- Dashboard presents a truthful empty listing state and does not fabricate analytics, reviews, payments, or inventory.
- Seller access never grants a verification badge automatically.

## Profile image architecture

Profile media uses a real Cloudinary signed direct-upload adapter:

1. The authenticated browser sends file metadata to `/users/avatar/upload-intent`.
2. Backend validates MIME type and size and signs a short-lived Cloudinary upload policy.
3. Browser uploads directly to cloud storage; image bytes never pass through MongoDB.
4. Cloudinary applies a bounded 1024px incoming optimization.
5. Browser sends provider URL/public ID/version/signature to `/users/avatar/complete`.
6. Backend verifies the provider response signature, HTTPS host, and user-scoped public-ID prefix before persisting URL/key.
7. Replace/remove operations clean up the previous provider asset and synchronize the seller avatar reference.

The UI validates JPEG/PNG/WebP and 5 MB limits, provides local preview, upload/change/remove controls, loading/error states, and an honest `MEDIA_PROVIDER_UNAVAILABLE` response when server credentials are not configured. Cloud credentials never enter Vite variables or frontend source.

## Backend TypeScript migration

All backend source, scripts, and tests were migrated from JavaScript to TypeScript:

- strict TypeScript configuration with NodeNext modules;
- typed Express request authorization context;
- typed JWT claims and cookie options;
- typed security/verification inputs;
- typed REST controllers/routes/services and Mongoose model boundary;
- `tsx` development/test runtime;
- production `tsc` output and Node start command;
- root lint, typecheck, test, and build gates cover frontend and backend.

There are no `.js` application files under `backend/src`, `backend/scripts`, or `backend/test`.

## API contracts

All endpoints use the Phase 0 versioned base `/api/v1`.

### Authentication

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `GET /auth/me`
- `GET|POST /auth/verify-email`
- `POST /auth/resend-verification`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- existing purpose-bound phone OTP endpoints

### Users

- `GET|PATCH /users/profile`
- `PATCH /users/password`
- `DELETE /users/account`
- compatibility `/users/me` endpoints
- profile verification/phone endpoints
- avatar intent/complete/remove endpoints
- sessions and notification-preference endpoints

### Sellers

- `GET /sellers/profile`
- `POST /sellers/profile`
- `PATCH /sellers/profile`

## Security controls

- bcrypt hashing; no plaintext passwords.
- Zod validation and Mongoose validation.
- Helmet, CORS allowlist, HPP, bounded bodies, input-key sanitation, request IDs, and standardized errors.
- Route/IP and challenge-level login, OTP, recovery, resend, and media-intent limits.
- Current server user/session/status/token-version/role checks on protected APIs.
- Generic recovery and credential errors.
- Password/session hashes, avatar storage keys, security internals, and provider credentials excluded from API presenters.
- Audit events for registration, login/failure, logout, OTP, email verification, password recovery/change, profile/email/avatar changes, seller onboarding, account status, deletion, and privileged role activity.
- Account deletion requires password plus exact `DELETE ACCOUNT`, revokes sessions, sets deleted state, and anonymizes optional profile/contact data while preserving required internal records.

## UI components

Phase 2 adds or types:

- `AuthProvider`, `ProtectedRoute`, `RoleRoute`, `SellerRoute`;
- `AuthLayout`, `AccountLayout`, `AccountSidebar`, `SellerSidebar`;
- `PasswordField`, `PasswordStrength`, `VerificationBanner`, `AuthAlert`;
- `ProfileForm`, `AvatarUpload`, seller profile/settings forms;
- security/session management, notification settings, privacy settings, and modal confirmations.

All important forms use visible labels, autocomplete values, keyboard-operable controls, accessible errors/status messages, touch-friendly actions, mobile stacking, and existing QAVLIO focus/reduced-motion rules.

## Validation evidence

The root `npm run check` gate covers:

- frontend and backend ESLint;
- strict frontend and backend TypeScript checks;
- **48 frontend tests** covering public/auth/account/seller/admin route behavior and interactions;
- **21 backend tests** covering registration, verification, login, recovery, trusted-origin enforcement, sessions, profile, seller, deletion, authorization, and validation integration;
- **69 total passing tests** with no unhandled errors;
- production Vite build;
- production backend TypeScript build.

The implementation also verifies zero prohibited Flutter/Dart/native mobile files and zero known dependency vulnerabilities.

## Intentional deployment boundaries

Real email/SMS delivery, Google/Facebook credentials, MongoDB Atlas, and Cloudinary credentials are deployment configuration—not fake local successes. In non-production without MongoDB, the tested identity repository remains ephemeral. Without Cloudinary configuration, profile selection/preview works but cloud upload fails closed with a clear unavailable message.

Later phases own category administration/search, persisted listings/media galleries, realtime buyer/seller chat, reviews, payments, promotions, ads, rewards, and AI execution.
