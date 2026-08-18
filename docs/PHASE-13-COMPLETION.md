# Phase 13 — Seller Monetization

QAVLIO now includes a server-authoritative seller monetization system on top of the Phase 7 payment foundation.

## Implemented

- Lifetime seller listing quota with the first eligible listing free and a configurable additional-listing price (default PKR 100)
- Secure listing credits, promotion credits, featured-day entitlements, and immutable credit transactions
- Admin-managed seller packages with activation/deactivation instead of destructive deletion
- Configurable BOOST, FEATURED, TOP_SEARCH, HOMEPAGE, CATEGORY, and URGENT promotion products
- Promotion ownership, eligibility, duration, payment, duplicate/stacking, activation, cancellation, refund, and expiry validation
- Clearly labelled homepage, category, and relevant-search placements
- Deduplicated impressions, clicks, listing views, favorites, and contact events
- Seller packages, checkout, transaction history, invoices, quota, credits, promotions, and analytics screens
- Marketplace orders, invoices, payment transactions, refund requests, and audited finance workflows
- Admin monetization settings, package management, refund review, and revenue analytics
- Provider-independent `createCheckout`, `verifyPayment`, and `refundPayment` contract
- Signed and idempotent webhook fulfillment; prices, package composition, currency, credit amounts, and payment status remain backend-owned

## Security boundary

The browser never supplies an accepted price, credit amount, package composition, or paid status. Production startup cannot use the development sandbox provider. A listing fee publishes only after a free entitlement, an atomically consumed listing credit, or a server-confirmed payment. Package and promotion fulfillment uses idempotent references so webhook retries cannot award the same entitlement twice.

## Persistence

MongoDB/Mongoose models and indexes are included for quota, wallets, credit transactions, packages, orders, invoices, refunds, promotions, and promotion events. Existing non-production memory repositories remain available for local development and automated tests when MongoDB is not configured.

## Verification

The Phase 13 test suite covers authoritative package pricing, modified request rejection, webhook replay, one-time credit grants, free/paid listing enforcement, credit double-use prevention, promotion conflicts, and analytics deduplication. The complete regression suite for prior phases also remains green.
