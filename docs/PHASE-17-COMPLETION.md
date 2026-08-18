# Phase 17 Completion Record — QAVLIO Seller Business Center

**Status:** Complete. The Seller Center is now a full business workspace: dashboard, listings with bulk management, inventory with stock tracking, a lead pipeline, privacy-safe customers, orders, promotions, revenue, analytics, AI seller tools, message templates, team management with a permission matrix, notifications, settings with business hours, CSV exports, and server-side global search — all scoped to the authenticated seller's business and built on real data only.

**Technology lock honored:** React + TypeScript + Vite + Tailwind + React Router + TanStack Query + Framer Motion + Lucide frontend; Node + Express + TypeScript REST backend; MongoDB + Mongoose; PKR default currency; no Flutter/Dart/React Native anywhere.

## 1. Routes and layout (§3–5)

- `/seller` and `/seller/dashboard` — authenticated sellers; buyers get seller onboarding (Phase 2 flow), admins keep the Admin Command Center.
- `SellerSidebar` (grouped: Sell / Grow / Understand / Business) on desktop, a responsive drawer on mobile, and a top bar with QAVLIO branding, seller identity, `SellerGlobalSearch`, notifications, messages, profile, and a Quick Add Listing button.

## 2. Dashboard and performance (§6–7, §58–59)

- Cards for Active Listings, Views, Favorites, Leads, Messages (+unread), Orders, and Promotion Performance — every value computed from real listings, conversations, leads, and payments, with a visible basis line.
- Onboarding checklist (profile → first listing → contact preferences → optional verification → start selling) that never blocks basic selling.
- Listing performance endpoint with Today / 7 / 30 / 90-day windows; untracked metrics (calls) are labeled instead of invented.

## 3. Listings, bulk actions, duplication (§8–9, §14)

- Status tabs (All / Active / Pending / Rejected / Sold / Expired / Draft) on `/seller/listings`.
- Multi-select bulk Pause / Activate / Archive — ownership re-verified per listing (foreign IDs fail for that row only), destructive archive requires explicit confirmation (HTTP 428 until `confirm: true`).
- Duplicate creates a clean draft with title/category/attributes/description/media — zero views, favorites, reports, moderation, or payment history copied.

## 4. Inventory (§10–13)

- `Listing.stock` (tracked, quantity, lowStockThreshold, stayVisibleWhenOutOfStock) + `sku`, exposed via `GET /seller/inventory`.
- Individuals get simple listing inventory — quantity tracking is a business-account feature (403 `BUSINESS_FEATURE_REQUIRED` otherwise), never forced on casual sellers.
- Stock statuses In Stock / Low Stock / Out of Stock; public listing views now expose honest `availability` + `stockStatus`; low-stock transitions notify the seller.

## 5. Leads (§15–20)

- `SellerLead` model (sellerId, buyerId, listingId, source, status, notes, timestamps, lastContactedAt) with indexes on seller+status, seller+buyer, seller+created.
- Pipeline New → Contacted → Interested → Negotiating → Won → Lost with keyboard-accessible stage moves and private notes (40-note cap).
- Sources: message (created from a real conversation the seller owns), inquiry, call request, contact, manual; conversation-derived leads verify the seller actually owns the conversation.
- Search by buyer/listing/note, filters by stage, source, and date range.

## 6. Customers (§21–23)

- `/seller/customers` derives from conversations where THIS seller is the counterparty — never a platform-wide user database.
- Profiles show name, interaction counts, listings contacted, unread messages, and lead stage; responses contain no email/phone/password/risk data (verified in tests by serialization scan).

## 7. Messaging tools (§24–26)

- `/seller/messages/templates` — quick replies with create/edit/delete/copy, spam-pattern rejection, and a 20-template cap; usage counters record manual sends only (no automation exists).

## 8. Orders, revenue, payouts (§27–28, §33–34)

- `/seller/orders` lists the seller's marketplace orders (listing fees, promotions, packages) with type/listing/amount/status/date and a detail dialog with payment timeline; payment credentials are never present.
- `/seller/revenue` shows labeled metrics (gross marketplace spend, promotion spend, platform fees, refunds, net) computed from real payments, with the honest note that buyer-payment revenue arrives with the production payment provider.
- Payouts are architecture-only (pending/completed/failed states reserved; no bank secrets).

## 9. Analytics (§35–39)

- `/seller/analytics` with 7/30/90/365-day windows: section cards (listings, views, search impressions, favorites, leads, messages + response rate, promotions, revenue), a daily timeline chart, top / most-viewed / most-favorited / most-contacted / lowest-performing listings, and category performance restricted to categories the seller actually uses.
- Response metrics reuse Phase 6's `sellerResponseMetrics`; small samples report "not enough data" instead of guessing.

## 10. Reviews, AI tools, notifications (§44–48, §49–50)

