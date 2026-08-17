# 12. Phase 2 Identity and Account System

## 12.1 Delivered boundary

Phase 2 makes identity the gateway to marketplace participation. Public visitors can browse categories/listings/help, but saving, messaging/contacting, reporting, selling, account settings, and dashboards route through authentication. `returnTo` is constrained to local paths and preserves the intended protected destination. Seller-only paths pass through seller onboarding; administrative paths require a current server-side admin or super-admin role.

The visual system extends Phase 1 navy/violet/gold branding. No Phase 2 reference attachment was present in the repository context, so implementation intentionally preserved the approved Phase 1 identity rather than inventing a conflicting brand.

## 12.2 Authentication flows

### Email registration

1. Multi-step intent/method → identity/password → coarse location/terms.
2. API normalizes and uniqueness-checks email and username.
3. Password must be 10–128 characters with upper/lowercase and a number; bcrypt cost 12 outside tests.
4. Account is created `pending_verification`; a random 256-bit email token is HMAC-hashed in a time-limited challenge.
5. Verification consumes the token once, marks email verified, and activates the account.
6. Unverified, suspended, banned, deactivated, or deleted accounts cannot sign in.

### Phone registration and OTP login

Pakistan `03xxxxxxxxx`, `92…`, and `+92…` inputs normalize to E.164; the design supports future international E.164 numbers. Six-digit OTPs use cryptographic randomness, HMAC server validation, ten-minute default expiry, five attempts, cooldown, resend count, route/IP limits, and a 15-minute lock after excessive failures. Secrets never appear in API responses.

Purposes are isolated: `phone_signup`, `phone_login`, `phone_verification`, `account_link`, `password_reset_phone`. A code from one purpose cannot satisfy another.

### Password login and sessions

Email or phone + password returns a short-lived JWT access token and sets a random refresh token as `HttpOnly`, `SameSite=Lax`, production-`Secure` cookie. Only a SHA-256 refresh hash is stored. Every protected API request validates:

- JWT signature, issuer, audience, expiry, and algorithm;
- active server session and session expiry/revocation;
- current user status and current token version;
- current database roles, not frontend claims.

Refresh rotation revokes the old session record and creates a new record in the same family. Replay of a rotated token revokes the family. Password/status/role changes invalidate sessions. The frontend keeps access tokens only in memory and silently attempts the cookie refresh after reload.

### Recovery

Forgot-password responses are uniform to reduce account enumeration. Eligible accounts receive a single-use email token or phone OTP. Reset validates purpose/target/expiry/attempts, hashes the new password, increments token version, and revokes every session.

## 12.3 Roles and status

Roles are arrays because one identity may be both customer and seller. User-controlled registration can request only `customer` or customer+`seller`; it cannot assign privileged roles. Server policy supports `customer`, `seller`, `moderator`, `support`, `admin`, and `super_admin`. The CLI bootstrap creates the first super administrator only; normal admins cannot grant/revoke privileged roles or manage a privileged account.

Account states: `active`, `pending_verification`, `suspended`, `banned`, `deactivated`, `deleted`. Deactivation/deletion is soft; critical audit, trust, moderation, and financial records follow retention policy.

## 12.4 Verification and trust

User verification embeds separately managed records for email, phone, identity, business, and trusted seller. Each supports `not_verified`, `pending`, `verified`, `rejected`, and `expired`, plus timestamps/reason. Becoming a seller never grants a trust badge. Identity/business/trusted-seller states remain reviewed admin workflows.

A phone can be added, changed, reverified, or removed only when an alternate verified email remains and the password is confirmed. Duplicate phone ownership returns a linking-required response rather than silently reassigning identity.

## 12.5 Account linking

Linking is never automatic:

1. Signed-in user provides target phone and current password.
2. Server confirms a distinct account owns the normalized phone.
3. A short-lived link request is created; OTP is tied to that exact request.
4. User enters OTP and exact `LINK ACCOUNTS` warning confirmation.
5. Request becomes `ready_for_review`; no data is merged yet.
6. Later audited eligibility/reconciliation handles listings, subscriptions, payments, reviews, blocks, and conflicting profile data.

This is safer than immediate merging and accommodates business/payment restrictions.

## 12.6 Social authentication

`GET /api/v1/auth/social/providers` returns Google, Facebook, and Apple capability records. Adapters are unconfigured and UI controls are explicitly disabled. Future providers use OIDC/OAuth 2.0 authorization-code + PKCE, exact redirect URIs, state/nonce, verified email claims, provider-subject binding, and explicit linking after reauthentication. A matching email never silently merges identities.

## 12.7 Models

