# QAVLIO Phase 0 — Product, Technology & Architecture Blueprint

**Status:** accepted foundation  
**Brand:** QAVLIO  
**Promise:** Buy. Sell. Discover.  
**Initial market assumptions:** Pakistan, PKR, English/Urdu-ready  
**Architecture style:** modular monolith, API-first, event-ready, provider-independent

This document is the controlling Phase 0 decision record. The detailed plans in this directory refine it. Later phases may extend these decisions through an explicit architecture decision record (ADR), but must not silently replace the stack, trust model, data ownership, or API contracts.

## 1. Product boundary

QAVLIO is a multi-category, multi-vendor local marketplace for resale goods, new goods, jobs, property, events, and services. It supports four interaction surfaces over one policy layer:

1. Public discovery and marketplace SEO pages.
2. Authenticated customer and seller workspaces.
3. Moderation, support, administration, and super-administration.
4. Versioned APIs and real-time contracts for the web client and a future Flutter application.

The platform never claims to guarantee an off-platform exchange. Verification badges describe the check performed, promotions are labeled, and advertisements remain visually distinct from organic listings.

## 2. Users, roles, and permissions

Accounts can hold multiple roles. Server authorization evaluates **actor + action + resource + account state**; frontend guards are UX only.

| Role | Capability boundary |
|---|---|
| `customer` | Browse, save, message, report, review when eligible, manage identity/preferences |
| `seller` | Customer capability plus owned listing lifecycle, seller profile, analytics, promotions, payment history |
| `moderator` | Scoped listing/review/report decisions; no finance, role, or platform-secret access |
| `support` | Ticket-bound customer assistance with redacted context; no unrestricted moderation/admin action |
| `admin` | Taxonomy, listings, users, ads, settings, analytics, and delegated operations |
| `super_admin` | Privileged-role and critical platform control; step-up authentication and audit required |

High-risk operations—role grants, payout/refund, verification override, bans, security changes, and public configuration publishing—require explicit confirmation, fresh authentication where appropriate, and immutable audit records. An admin cannot grant or manage `super_admin` access.

## 3. Taxonomy

The initial root taxonomy is:

1. Cars
2. Motorcycles
3. Mobiles
4. Electronics
5. Computers & Laptops
6. Fashion
7. Furniture
8. Home & Garden
9. Property
10. Animals
11. Jobs
12. Services
13. Business & Industrial
14. Books & Education
15. Sports & Fitness
16. Kids & Baby
17. Beauty & Personal Care
18. Tickets & Events
19. Other

These records are bootstrap data, not frontend business truth. MongoDB `categories` records own names, stable slugs, hierarchy, icon/media references, ordering, active state, SEO data, versioned attribute schemas, and filter definitions. Admin operations can create, edit, reorder, disable, and retire categories without source changes. Listing submissions validate against the selected published category schema version.

## 4. Architecture decisions

### 4.1 Runtime and repository

- npm workspaces with `frontend/` and `backend/`; no Docker requirement.
- Node.js 20+ and npm 10+.
- Start as a modular monolith to preserve transactional clarity and low operating cost.
- Domain boundaries communicate through services/events, so high-load modules can be extracted later without changing client contracts.

### 4.2 Frontend

- React 18, Vite, JavaScript/JSX today; TypeScript migration remains additive.
- React Router for route segmentation and lazy loading.
- Tailwind design tokens and reusable components; no page-specific brand forks.
- API client is the only network boundary. Server state can move to TanStack Query when listing/search phases need cache and mutation orchestration.
- Feature folders own UI; layouts own shared navigation; auth and i18n are context providers.

### 4.3 Backend

- Express REST API under `/api/v1` with Socket.io for authorized real-time events.
- Zod request validation, Mongoose persistence validation, centralized error handling, request IDs, and structured response envelopes.
- Controllers translate HTTP; services own business policy; repositories own persistence; provider adapters isolate third parties.
- Background jobs/outbox handlers own expiry, notifications, media cleanup, search indexing, reconciliation, and analytics aggregation.

### 4.4 Data and search

- MongoDB/Mongoose is the source of transactional marketplace truth.
- References connect independently changing/unbounded records; bounded read-together values may be embedded.
- Object media is stored in validated cloud object storage and persisted as URLs/keys only.
- MongoDB indexed queries support initial discovery. A search adapter permits Atlas Search, Meilisearch, or OpenSearch later without changing public query contracts.
- Redis is introduced only when measured scale requires distributed cache, rate limits, queues, sessions, or Socket.io fan-out.

## 5. Domain ownership and collections

