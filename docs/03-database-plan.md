# 3. Database Plan

## 3.1 Strategy

MongoDB is the primary transactional document store for early QAVLIO. Mongoose supplies schema validation and indexes; API validation still happens before persistence. Documents embed bounded, read-together data and reference independently changing or unbounded entities.

- Object media lives in managed object storage/CDN, never inside MongoDB.
- Search begins with indexed MongoDB queries and can move behind a search-service adapter (Atlas Search/Meilisearch/OpenSearch) without changing public API contracts.
- Redis is optional later for cache, rate limits, sessions, queues, ranking counters, and Socket.io scale-out.
- Money is stored as `Decimal128` plus ISO currency; client floating-point values are never authoritative.
- Every principal entity has an immutable `_id`, timestamps, and lifecycle status. Human-readable slugs are not identity.

## 3.2 Core collections

| Collection | Purpose | Important fields / relationships | Key indexes |
|---|---|---|---|
| `users` | Identity and role anchor | name, email/phone, passwordHash, roles, status, verification, locale | unique sparse email/phone; status+createdAt |
| `sessions` | Refresh-token families/devices | userId, tokenHash, familyId, device, IP metadata, expiresAt, revokedAt | tokenHash unique; userId; TTL expiresAt |
| `otpChallenges` | Hashed, short-lived OTP attempts | targetHash, purpose, codeHash, attempts, expiresAt | target+purpose; TTL expiresAt |
| `sellerProfiles` | Business/store data | userId, store slug, description, address, verification, rating aggregates | userId unique; storeSlug unique; verification status |
| `categories` | Dynamic taxonomy/form/filter schema | parentId, path, level, attributes, order, active, SEO | slug unique; parentId+order; path |
| `listings` | Marketplace supply | sellerId, categoryId, content, Decimal128 price, media refs, geo, attributes, status, expiry | text; status+category+publishedAt; seller+status; 2dsphere; expiry |
| `listingRevisions` | Audit/restore submitted listing changes | listingId, version, snapshot, changedBy, reason | listingId+version unique |
| `favorites` | Saved listings | userId, listingId | userId+listingId unique; userId+createdAt |
| `savedSearches` | Query and alert intent | userId, normalized query/filter object, cadence | userId+createdAt; nextRunAt |
| `follows` | Customer → seller relationship | followerId, sellerId | pair unique; sellerId |
| `conversations` | Buyer/seller listing context | participantIds, listingId, lastMessageAt, state | participantIds; listingId; lastMessageAt |
| `messages` | Chat history | conversationId, senderId, type, encrypted/filtered content, attachments, delivery/read state | conversationId+createdAt; senderId |
| `reviews` | Reputation | reviewerId, sellerId, listingId, rating, text, status | reviewer+listing unique; seller+status+createdAt |
| `reports` | User/system abuse submissions | reporterId, targetType/id, reason, evidence, risk, status | status+priority+createdAt; target |
| `moderationCases` | Decisions and evidence references | reportIds, subject, assignee, actions, appeal, timestamps | status+priority; assignee+status |
| `verificationCases` | Identity/business review | userId, type, evidence refs, provider, status, reviewer | userId+type; status+createdAt |
| `notifications` | In-app notification inbox | userId, type, payload, readAt, delivery states | userId+createdAt; userId+readAt |
| `notificationPreferences` | Channel/topic consent | userId, email/SMS/push/in-app map, quiet hours | userId unique |
| `supportTickets` | Help lifecycle | userId, category, priority, status, assignee, source, messages | status+priority+createdAt; userId |
| `paymentIntents` | Provider-facing attempts | userId, quoteId, provider refs, amount/currency, status, idempotencyKey | provider ref unique; idempotency unique; userId+createdAt |
| `ledgerEntries` | Append-only financial truth | account, type debit/credit, amount/currency, source, correlationId | correlationId+type unique; account+createdAt |
| `receipts` / `refunds` | User-facing financial records | paymentId, number, status, tax fields | number/provider ref unique |
| `pricingRules` | Versioned fee/promotion policy | product, categoryId, amount, currency, duration, free limit, effective window | product+category+effectiveAt |
| `promotionProducts` | Admin-managed offers | type, placement, price rule, duration, active | type+active |
| `promotionEntitlements` | Purchased ranking benefit | listingId, productId, paymentId, starts/ends, status | listing+status+endsAt; TTL/worker expiry |
| `adCampaigns` | Ad creative, slots, target, budget, dates | advertiser, slotIds, creative, targeting, status, metrics | slot+status+date window |
| `adEvents` | Impression/click aggregation input | campaignId, slotId, anonymous/session key, event, time | campaign+time; retention TTL |
| `platformSettings` | Versioned runtime configuration | key, value, public/private scope, version, updatedBy | key unique; scope |
| `featureFlags` | Controlled rollout | key, enabled, audience/percentage | key unique |
| `auditLogs` | Immutable privileged actions | actor, action, subject, before/after redaction, requestId, IP, timestamp | actor+createdAt; subject; action+createdAt |
| `analyticsEvents` | Product event ingestion before warehouse | actor/session, name, schemaVersion, properties, timestamp | name+timestamp; retention TTL |