- **User:** name/username, email/phone, bcrypt hash, roles, status, avatar/about, locale, coarse/optional geo location, five verification records, seller state/type, notification preferences, login lock/token version/2FA flag, timestamps and soft-deletion timestamps.
- **Session:** refresh hash, family, device/browser/platform, hashed IP and approximate location, user agent, login/last-active/expiry, revocation reason.
- **VerificationChallenge:** target, channel, isolated purpose, HMAC secret hash, attempts/resends, expiry/cooldown/lock/consume, metadata.
- **SecurityEvent:** user/actor, event type/outcome/severity, request ID, hashed IP, agent, safe metadata; immutable/auditable.
- **AccountLinkRequest:** both identity IDs, phone, identity/OTP/warning timestamps, state, review actor, expiry.

Production uses MongoDB/Mongoose. Automated tests and no-Mongo local previews use a process-memory repository with identical service contracts; it is ephemeral and production startup still requires MongoDB.

## 12.8 API endpoints

All paths are under `/api/v1`.

### Public authentication

| Method | Path | Purpose |
|---|---|---|
| GET | `/auth/capabilities` | Supported methods/purposes/social status |
| GET | `/auth/social/providers` | Disabled/configured provider capabilities |
| POST | `/auth/register` | Email or phone multi-method registration |
| POST | `/auth/login` | Email/phone password login |
| POST | `/auth/otp/request` | Phone OTP login request |
| POST | `/auth/verify-otp` | Signup/login/add-phone OTP verification |
| POST | `/auth/resend-otp` | Purpose-bound resend with cooldown |
| POST | `/auth/verify-email` | Consume email verification token |
| POST | `/auth/forgot-password` | Uniform recovery request |
| POST | `/auth/reset-password` | One-time reset and session invalidation |
| POST | `/auth/refresh` | Rotate refresh session and access token |
| POST | `/auth/logout` | Revoke refresh session/clear cookie |

### Authenticated account

| Method | Path | Purpose |
|---|---|---|
| GET/PATCH/DELETE | `/users/me` | Read/update/soft-deactivate profile |
| PATCH | `/users/me/password` | Reauthenticated password change |
| PATCH | `/users/me/seller-onboarding` | Explicit self-service seller upgrade |
| GET | `/users/verification/status` | All trust states |
| POST/DELETE | `/users/verification/phone` | Add/reverify or safely remove phone |
| POST | `/users/verification/email` | Add/change/reverify email |
| GET | `/users/sessions` | Active devices |
| DELETE | `/users/sessions/:id` | Revoke owned device session |
| DELETE | `/users/sessions/all` | Revoke all devices |
| PATCH | `/users/notification-preferences` | Channel consent foundation |
| POST | `/account-links/initiate` | Password + target ownership precheck |
| POST | `/account-links/confirm` | OTP + exact warning confirmation |

### Admin

`GET /admin/users`, `GET /admin/users/:id`, and PATCH status/roles/verification endpoints require an active server session plus current `admin` or `super_admin` role. Only a super administrator may grant/revoke privileged roles or mutate privileged accounts. Status and role changes require exact typed confirmation, revoke affected sessions, increment token version when roles change, and create actor/target security events. The admin UI contains a searchable API-driven table and destructive confirmation modal; it fabricates no user rows.

## 12.9 Security controls

Helmet, explicit credentialed CORS, request IDs, global and route-specific rate limits, body limits, HPP, operator/dotted-key sanitation, Zod schemas, normalized identity, generic recovery/credential errors, bcrypt, HMAC OTP/token storage, short access JWTs, refresh rotation/reuse detection, account/login locks, session/device controls, server RBAC, soft deletion, and security events.

Development email/SMS uses a console/outbox adapter. Production fails closed until real provider adapters are configured; it never silently pretends delivery. Admin bootstrap reads credentials from backend environment and refuses existing-account role mutation.

## 12.10 UI and accessibility

Screens: login, phone OTP login, multi-step signup, six-cell OTP with paste/arrow/backspace behavior, email instructions/checking/success/failure, forgot/reset/success, profile, verification center, security/sessions/password/linking/deletion, notifications, preferences, seller onboarding, role-aware dashboards, admin users, access denied, and honest later-feature placeholders.

Forms use labels, autocomplete, accessible alerts, busy/disabled double-submit prevention, keyboard focus, touch sizing, contrast, reduced motion, mobile stacking, contained table scrolling, and dialog Escape/backdrop handling. English/Urdu dictionaries, document `lang`/`dir`, locale persistence, and RTL layout variants establish i18n; legacy Phase 1 marketplace strings still need full catalog migration.

## 12.11 Standards basis and originality

Identity flows follow general OIDC/OAuth 2.0 + PKCE, OWASP, secure-session, OTP, privacy, and accessibility practices. QAVLIO's brand, copy, information hierarchy, components, and workflows are independently designed. Account linking is deliberately conservative: password reauthentication, request-bound OTP, explicit warning phrase, security audit, and human review prevent silent identity merges.

## 12.12 Intentional limits

Real email/SMS credentials/providers, social provider credentials, identity/business document processing, mandatory admin 2FA, durable production data without MongoDB, complete legacy-string Urdu translation, avatar media upload, and later marketplace/chat/notification delivery are not faked. They are explicit provider/feature integration points.