| Domain | Core collections |
|---|---|
| Identity | `users`, `sellerProfiles`, `sessions`, `verificationChallenges`, `verificationCases` |
| Marketplace | `categories`, `listings`, `listingRevisions`, `favorites`, `savedSearches`, `recentlyViewed` |
| Communication | `conversations`, `messages`, `notifications`, `notificationPreferences` |
| Trust | `reviews`, `reports`, `moderationCases`, `blocks`, `auditLogs` |
| Commerce | `pricingRules`, `paymentIntents`, `ledgerEntries`, `receipts`, `refunds`, `promotionProducts`, `promotionEntitlements` |
| Growth | `advertisements`, `adEvents`, `rewards`, `rewardRules`, `referrals` |
| Support | `supportTickets`, `supportMessages`, `aiSessions` |
| Platform | `settings`, `featureFlags`, `analyticsEvents`, `outboxEvents` |

Money uses decimal strings at API boundaries and `Decimal128` plus ISO currency in MongoDB. Large mutable objects are referenced rather than copied. Financial truth is append-only and provider webhook application is idempotent.

Detailed schema and index decisions are in [03-database-plan.md](03-database-plan.md).

## 6. Listing and discovery contracts

A listing has an immutable public ID, seller/category references, category schema version, title, description, decimal price/currency, negotiability, condition, validated media, optional supported video, coarse public location, contact preference, attributes, timestamps, counters, availability, moderation, verification, and promotion state.

Lifecycle:

```text
draft → pending → published → paused | sold | expired | removed
                  ↘ rejected
paused → pending | published | removed
rejected → draft | removed
```

Promotion is a separate entitlement and never changes listing moderation status.

`GET /api/v1/listings` performs backend filtering and sorting. It supports keyword, category/subcategory, location/radius, price range, condition, seller type, date, promotion status, distance, and availability. Sort values are relevance, newest, oldest, price ascending/descending, distance, and most viewed. Results use cursor pagination; arbitrary client-provided MongoDB operators are rejected.

## 7. API conventions

- REST JSON under `/api/v1`; future compatible additions remain in v1.
- Success: `{ success: true, data, meta? }`.
- Error: `{ success: false, message, code, errors?, requestId }`.
- UTC ISO 8601 timestamps; decimal money serialized as `{ amount, currency }`.
- Cursor pagination for high-growth resources; bounded page sizes.
- `Idempotency-Key` for retryable commercial and important mutation flows.
- OpenAPI 3.1 becomes the reviewed source for generated web/mobile types as domain endpoints are implemented.

Resource groups: `auth`, `users`, `sellers`, `listings`, `categories`, `search`, `messages`, `reviews`, `favorites`, `saved-searches`, `notifications`, `payments`, `promotions`, `advertisements`, `reports`, `rewards`, `support`, `ai`, and `admin`.

## 8. Provider-independent integrations

### Media

The backend creates constrained upload intents. Object storage receives the file, then a worker validates magic bytes, count, dimensions, and size; strips EXIF; scans; re-encodes; creates responsive derivatives; and records approved keys/URLs. Quarantined media never becomes public.

### Payments and promotions

The backend creates an immutable server-priced quote and provider intent. Provider-hosted/tokenized checkout collects payment data. A signed webhook is stored idempotently, verified, reconciled to the quote, applied to the ledger, and only then activates a listing or promotion entitlement. Provider SDKs live behind an adapter.

Initial configurable policy: one free listing and **PKR 100** per additional listing. Environment values are safe bootstrap defaults; versioned admin-managed settings are production truth. Promotions have separately versioned products, prices, placements, durations, labels, and eligibility.

### Advertising

Admin-managed campaigns own creative, destination, placement, targeting, start/end, state, and budgets. Allowed slot IDs prevent arbitrary page injection. Impression/click events are deduplicated and aggregated. Empty/failed ad slots collapse without breaking layout.

### Rewards

Versioned `rewardRules` define event, eligibility, value, caps, effective dates, and status. Append-only reward ledger entries prevent silent balance rewrites. Rewards remain feature-flagged until fraud and legal rules are approved.

### Chat and notifications

A conversation is participant- and listing-bound. The server authorizes every room and persists each idempotent message before emission. Read/delivery state, presence, attachments, block/report, deletion policy, reconnect history, and notification fan-out use shared policy services. Email, in-app, and future push channels consume outbox events and user consent.

### AI support

AI runs behind a server service with retrieval from approved help content, redaction, rate/cost limits, prompt-injection defenses, evaluation sets, and audit metadata. Tools are allow-listed and re-authorize each action. Administrative, payment, identity, and destructive operations never execute from unrestricted model output; sensitive actions require a normal authenticated flow and user confirmation.

## 9. Security and privacy baseline

