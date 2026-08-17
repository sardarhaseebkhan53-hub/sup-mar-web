# 4. API, Authentication, and Security Plan

## 4.1 REST conventions

- Base path: `/api/v1`; additive compatible changes stay in v1.
- JSON uses camelCase and UTF-8. Dates are ISO 8601 UTC. Money is serialized as a decimal string plus currency.
- Collection queries use cursor pagination for high-growth resources: `?limit=24&after=...`.
- Success: `{ "success": true, "data": ..., "meta": ... }`.
- Failure: `{ "success": false, "message": ..., "code": ..., "errors": ..., "requestId": ... }`.
- Every request receives `x-request-id`. Mutating/payment operations accept `Idempotency-Key`.
- Public API never returns internal moderation notes, password/session hashes, provider secrets, or exact private locations.

## 4.2 Phase 1 live endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Service and database state |
| GET | `/api/v1/categories` | Active, ordered category defaults/database records |
| GET | `/api/v1/config/public` | Browser-safe brand, locale, feature and unset pricing config |
| GET | `/api/v1/ads/slots/:slotId` | Validated ad-slot response; inactive without campaign data |

The service starts without MongoDB for visual development. In production, startup validation requires MongoDB and strong JWT secrets.

## 4.3 Planned endpoint map

### Authentication and account

- `POST /auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh`
- `POST /auth/otp/request`, `/auth/otp/verify`
- `POST /auth/password/forgot`, `/auth/password/reset`
- `GET/PATCH /me`; `GET /me/sessions`; `DELETE /me/sessions/:id`
- `POST /me/roles/seller`; `GET/PATCH /me/preferences`

### Discovery and listings

- `GET /categories`, `GET /categories/:slug`, admin CRUD/reorder/publish routes
- `GET /listings`, `GET /listings/:id`; query by category, location, price, condition, attributes, sort
- `POST /listings`; `PATCH/DELETE /listings/:id`; explicit `/submit`, `/renew`, `/mark-sold`
- `POST /media/upload-intents`; `POST /media/:id/complete`; signed, type/size constrained
- `GET/POST/DELETE /favorites`; CRUD `/saved-searches`; follows endpoints

### Contact, trust, and support

- Conversations/messages list/create/read; Socket.io events share the same authorization service
- `POST /listings/:id/contact-reveal` with rate limit/audit/consent
- Reviews create/update/list and seller aggregates
- Reports create/status; admin moderation/verification queues and decision endpoints
- Support tickets create/list/message/close/escalate
- Notification inbox, mark-read, and preferences

### Commercial and platform

- `GET /pricing/quote?product=&listingId=` creates or previews server policy
- Payment intent/session/status/receipt/refund endpoints plus isolated provider webhook routes
- Promotion product/quote/purchase/entitlement endpoints
- Admin campaigns/creatives/slots; public slot decision and event endpoints
- Admin settings/feature flags/languages/audit/analytics
- AI assistant session/message/tool-confirmation endpoints behind policy and limits

OpenAPI 3.1 becomes mandatory when Phase 2 contracts are implemented. Generate client types/SDKs from the reviewed contract rather than duplicating response shapes manually.

## 4.4 Authentication design

1. **Password:** normalize email; hash with Argon2id where available or bcrypt cost ≥12; never log or return passwords.
2. **Phone OTP:** provider-abstracted, short expiry, hashed challenge, attempt and resend limits, target/IP/device abuse controls. Never reveal whether an unrelated account exists.
3. **Access token:** short-lived (about 10–15 minutes), signed with rotated key, includes subject, session ID and role/permission version—not mutable profile data.
4. **Refresh token:** high-entropy opaque token or narrowly scoped JWT stored as an `HttpOnly`, `Secure`, `SameSite=Lax/Strict` cookie; store only a hash server-side. Rotate on every use and revoke the token family on reuse detection.
5. **Sessions:** list and revoke devices; record coarse security metadata; revoke on password change/suspension.
6. **Step-up:** password/OTP re-check for phone/email changes, payout/refund, sensitive admin actions, and verification decisions.

For native mobile apps, use PKCE-compatible authorization patterns and platform secure storage. Do not share web cookies with embedded WebViews as a shortcut.