Phase 1 code implements starter schemas for `users`, `categories`, `listings`, `adCampaigns`, and `platformSettings`. Other schemas are intentionally introduced with their owning features and migration/test plans.

## 3.3 Dynamic category attributes

Each category can declare ordered attributes:

```json
{
  "key": "model_year",
  "label": "Model year",
  "type": "number",
  "required": true,
  "filterable": true,
  "validation": { "min": 1950, "maxSource": "currentYear" },
  "order": 3
}
```

Listings persist values in an `attributes` map, but submission validates against the **published category schema version**. Store the schema version on the listing/revision to explain historic data. High-volume filters may be denormalized into indexed fields or the search index; do not add arbitrary MongoDB indexes per admin action.

## 3.4 Listing lifecycle

`draft → pending → published → paused | sold | expired | removed`, with `pending → rejected`, `paused → pending | published | removed`, and rejected listings returning to draft only through an explicit revision path. Risk-sensitive edits return published listings to pending review. Removal hides records and records actor/reason; media cleanup runs after retention. Listing revisions preserve moderated snapshots.

Promotion does not change listing status. It creates a separate entitlement; ranking reads active, paid/comped entitlements and labels sponsored placement.

## 3.5 Consistency and transactions

Use MongoDB transactions for bounded multi-document changes such as verified payment → ledger entry → entitlement, and moderation decision → listing/user status → audit event. External calls are outside the transaction and coordinated with idempotency keys/outbox events. Webhook processing stores provider event IDs before applying effects.

Counters (views, ad impressions) need not synchronously update primary documents. Aggregate them from append-only events or atomic counter buckets to avoid hot documents.

## 3.6 Location and privacy

Store exact coordinates only where necessary and with consent. Public listing responses return an area/city or deliberately reduced coordinate precision. Use a 2dsphere point for radius queries; never expose a seller's private address by default. Remove location metadata from uploaded image EXIF during media processing.

## 3.7 Retention examples

- OTP challenge: minutes via TTL index.
- Revoked/expired sessions: short operational retention, then TTL deletion.
- Raw analytics/ad events: 30–90 days; retain anonymized aggregates longer.
- Removed listing/reports: policy-defined moderation/legal retention.
- Financial ledger/audit: append-only and retained per legal/business requirements.
- Account deletion: anonymize marketplace history where legitimate records must remain; delete optional profile/media after hold.

Retention values must be approved before launch and published in privacy documentation.

## 3.8 Backup and migration

Use managed MongoDB Atlas backups for early hosting. Test point-in-time restoration before production. Schema changes use versioned, idempotent scripts with dry-run, metrics, and rollback/forward-fix notes. Deploy code capable of reading old and new document shapes before backfilling large collections.