- bcrypt cost 12 today, with an upgrade path to Argon2id; never plaintext credentials.
- Short-lived JWT access tokens; rotating random refresh tokens stored hash-only and sent in `HttpOnly`, `Secure`, `SameSite` cookies in production.
- Server session, current role, account status, token version, ownership, and resource state checked on protected requests.
- OTP/recovery secrets are purpose-bound, HMAC-hashed, short-lived, attempt-limited, and resend-limited.
- Helmet security headers, explicit credentialed CORS allowlist, CSRF/origin controls for cookie mutations, HPP, bounded body sizes, input/operator sanitization, and tiered rate limits.
- Signed/validated uploads, no server fetch of arbitrary URLs, safe outbound links, CSP at deployment, and secret redaction.
- Exact location and image metadata are minimized; public APIs return coarse location unless explicit use requires otherwise.
- Privileged actions, security changes, moderation, and financial state changes are audited with request ID and redacted before/after context.
- Secrets exist only in backend environment/secret management. `.env` is ignored and `.env.example` contains no credentials.

The threat/control matrix is in [04-api-auth-security.md](04-api-auth-security.md).

## 10. Experience and brand system

QAVLIO uses an original midnight, violet, and gold identity. The icon is a rounded moving Q/orbit: the ring represents discovery, connected nodes represent people and listings, the central spark represents a find, and the gold tail represents movement. It is not based on another marketplace mark.

The supplied assets include mark/app icon, wordmark, light signature, monochrome mark, and favicon. The product supports semantic headings, keyboard paths, visible focus, WCAG 2.2 AA contrast targets, alt text, reduced motion, 44px critical touch targets, RTL-aware localization, intentional mobile layouts, sticky mobile search, and bottom navigation.

See [05-design-system.md](05-design-system.md) and [06-responsive-accessibility-seo.md](06-responsive-accessibility-seo.md).

## 11. Performance, SEO, analytics, and operations

Targets: mobile LCP ≤2.5s p75, CLS ≤0.1, INP ≤200ms, and cached public API read p95 ≤400ms excluding providers. Use route splitting, responsive images, lazy media, CDN caching, indexed queries, debounce, cursor pagination, and API cache invalidation by domain event.

Public category, listing, seller, and help pages need canonical URLs, dynamic titles/descriptions, Open Graph/X metadata, structured data, sitemap generation, robots policy, and explicit expired/removed listing behavior. A pre-render/SSR decision is required before marketplace SEO launch; Vite client rendering alone is not represented as complete marketplace SEO.

Analytics records schema-versioned, purpose-limited events for visitors, searches, views, listing creation, favorites, messages, seller conversion, promotions, revenue, and ad events. Consent and retention are defined before production; analytics is never the payment or moderation source of truth.

Production deploys the frontend and stateless API separately over TLS, with managed MongoDB, cloud object storage/CDN, health checks, structured logs, error monitoring, backup/restore tests, migrations, provider reconciliation, and rollback notes. No Docker dependency is introduced.

## 12. Testing and release gates

Each owning phase adds unit, component, API, authorization, validation, and integration tests. Critical journeys include registration/login; seller onboarding; listing creation/moderation; listing/search; listing/chat; listing fee/payment; promotion/payment; review eligibility; report/admin; and notification delivery.

A phase exits only with:

- automated lint/test/build passing;
- loading, empty, error, success, and retry states;
- responsive checks at 360/768/1024/1440 and current Chrome/Edge/Firefox/Android;
- keyboard and screen-reader review;
- security/authorization matrix and abuse tests;
- migrations, configuration, observability, rollback, and intentional deferrals documented;
- no secret, fake production payment, fabricated success, or unlabeled sponsored content.

## 13. Delivery phases

- **Phase 0:** foundation, architecture, brand decisions, data/security blueprint.
- **Phase 1:** brand identity, core UI, homepage, navigation, responsive experience.
- **Phase 2:** authentication, customer/seller accounts, profiles.
- **Phase 3:** taxonomy, backend search, filters, sorting.
- **Phase 4:** listing creation/management and seller dashboard.
- **Phase 5:** listing detail, favorites, reviews, seller profiles.
- **Phase 6:** real-time chat, notifications, contact.
- **Phase 7:** provider payment integration, listing fees, promotions.
- **Phase 8:** advertisements, banners, rewards.
- **Phase 9:** admin dashboard and full marketplace management.
- **Phase 10:** bounded AI assistant and AI marketplace features.
- **Phase 11:** security hardening, performance, SEO, accessibility, full testing.
- **Phase 12:** production deployment, final QA, launch preparation.
- **Phase 13:** future mobile application architecture and delivery planning.

## 14. Golden rules

Do not duplicate business policy in clients; hard-code database-owned production data; expose secrets; trust UI authorization; store media blobs in MongoDB; couple code to one payment/media/AI provider; activate purchases from a frontend redirect; launch autonomous AI administration; copy another marketplace identity; or rewrite stable modules without an approved reason.

Scalability, security, performance, UX, maintainability, monetization, and AI readiness are concurrent acceptance criteria—not cleanup tasks.
