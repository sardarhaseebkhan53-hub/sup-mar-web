# 11. QAVLIO Delivery Roadmap

Roadmap order follows policy, data, and risk dependencies. Every phase includes security, accessibility, responsive behavior, testing, observability, migrations, rollback notes, and documentation.

## Phase 0 — Foundation & Blueprint (complete)

Product scope, original brand direction, stack, modular architecture, data ownership, API conventions, security baseline, provider boundaries, non-functional targets, and delivery gates. See [00-phase-0-blueprint.md](00-phase-0-blueprint.md).

## Phase 1 — Brand, Core UI & Homepage (implemented foundation)

Original logo suite, tokens, components, homepage, header/search/category navigation, mobile navigation, footer, representative discovery/detail/help surfaces, responsive/loading/error states, and base SEO metadata.

## Phase 2 — Authentication & Accounts (implemented foundation)

Email/password and phone identity, verification, recovery, rotating sessions, customer/seller profiles, preferences, seller onboarding, role-aware routes, admin user controls, account linking intake, security events, and provider interfaces. Production delivery credentials, document verification, and mandatory admin step-up remain deployment work.

## Phase 3 — Categories, Search, Filters & Sorting

Admin taxonomy CRUD/reorder/disable, versioned category attributes, indexed backend search, cursor pagination, keyword/category/location/radius/price/condition/date/seller/availability/promotion filters, sort contracts, search analytics, and saved search groundwork.

## Phase 4 — Listing Creation & Seller Management

Persisted drafts/autosave, category-driven forms, signed/validated media, submit/moderation lifecycle, edit/pause/remove/sold/expiry, revisions, seller inventory, analytics event foundation, and complete seller dashboard operations.

## Phase 5 — Listing Details, Favorites, Reviews & Sellers

Production listing detail/gallery/share/compare, favorites and recently viewed, public seller profiles/follows, interaction-qualified reviews, aggregates, moderation, and structured listing/seller metadata.

## Phase 6 — Chat, Notifications & Contact

Durable listing-linked conversations/messages, authenticated Socket.io rooms, reconnect, read/delivery/presence, image attachment, block/report/delete policy, contact reveal/call preference, in-app/email delivery, preferences, and future push contract.

## Phase 7 — Payments, Listing Fees & Promotions

Versioned pricing rules and free quota, immutable quotes, provider checkout adapter, signed idempotent webhooks, ledger/receipts/refunds/reconciliation, listing fee enforcement, promotion products/entitlements, placement disclosure, seller payment history, and admin commercial controls.

## Phase 8 — Advertising, Banners & Rewards

Campaign creative approval, slots, schedules, targeting, pacing, click/impression measurement, admin banners, privacy/frequency controls, versioned reward rules, append-only reward ledger, referrals/milestones, and fraud limits.

## Phase 9 — Admin Marketplace Management

Dashboard metrics/charts, category/listing/seller/user/report/review/payment/promotion/ad/banner/coupon/notification/support management, role-scoped moderation/support queues, homepage content, verification cases, revenue reporting, audit exploration, and platform settings.

## Phase 10 — QAVLIO AI

Grounded FAQ/safety/payment/listing guidance, guided discovery, listing draft/price assistance, allow-listed tools with re-authorization and confirmation, PII redaction, injection defenses, multilingual evaluation, cost/rate controls, human escalation, and admin policy—not unrestricted administration.

## Phase 11 — Hardening, Performance, SEO, Accessibility & Full Testing

Threat and privacy review, admin 2FA/step-up, abuse/load/replay tests, query/index/cache tuning, responsive media and Core Web Vitals, SSR/pre-render decision, dynamic canonical/OG/JSON-LD/sitemaps, WCAG 2.2 AA audit, browser/device matrix, and end-to-end critical journeys.

## Phase 12 — Production Deployment & Launch

Managed MongoDB/object storage, provider credentials, TLS/CSP/CORS, frontend/API hosting, monitoring and alerts, backups/restore, migrations, reconciliation, runbooks, incident/rollback drills, legal content, final QA, staged rollout, and launch readiness review.

## Phase 13 — Mobile Architecture

Freeze reviewed OpenAPI/realtime contracts, mobile OAuth/PKCE and secure storage, deep links, push contracts, media/background upload, Flutter architecture, analytics parity, store compliance, and mobile release plan. No mobile application is built in Phase 0.

## Next backlog

1. Phase 3 database-backed taxonomy administration.
2. Backend listing/search query contracts and cursor pagination.
3. Category attribute schema versioning and index plan.
4. Production email/SMS integration and mandatory privileged step-up before launch.
5. Complete Urdu/RTL migration of remaining public marketplace copy.
