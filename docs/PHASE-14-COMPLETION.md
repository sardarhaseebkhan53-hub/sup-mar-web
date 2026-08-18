# Phase 14 — Admin Command Center

QAVLIO now has a unified, permission-backed command center for marketplace operations.

## Command center

- Premium responsive Admin layout with desktop sidebar, mobile drawer, global search, command alerts, profile, quick actions, and logout
- Real overview metrics for users, active sellers, listings, today's listings, orders, revenue, reports, and reviews
- Revenue periods, user/seller/listing growth, listing lifecycle, and marketplace activity based on stored records
- Role-scoped global search across users, sellers, listings, orders, payments, and reports

## Operations

- Paginated user, seller, listing, category, order, payment, promotion, package, ad, review, report, support, announcement, and audit workflows
- Listing moderation panel with media, seller, reports, risk signals, internal reasons, prior actions, approval, rejection, change request, removal, and restore
- Category hierarchy, icon/image, ordering, unique slug, and SEO controls
- Safe order and payment details with timelines; payment secrets and full payment credentials are never returned
- Refund review remains provider-confirmed and append-only audited
- Seller package creation, editing, and deactivation while historical order snapshots remain intact
- Support ticket assignment, replies, statuses, and internal notes; internal notes are excluded from customer APIs
- Plain-text announcements with controlled audiences and scheduled delivery

## Analytics and exports

- User, listing, search, revenue, promotion, advertising, AI, category, location, and trust/safety analytics
- Search telemetry records query/category/filter names and result counts, not individual location trails
- Authorized CSV exports for users, listings, orders, payments, and reports with reduced safe columns
- No retention or returning-user metric is fabricated when it is not measurable

## Security

- Super Admin, Admin, Moderator, Support, and Finance roles map to granular backend permissions
- Finance access is separated from moderation and private support access
- Moderator and Support responses are stripped of unauthorized financial data
- Privileged Finance role assignment requires Super Admin
- Permission denials are audit events; audit records have no edit/delete API
- User/listing/order views expose role-appropriate activity timelines
- Admin endpoints enforce authentication, role, permission, validation, pagination, and resource ownership on the server

## Persistence and performance

MongoDB/Mongoose models and focused indexes cover announcements, support assignment/messages, search analytics, users, listings, orders, payments, reports, reviews, promotions, ads, and audit logs. API tables are paginated and command-center pages are lazy-loaded. Existing non-production memory adapters remain available only for local development and automated tests when MongoDB is not configured.