- `POST /seller/reviews/:id/reply` (professional replies, max 1000 chars); sellers still cannot delete reviews — only admin/moderation per Phases 11/15.
- `/seller/ai` combines the Phase 16 listing assistant with **grounded business insights**: statements generated only from real aggregates ("Your vehicles listings received N views…"), actionable suggestions, and an explicit action-safety notice (the AI cannot publish, price, delete, message, refund, or change payments).
- Internal performance metrics (listing quality average, response performance, sales performance) are transparent and seller-only — QAVLIO publishes no seller score (§60).
- `/seller/notifications` centers seller events (new inquiry/lead, stage moves, low inventory, team joins) with mark-read / mark-all-read.

## 11. Team (§51–54)

- `SellerTeamMember` invitations (email, role, expiry, status) for **business accounts**; invited users authenticate with their existing QAVLIO account — no separate passwords are ever created.
- Permission matrix enforced server-side per route: owner = everything; manager = listings/inventory/leads/customers/analytics/AI/export; staff = listings/leads/messages. Financial and team endpoints are owner-only (403 `TEAM_PERMISSION_DENIED` for staff/manager, verified in tests).
- `sellerScopeService.resolveSellerScope` maps an authenticated member onto the owner's business scope; revocation removes access immediately.

## 12. Settings, search, export (§55–57)

- `/seller/settings` — Profile, Business (name, description, logo, category, location, working hours for all 7 days with open/closed + times, contact preferences, contact-visibility), Notifications, Privacy, Team, Security, Billing sections.
- Global seller search hits listings, leads, customers, and orders server-side (debounced, paginated, scope-checked).
- CSV exports for listings, leads, customers, and analytics summaries — authenticated, scope-checked, and guaranteed free of passwords, payment credentials, verification documents, and internal risk data.

## 13. Authorization and IDOR (§62–63)

- Every endpoint resolves ownership from `req.auth` via the seller scope; client-supplied `sellerId`/`userId`/`listingId` values are ignored or rejected (strict schemas block unknown keys).
- Verified in tests: Seller A cannot read/mutate Seller B's leads, customers, inventory, or orders; buyers and anonymous users get 401/403; staff cannot reach financial endpoints; team permission escalation attempts fail; fake bulk-ownership attempts skip foreign rows.

## 14. API surface added

`GET /seller/dashboard` · `GET /seller/dashboard/performance` · `GET /seller/onboarding` · `POST /seller/listings/bulk` · `POST /seller/listings/:id/duplicate` · `GET|PATCH /seller/inventory(/:id)` · `GET|POST /seller/leads` · `GET|PATCH|DELETE /seller/leads/:id` · `GET /seller/customers(/:id)` · `GET /seller/orders(/:id)` · `GET /seller/revenue` · `GET /seller/analytics` · `GET /seller/ai/insights` · `GET /seller/ai/performance-metrics` · `GET|POST /seller/messages/templates` + `PATCH|DELETE|POST /seller/messages/templates/:id(/use)` · `POST /seller/reviews/:id/reply` · `GET /seller/team` · `POST /seller/team/invite` · `PATCH /seller/team/:id` · `POST /seller/team/join` · `GET /seller/search` · `GET /seller/export/:dataset` — alongside the Phase 4/13 endpoints (`/seller/listings`, `/seller/payments`, `/seller/promotions`, `/seller/reviews`).

## 15. Components and pages

New: `SellerStatCard`, `SellerStates` (empty/error/loading), `SellerQuickActions`, `SellerGlobalSearch`, `LeadPipeline`/`LeadCard`, `CustomerCard`, `InventoryTable`, `RevenueCard`/`PayoutStates`, `TeamTable`; upgraded `SellerSidebar`, `DashboardLayout` (drawer + search), `SellerListingsPage` (tabs/bulk/duplicate), `SellerAnalyticsPage` (windows + charts), `SellerSettingsPage`. Pages: SellerCenterDashboard, Inventory, Leads, Customers, Orders, Revenue, AI Tools, Templates, Team, Notifications — all keyboard accessible (roles, labels, aria-live, focus management) and responsive from 320px up.

## 16. Verification performed

- `npm run check` fully green: ESLint + TypeScript (both workspaces), **136 backend tests** (22 new Phase 17 tests covering dashboard, bulk, duplication, inventory modes + low-stock alerts, lead pipeline + isolation, customer privacy, orders/revenue labeling, analytics honesty, templates, review replies, team permission matrix, search, exports, IDOR/mass-assignment, and notification center), **63 frontend tests**, and production builds.
- Live run: API + Vite servers healthy, all 15 seller routes render (200), unauthenticated dashboard/export return 401, proxy works, backend logs clean with OTP secrets redacted.
- Scans: zero prohibited-technology files, zero secrets in frontend source, schema indexes declared for SellerLead / SellerTeamMember / MessageTemplate (+ existing Listing/Conversation/Payment indexes).

## 17. Boundary

Payout processing, buyer-purchase order flows, and call tracking remain deployment/provider integrations and are represented honestly as such in the UI. No ERP, external CRM, autonomous selling, auto-messaging, or automatic pricing was added.