## 4.5 Authorization

Backend policy answers **actor + action + resource**. Roles are coarse bundles; permissions include `listing:create:own`, `listing:moderate:any`, `category:manage`, `payment:refund`, `settings:publish`, etc. Ownership and status checks accompany permissions.

- Customer cannot access seller/admin data by guessing an ID.
- Seller modifies only owned listings/store resources.
- Moderator actions are scope-limited and audited.
- Support sees only data needed for an active ticket.
- Admin finance/system capabilities can be separated and require step-up.
- Suspended/deleted status is checked after token verification, with cached permission-version invalidation.

Frontend guards improve UX only; they are not security controls.

## 4.6 Security control baseline

| Risk | Control |
|---|---|
| Injection | Zod validation, Mongoose schemas, operator/dotted-key sanitization, no raw query composition |
| XSS | React escaping, sanitize allow-listed rich text, CSP, strip unsafe SVG/HTML, safe outbound link handling |
| CSRF | SameSite cookies + Origin/CSRF token for cookie-authenticated mutations; bearer access token where appropriate |
| Credential attacks | Per-route/IP/identity/device limits, breached-password screening, uniform errors, alerts |
| Broken access control | Central policy middleware, ownership tests, deny-by-default routes, admin audit |
| Malicious uploads | Signed direct upload, extension/MIME/magic-byte checks, size/count limits, re-encode images, malware scan, random object keys, private quarantine |
| SSRF | No arbitrary server URL fetches; allow-listed outbound destinations and blocked private networks |
| Payment fraud | Provider signature verification, idempotency, immutable quote, server webhook truth, reconciliations |
| Secret leakage | backend environment/secret manager only, `.env` ignored, redaction in logs, rotation process |
| Abuse/spam | tiered rate limits, trust/risk signals, reporting, moderation, velocity rules |
| Dependency risk | lockfile, minimal packages, automated audit/update process, review major upgrades |

Phase 1 Express includes Helmet, explicit CORS, JSON size limits, HPP, input-key sanitation, global rate limiting, request IDs, validation, structured errors, and production environment checks.

## 4.7 CSRF/CORS/CSP decisions

CORS is an API access policy, not authentication. Production permits explicit QAVLIO origins only with credentials. Preview hosts are accepted only in non-production.

If refresh is cookie-based, refresh/logout and other cookie-authenticated mutations validate `Origin` and a CSRF token. Access-token API calls use `Authorization: Bearer` and do not place tokens in localStorage. Frontend deployment sets a CSP allowing self-hosted scripts/styles/images plus explicit media/payment hosts; remove development exceptions.

## 4.8 Rate-limit tiers (starting point)

- Public reads: moderate per IP with cache.
- Login/OTP/recovery: strict per IP + normalized identity + device; increasing cooldown.
- Message/contact reveal/report: per actor and resource velocity limits.
- Upload intent: per actor/storage budget.
- Payment intent/webhook: idempotency and provider-specific limits; webhook authenticated by signature rather than user token.
- Admin: lower volume plus anomaly alerts, not broad IP-only blocking.

Distributed limits require Redis or a managed equivalent before horizontal scaling.

## 4.9 Real-time plan

Socket.io handshake authenticates the same access/session credentials and resolves current account status. Rooms use opaque server-approved IDs (`user:{id}`, `conversation:{id}`) after membership checks. Clients cannot self-join arbitrary rooms. Events include schema version, event ID, timestamp and correlation ID. Message creation is persisted first, acknowledged idempotently, then emitted; reconnect fetches missed events via REST.

Phase 1 emits only a non-sensitive `system:ready` capability event. Chat, notification rooms, presence, typing, delivery/read events, blocking, retention, and moderation arrive after Phase 2 authentication.

## 4.10 Operational security

Use TLS everywhere, managed database network controls, separate least-privilege service/provider credentials, redacted structured logs, centralized error reporting, dependency/secret scans, backup restore tests, audit retention, incident runbooks, and documented key rotation. Security-critical workflows require unit, integration, authorization-matrix, abuse, and replay/idempotency tests before release.
