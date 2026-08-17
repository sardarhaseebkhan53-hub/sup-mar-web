# 1. Requirements and Scope

## 1.1 Product statement

QAVLIO is a general-purpose marketplace where people and businesses in Pakistan can **buy, sell, and discover** almost anything. It takes familiar marketplace principles—search, local discovery, listings, and buyer/seller contact—but uses its own premium navy/violet/gold identity, trust model, information hierarchy, and scalable architecture.

The initial launch is web-first and API-first. The same REST resources and Socket.io event contracts must later support iOS/Android clients without reproducing business logic.

## 1.2 Goals

1. Let a buyer move from intent to a relevant listing with minimal friction.
2. Let a seller create a high-quality listing from desktop or mobile.
3. Build trust through verification, moderation, reporting, reviews, and clear safety guidance.
4. Let administrators change categories and commercial policy without a frontend release.
5. Support sustainable revenue through configurable fees, promotions, and advertising.
6. Keep early hosting affordable while preserving clear migration paths for scale.

## 1.3 Primary personas

| Persona | Need | Success signal |
|---|---|---|
| Casual buyer | Find a trustworthy nearby item quickly | Relevant result and seller response |
| Value seeker | Track prices and new inventory | Saved search or listing alert converts |
| Individual seller | List an item with minimal effort | Qualified inquiry or sale |
| Professional seller | Manage inventory, profile, inquiries, and promotion | Consistent leads and measurable return |
| Moderator/support | Resolve risk and customer problems efficiently | Queue SLA and fair, audited resolution |
| Marketplace admin | Configure supply, revenue, and policy | Changes ship without code changes |

## 1.4 Role architecture

- **Guest:** browse, search, filter, view listing/seller public data, read support/safety content.
- **Customer:** guest capabilities plus save, follow, message, call reveal, review, report, saved searches, notification and payment history.
- **Seller:** customer capabilities plus listing lifecycle, inventory, analytics, inquiries, profile/store, verification, promotion and billing.
- **Moderator:** scoped listing/user/review/report decisions; cannot alter financial/system policy.
- **Support:** tickets, user context, approved account assistance; no unrestricted moderation or finance access.
- **Admin:** platform configuration, categories, pricing, ads, payments, analytics, delegated roles, and audit records.
- **Super admin:** critical configuration and privileged-role control with step-up authentication and complete auditing.

Users can hold multiple roles. Authorization uses permissions derived from roles rather than UI labels alone. Every privileged server operation checks authorization independently.

## 1.5 Category requirements

Initial roots: Cars, Motorcycles, Mobiles, Electronics, Computers & Laptops, Fashion, Furniture, Home & Garden, Property, Animals, Jobs, Services, Business & Industrial, Books & Education, Sports & Fitness, Kids & Baby, Beauty & Personal Care, Tickets & Events, and Other.

A category record owns `name`, stable `slug`, icon/media, parent, materialized path, order, active state, SEO fields, and configurable attributes. Attributes define listing form controls and filters (for example make/model/year for cars). The client consumes category data; it must not require a release when an admin adds, disables, nests, or reorders a category.

## 1.6 Functional capability register

| Domain | Required capability | Phase 1 disposition |
|---|---|---|
| Identity | Email/password, phone OTP, secure refresh, recovery | Architecture + UI; Phase 2 implementation |
| Accounts | Customer/seller profiles, role upgrade, preferences | Models/flows planned; Phase 2 |
| Categories | Dynamic hierarchy, attributes, disable/reorder | Model/API read foundation; admin CRUD later |
| Listings | Create/edit/delete, drafts, expiry, multiple images | Model + responsive wireframes; implementation later |
| Discovery | Search, filters, sort, category/location pages | Responsive UI foundation; search service later |
| Saved | Listings and saved searches | UI foundation; persistence later |
| Contact | Secure chat and seller call reveal | Chat wireframe + Socket.io integration point |
| Reputation | Seller reviews, ratings, follows | Data/API plan; later phase |
| Trust | Verification, reports, moderation, anti-duplicate | Workflows/data plan; later phase |
| Notifications | In-app, email, SMS/push preferences | Event plan; later phase |
| Payments | Ledger, provider attempts, receipts/refunds | Architecture only; provider later |
| Fees | Free limit, listing fee, category policy | Config model; no amount hard-coded |
| Promotions | Featured/top/home/category/sponsored | Product and entitlement plan |
| Advertising | Identified slots, campaigns, creatives, targeting | Reusable slots + campaign model/API foundation |
| Support | Tickets, conversation, escalation, SLA | Support UI/flow plan |
| AI assistant | Guidance, listing help, search, safety/moderation | Bounded integration architecture only |
| Languages | English and Urdu-ready content/layout | Locale config + plan; translation later |
| Analytics | Product, seller, ad and commercial events | Taxonomy and dashboard wireframes |
| SEO | semantic pages, metadata, OG, schema, sitemap | Base metadata/robots/routes; dynamic SSR later |
| Mobile apps | Shared IDs, APIs, auth and real-time contracts | API-first architecture |

## 1.7 Phase 1 implemented scope

- Brand tokens, logo mark, typography, icons, surfaces, buttons, fields, cards, states, and responsive rules.
- Runnable React/Vite app with public marketplace and nine principal wireframes.
- Desktop/mobile navigation and responsive listing/category behavior.
- Reusable ad slots with validated identifiers.
- Express service with secure defaults, validation, versioned public APIs, consistent errors, and request IDs.
- Core Mongoose models and configuration fallbacks.
- Socket.io server integration point with no private feature events.
- Documentation, quality scripts, tests, Git hygiene, and roadmap.

## 1.8 Out of Phase 1

No production claim is made for account creation, authentication, OTP delivery, uploads, persisted listings, search indexing, chat storage, call relay, reviews, reports, payments, promotions, ad selection/billing, notifications, support tickets, moderation decisions, AI calls, or multilingual content. These screens are explicit interaction wireframes and architectural integration points.

## 1.9 Non-functional requirements and target budgets

- **Availability:** design for 99.9% once production SLAs begin; graceful degradation for ads/AI/analytics.
- **Performance:** mobile LCP ≤2.5s p75, CLS ≤0.1, INP ≤200ms; API reads p95 ≤400ms excluding third parties.
- **Accessibility:** WCAG 2.2 AA target; keyboard operation, visible focus, semantic names, 44px critical touch targets, reduced motion.
- **Security:** OWASP ASVS-informed controls, least privilege, strong hashing, rotation-capable tokens, validation, rate limits, audit logs.
- **Privacy:** data minimization, purpose-limited location, configurable retention, account export/deletion plan.
- **Scalability:** stateless APIs, indexed queries, background jobs, object media storage, CDN, idempotent payments/events.
- **Observability:** structured logs, request IDs, error tracking, service/queue/database health, auditable admin actions.
- **Compatibility:** latest two evergreen browser versions and representative 360px–1440px layouts.

## 1.10 Acceptance definition

A phase is complete only when its implementation, automated checks, manual responsive/accessibility review, migrations/configuration, API documentation, monitoring, rollback plan, and intentional deferrals are recorded. A visible control must either work, be clearly marked as planned, or be disabled; it must not silently imitate a successful transaction.
