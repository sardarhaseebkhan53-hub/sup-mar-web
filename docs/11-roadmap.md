# 11. DealHub Feature Roadmap

Roadmap order follows dependency and risk, not visual convenience. Dates/effort are estimated only after backlog refinement and team capacity are known.

## Phase 1 — Planning, Branding & Foundation (current)

**Outcome:** approved requirements and architecture, responsive visual foundation, runnable workspaces, core models/APIs, ad/config integration points, tests and documentation.

Exit evidence: this repository, `npm run check`, responsive preview, route review, and [completion report](PHASE-1-COMPLETION.md).

## Phase 2 — Authentication & User Management (implemented foundation)

- Email/password registration, verification, login, refresh rotation, logout, recovery.
- Phone normalization and OTP provider adapter/challenge flow.
- Session/device list and revocation; token reuse detection.
- Customer/seller role upgrade and profile/preferences.
- Central permission/ownership policies and protected frontend routes.
- Admin user search/status/role foundation and audit events.
- Security tests: enumeration, brute force, token replay, CSRF/origin, object authorization.

**Delivered:** email/phone registration, email/OTP verification, password/OTP login, rotating sessions, recovery, profile/location/preferences, trust states, linking intake, seller onboarding, protected roles, admin user/status/role/verification APIs, security events, responsive identity UI, and tests. Real delivery/social/document-verification providers remain deployment integrations.

## Phase 3 — Categories, Listings & Media

- Admin category/subcategory CRUD, attribute schema, reorder/disable/publish/version.
- Draft/autosave, category-driven listing form, submit/moderation states, edit/delete/archive/sold/expiry.
- Signed object-storage uploads, image validation/re-encode/EXIF removal, reorder/alt, cleanup.
- Public listing/category API, seller inventory and preview.
- Listing revision/audit and policy validation.

**Exit:** seller can create and manage a persisted, moderated listing; category changes propagate without frontend code changes.

## Phase 4 — Search, Discovery & SEO

- Normalized query/filter/sort/cursor APIs, location/radius and category attributes.
- Search adapter and indexing/outbox pipeline; relevance, freshness and fraud-quality inputs.
- Saved listings/searches, follows, alerts.
- Server rendering/pre-render strategy for listing/category/seller/help pages.
- Canonical/OG/JSON-LD, sitemap jobs, expired content policy.
- Core Web Vitals and search quality dashboards.

## Phase 5 — Messaging, Calls & Notifications

- Authenticated Socket.io rooms, durable conversation/messages, reconnect/history.
- Typing/read/delivery, attachments, block/report, abuse controls.
- Seller contact reveal with consent/rate/audit; optional call masking adapter.
- Outbox/queue-based in-app/email/SMS/push notifications and preferences.
- Responsive mobile two-state chat experience.

## Phase 6 — Trust, Reviews, Verification & Support

- Eligibility-based reviews and seller aggregates; appeals/moderation.
- User/listing/chat reports, risk scoring, duplicate signals and moderation queue.
- Seller identity/business verification provider/manual case flow.
- Support tickets, attachments, SLA, assignment/escalation and role-redacted context.
- Admin moderator/support permissions and comprehensive audit trails.

## Phase 7 — Payments, Listing Fees & Promotions

- Versioned pricing rules, free quota, category/seller-specific fee and immutable quotes.
- Payment provider adapter, webhook validation/idempotency, ledger, receipts, refund/reconciliation.
- Promotion products and entitlements: top, featured, home, category, sponsored.
- Seller/customer payment history and admin commercial controls.
- Ranking disclosure, entitlement expiry and fraud/refund behavior.

Payments enter only after auth, listings, audit and notification foundations are stable.

## Phase 8 — Advertising & Revenue Operations

- Campaign/creative approval, targeting, scheduling, pacing, budgets and slot preview.
- Viewability impression/click events, deduplication, frequency limits and reporting.
- Advertiser/admin workflows, house ads, content policy, consent/privacy controls.
- Revenue reconciliation and performance dashboards.

## Phase 9 — DealHub AI Assistant

- Grounded help retrieval with citations and evaluation set.
- Guided search and category/listing draft assistance.
- Allow-listed support tools with user confirmation and authorization.
- Duplicate/suspicious signals and moderator summaries with human decision.
- PII redaction, prompt injection controls, retention, rate/cost budgets, multilingual evaluation.

Ship capabilities separately behind feature flags; do not launch a broad autonomous assistant first.

## Phase 10 — Localization, Scale & Mobile Readiness

- Complete English/Urdu catalogs, RTL, localized notification/help/SEO content.
- Generated API clients and mobile authentication/deep-link/push contracts.
- Redis-backed distributed rate limits/cache/queues/Socket.io adapter as load requires.
- Database/search sharding/partition reviews based on measured traffic.
- Multi-region/CDN/DR evaluation, load/chaos testing and operational SLOs.
- Native app delivery can begin earlier once Phase 2–5 APIs stabilize.

## Cross-phase gates

Every phase includes threat/privacy review, authorization matrix, accessibility and responsive acceptance, performance budgets, observability, admin/support impact, migrations, rollback, documentation, and clean CI. Analytics events and audit records are designed with each feature—not retrofitted after launch.

## Prioritized next backlog

1. Begin Phase 3 dynamic category administration and category-driven attributes.
2. Persist listing drafts and implement signed, validated media upload intents.
3. Build indexed search/filter/location contracts and cursor pagination.
4. Add real email/SMS provider adapters in the deployment environment before production identity launch.
5. Add mandatory admin step-up/2FA and production Mongo authorization/load tests.
6. Finish Urdu migration for legacy Phase 1 marketplace strings.
