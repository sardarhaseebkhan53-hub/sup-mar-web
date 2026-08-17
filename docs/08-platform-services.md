# 8. Advertising, Payments, Promotions, Analytics, and AI

## 8.1 Advertisement architecture

### Registered slots

| ID | Typical placement | Format behavior |
|---|---|---|
| `HOME_TOP` | Home above/near hero if enabled | Wide banner; not shown by default if empty |
| `HOME_MIDDLE` | Between discovery sections | Responsive banner |
| `CATEGORY_TOP` | Category/results above inventory | Responsive banner |
| `LISTING_BANNER` | Listing content column | Wide/in-content |
| `LISTING_SIDEBAR` | Listing side rail | Rectangle; moves/omits on mobile by policy |
| `DASHBOARD` | Non-sensitive dashboard area | Rectangle/banner |
| `MOBILE_HOME` | Mobile-only home placement | Compact mobile creative |

Pages render `<AdSlot slotId="…" />`; they never know campaign IDs, creatives, targeting or billing. The slot service returns a signed/validated creative DTO or no-fill. Unknown IDs fail validation.

### Campaign decision sequence

1. Slot request contains slot ID, coarse locale/category/device context and consent-safe session data.
2. Server filters active date window, approved creative, slot compatibility, targeting and remaining budget/frequency.
3. Weighted selection uses pacing/priority; house ad is optional fallback.
4. Response supplies campaign/creative ID, asset dimensions/alt, safe destination and disclosure.
5. Client records viewability-qualified impression and click using short-lived event tokens. Server validates and deduplicates.

Ads are visibly labeled, cannot imitate navigation/listings, cannot access private dashboard content, and must meet image/accessibility/performance rules. Sensitive category targeting and third-party tracking require legal/consent review. Admin campaign changes are previewed, approved and audited.

## 8.2 Listing fee configuration

No numeric fee or free limit is embedded in frontend code. Admin-managed, versioned pricing rules can vary by:

- listing product/action (publish, renew),
- category/subcategory,
- seller tier/store plan,
- currency/country,
- free quota and quota period,
- duration and effective date,
- tax treatment, promotion bundle, experiment cohort.

Client requests a quote with actor, category and action. The server returns immutable `quoteId`, line items, currency, expiry, policy version and eligibility explanation. Submission consumes that quote idempotently. The Phase 1 public config intentionally returns `null` for free limit, fee and duration until configured.

## 8.3 Promotion products

Planned products:

- top placement,
- featured visual treatment,
- homepage placement,
- category promotion,
- sponsored listing.

`promotionProducts` define label, placement, eligibility, duration and pricing rule. Purchase produces a time-bounded `promotionEntitlement` only after verified payment. Ranking is a separate service input; payment never directly rewrites view counts or listing status. All paid placement is disclosed. Admin can schedule/disable products without frontend changes, but published purchases retain their promised entitlement or receive a defined remedy.

## 8.4 Payment architecture

Use a provider adapter so local/global providers can be added without changing listing/promotion logic.

```text
Price policy → immutable quote → payment intent → provider session
                                          ↓
User return (informational)      signed webhook → idempotency store
                                          ↓
                         payment state + ledger transaction
                                          ↓
                     receipt / entitlement / notification
```

Rules:

- Server calculates amount/currency from a valid quote.
- Provider return redirects do not mark payment successful.
- Verify signature, event ID, amount, currency, account, and expected state.
- Store provider event IDs and idempotency keys; duplicate events return success without duplicate effects.
- Append-only double-entry-style ledger supports reconciliation/refund and audit.
- Raw card credentials never touch QAVLIO servers; use provider-hosted/tokenized checkout.
- Refund/chargeback workflows revoke or adjust entitlements according to explicit policy and produce ledger/audit entries.
- Daily automated reconciliation compares provider settlements with QAVLIO records.

## 8.5 Calls and contact privacy

Initial “Call seller” may reveal a seller-consented number only to an eligible, rate-limited signed-in buyer and logs the reveal. Safer future options include masked relay/call provider adapters. Never place phone numbers in public HTML or analytics. Users can disable calls, block actors, and report abuse. Emergency claims are not made.

## 8.6 Notification architecture

Domain events (message received, listing approved, saved-search match, payment settled) enter an outbox/queue. A notification service checks topic/channel preference, locale, quiet hours, deduplication and template version before sending in-app/email/SMS/push. Delivery providers are adapters. Marketing consent is separate from transactional notices. Deep links are allow-listed and mobile-compatible.

## 8.7 Analytics taxonomy

Events use `{ eventId, name, schemaVersion, occurredAt, actor/session pseudonym, context, properties }`.

Core events:

- `search_submitted`, `filter_applied`, `listing_viewed`, `listing_saved`
- `seller_contact_started`, `call_revealed`, `conversation_started`
- `listing_draft_created`, `listing_submitted`, `listing_approved`, `listing_marked_sold`
- `pricing_quote_viewed`, `checkout_started`, `payment_settled`, `promotion_activated`
- `ad_impression`, `ad_click`, `report_submitted`, `support_ticket_created`

Never send message content, passwords/OTP, exact private coordinates, full phone/email, identity documents, payment details, or admin evidence into product analytics. Consent and retention apply. Revenue dashboards derive from ledger/payment data, not client analytics events.

Seller analytics disclose definitions and resist manipulation: qualified unique views, saves, inquiries, response time, and promotion performance. Public counts may be delayed/rounded.

## 8.8 QAVLIO AI Assistant

### Future capabilities

Grounded marketplace/help explanations, conversational product discovery, category/title/description suggestions, payment/support guidance, support-ticket drafting, suspicious/duplicate signals, and moderator assistance.

### Architecture

```text
UI → AI gateway → authentication/rate/policy → retrieval + approved tools
                    ↓                         ↓
             redaction/audit         help/search/listing/support APIs
                    ↓
            model provider adapter → safe response + citations/confidence
```

- AI gateway is server-only; provider keys never reach clients.
- Retrieval is limited to approved help/policy/catalog data with source/version metadata.
- Tool calls use the user's normal authorization and require confirmation for mutations.
- PII/secrets are minimized/redacted; prompts/outputs have explicit retention and access policy.
- Moderation/duplicate scores are decision support, not automatic punitive truth. Human review and appeal remain.
- The assistant clearly identifies itself, reports uncertainty, and routes high-risk/account/payment disputes to humans.
- Prompt injection defenses isolate untrusted listing/user content and use allow-listed structured tool arguments.
- Evaluate factuality, unsafe actions, bias, multilingual quality, jailbreak resistance, latency and cost before rollout.

Phase 1 includes only the help/dashboard visual integration points and documentation; no model calls or implied intelligence.

## 8.9 Support architecture

Tickets include category, actor, priority, listing/payment/conversation references, sanitized attachments, status, assignee, SLA timers and immutable activity. AI/chat can draft ticket context only with consent. Support views redact information by role and audit access. Escalation covers trust/safety, payments, verification, technical, and legal/privacy queues.

## 8.10 Language architecture

UI strings move to namespaced message catalogs (`common`, `marketplace`, `seller`, `admin`, `errors`). Database content stores localized admin fields where necessary; user listing text is not silently machine-translated. Locale governs number/date/currency and direction. Notifications and SEO metadata choose a published template/content locale with fallback. English and Urdu are planned initial languages; Phase 1 exposes the locale direction but not complete translations.
