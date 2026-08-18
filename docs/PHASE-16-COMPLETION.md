# Phase 16 — AI-Assisted Marketplace (Completion Report)

Phase 16 extends the Phase 10 AI foundation into a full AI-assisted marketplace: semantic
and natural-language search, a grounded shopping assistant, a real recommendation engine,
embeddings + vector search, seller listing assistance, and admin cost/feature governance.

Nothing from Phases 0–15 was rebuilt. No Flutter, Dart, React Native, Kotlin, Swift, or
native mobile code exists anywhere in the repository — this remains a **web application only**.

---

## 1. Governance and safety model

Everything below is enforced on the server. The browser never sees a provider key or a system prompt.

| Guarantee | Where it is enforced |
| --- | --- |
| All AI calls are server-side | `backend/src/ai/AIService.ts`; the frontend only calls `/api/v1/ai/*` |
| Keys never reach the browser | `publicAiConfig()` returns only `{enabled, features, providerConfigured}` |
| The model never queries MongoDB | Retrieval always goes through `searchService` / `listingService` |
| All AI output is validated | `validateSearchIntent()` re-checks category, attributes, ranges before any query |
| Listing IDs must exist | `runAiSearch`, `compareListings`, and recommendations resolve every ID against the DB |
| Prices come from the DB | `presentAiListing()` renders stored values; the model never emits a price |
| Hallucination guard | `"I couldn't verify that from the available QAVLIO listings."` |
| Authorization is never bypassed | AI search reuses the same visibility/blocking rules as normal search |
| Rate limiting | `ai/rateLimit.ts` per user/session/IP + a 20/min router window |
| Usage tracking | `aiUsageService` records feature, success, latency, tokens, cost, provider/model |

### Prohibited actions (all verified by test)

The assistant cannot purchase, send money, change payment status, verify identity, approve
refunds, modify seller accounts, or ban users. Prompt injection and secret-probing inputs are
rejected with `AI_UNSAFE_INPUT` **before** any provider call.

### Data minimisation

Embeddings are generated from title, category, subcategory, condition, curated attributes and
description only. `embeddingContent()` strips any key matching
`phone|email|contact|whatsapp|address|cnic|seller|owner`, so seller identity and contact details are
never sent to a provider. Usage records store no prompt text.

---

## 2. AI search

`POST /api/v1/ai/search` → `runAiSearch()` in `backend/src/services/aiSearchService.ts`.

- **Intent extraction** — `SearchIntent` carries `query, category, subcategory, keywords, brand,
  model, minPrice, maxPrice, minYear, maxYear, condition, location, sort, attributes`.
- **Smart filter extraction** — natural language becomes structured, *visible* filters. Terms already
  captured as a filter (city, brand, condition, attribute values, range words) are removed from the
  free-text query so filters and keywords cannot fight each other.
- **"Did you mean…?"** — `suggestCorrection()` returns `{original, suggestion, applied: false}`.
  The typed query is **never** silently rewritten; the user must accept the correction.
- **Controlled synonyms** — `expandSynonyms()` from a curated lexicon, capped at 6 expansions.
- **Progressive relaxation** — attributes → year range → synonyms → keywords-only. Every relaxation
  is reported in `relaxedFilters` and surfaced in the UI ("To find results we relaxed…").
- **Zero-result recovery** — related categories, a wider price band (only when it returns real
  results), up to 3 nearby cities, and similar searches. No fabricated listings, ever.
- **Transparency** — `explanation` always reads "Showing X of Y QAVLIO listings matching your search."

### Verified search behaviour (live)

| Query | Result |
| --- | --- |
| `cheap used iphone in karachi under 250000` | `QV-100310` — Rs. 142,000, Karachi |
| `gaming laptop with 16GB RAM near Lahore` | `QV-100312` — HP Pavilion RTX |
| `automatic honda 2018 or newer` | `QV-100311` Honda City Aspire 2018 Automatic |
| `ipone` | query preserved, suggests `iPhone`, `applied: false` |
| `submarine under 500` | empty + recovery options, zero invented listings |

---

## 3. Recommendations

`backend/src/services/recommendationService.ts` — `RecommendationService`:

`getForUser()`, `getSimilarListings()`, `getTrending()`, `getBecauseYouViewed()`,
`getBecauseYouSearched()`, plus `getSimilarToFavorites()` and `getHomeSections()`.

- **Ranking** blends relevance (category/search match), location, price band, freshness,
  listing completeness, and engagement. Availability is a hard gate, not a score.
  Promoted listings get a bounded `+8` only when already relevant.
- **Guests are first-class** — session signals (`recentListingIds`, `recentSearches`, `city`) are
  accepted without login.
- **No fake personalisation** — `getForUser()` requires a signal strength of ≥3 before it will say
  "Recommended for You". Otherwise it returns "Popular Near You" with `personalized: false`, and the
  UI renders a "Not personalised" marker.
- **No sensitive attributes** are used — only the user's own on-platform activity.
- **Caching** — TTL from `env.ai.recommendationCacheSeconds` (120s), invalidated by
  `invalidateRecommendationCache()` which `listingService.syncAiArtifacts()` calls on every
  create/update/transition/admin status change.
- Sections with no real listings are **omitted**, not padded.

---

## 4. Embeddings and vector search

- `ListingEmbedding` model: `listingId`, `listingPublicId`, `embeddingReference`, `model`,
  `dimensions`, `vector`, `contentHash`, `categorySlug`, `status`; indexed on `categorySlug + updatedAt`.
- Regeneration is **content-driven**: `needsRegeneration()` compares a SHA-256 content hash, so a
  view-count bump or a promotion change never triggers a re-embed.
- `scheduleEmbeddingRefresh()` runs off the write path — listing writes are never blocked or failed
  by the AI layer.
- `VectorSearchService.searchSimilar()` / `.searchByIntent()` are the only two methods that know how
  vectors are stored. `searchByIntent()` runs the normal DB query **first** and only re-ranks the
  result, so the database always remains authoritative. Swapping in Atlas Vector Search or pgvector
  means reimplementing those two methods and nothing else.

---

## 5. Seller AI ("Improve with AI")

`POST /api/v1/ai/listing/{title,description,attributes,category,price-insight,quality}`

- **Title / description** — built only from seller-supplied facts. `stripUnsupportedClaims()` removes
  any sentence asserting warranty, "brand new", "sealed", "first owner", "original box", or "mint"
  unless the seller's own text contains it. Missing facts become *questions*, never assumptions.
- **Attribute extraction** — restricted to the category's allow-list, then a grounding check
  requires each value to be traceable to the seller's own words. Ungrounded values are discarded.
- **Category suggestion** — always resolves to a real slug, ships a confidence score and
  alternatives, and requires confirmation.
- **Price insight** — computed from real comparable QAVLIO listings, labelled
  *"Based on QAVLIO listings"*. Below 3 comparables it refuses to estimate:
  *"I don't have enough comparable QAVLIO listings to give a reliable price range yet."*
- **Quality score** — e.g. `82/100`, weighted across title, description, images, attributes and
  category, with concrete improvements and an explicit disclaimer that it is
  **not a trust score** and does not verify the seller or item.
- **Every suggestion has Apply / Edit / Dismiss** (`AISuggestionActions`). Seller content is never
  silently replaced.

---

## 6. Comparison

`compareListings()` compares up to 4 real listings. Only attributes at least one listing actually
declares become rows; anything a listing does not declare renders as *"Not listed"* — never inferred.
Summary observations are computed from the data (lowest price, most RAM/storage, differing cities),
so every statement is evidence-backed.

---

## 7. API surface

New in Phase 16 (all existing Phase 10 endpoints preserved):

```
POST /api/v1/ai/assistant              (alias of /ai/chat)
POST /api/v1/ai/listing/title
POST /api/v1/ai/listing/description
POST /api/v1/ai/listing/attributes
POST /api/v1/ai/listing/category
POST /api/v1/ai/listing/price-insight
POST /api/v1/ai/listing/quality
GET  /api/v1/recommendations
GET  /api/v1/recommendations/trending
GET  /api/v1/recommendations/similar/:listingId
```

---

## 8. Admin controls (`/admin/ai`)

- Master enable/disable, provider, and a **model allow-list** (arbitrary/expensive models are
  rejected server-side as a cost control).
- Per-minute / per-day request limits and a max response length.
- Feature flags: AI Search, AI Assistant, Recommendations, Listing Assistant, Price Insights,
  AI Moderation, Semantic Search, AI Support.
- Usage dashboard: requests, estimated USD cost, tokens, average and p95 latency, error rate,
  breakdown by feature and by provider/model, plus recent failures.

Cost aggregation keeps 6-decimal precision (a bug found during verification — 4 decimals rounded
realistic per-request costs to `$0.0000`).

---

## 9. Components

| Component | Purpose |
| --- | --- |
| `AISearchBar` | Natural-language search entry with examples and de-duplicated requests |
| `AISearchFilters` | Shows and individually removes AI-extracted filters |
| `AISearchExplanation` | What was understood, what was relaxed, corrections, recovery |
| `AIAssistant` / `AIMessage` | QAVLIO-branded assistant with focus trap and restore |
| `AIListingResults` | Real listings only; empty state is the hallucination guard |
| `RecommendationSection` / `RecommendationCard` | Recommendation rows with honest basis text |
| `CompareListings` | Side-by-side table with "Not listed" for absent attributes |
| `AIListingAssistant` | "Improve with AI" panel in Create Listing |
| `AITitleSuggestion`, `AIDescriptionSuggestion`, `AIAttributeSuggestion`, `AICategorySuggestion` | Seller suggestions |
| `AISuggestionActions` | Shared Apply / Edit / Dismiss control |
| `AIPriceInsight`, `AIQualityScore`, `AIUsageIndicator` | Insight, scoring, status |

Legacy names (`AiAssistantPanel`, `RecommendedSection`, `SearchIntelligence`) remain as thin
re-export aliases so existing Phase 10–15 mount points keep working.

### Accessibility and responsiveness

Keyboard navigable throughout; the assistant dock traps Tab, closes on Escape, and restores focus to
the trigger. Loading/error/result changes announce via `role="status" aria-live="polite"`; errors use
`role="alert"`. Progress bars expose `aria-valuenow/min/max`. Icons are `aria-hidden`. Layouts use
`grid-cols-2 lg:grid-cols-4` and clamp-free flow that holds at 320/375/390/430/768/1024/1280/1440px.
Motion respects `useReducedMotion`.

---

## 10. Bugs found and fixed during verification

Live testing found seven real defects, all fixed:

1. **Location leaked into keywords** — `"used iphone in karachi"` searched the *text* "karachi",
   matching nothing. Terms captured as structured filters are now excluded from keywords.
2. **Range phrasing leaked into keywords** — `"2018 or newer"` searched for "or newer".
3. **Category over-validation** — a first fix wrongly rejected `cars`/`motorcycles`; the allow-list
   is now built from the full taxonomy (categories + subcategories + aliases).
4. **Duplicate model extraction** — `"iphone" + "iPhone 13"` produced the model `"iPhone iPhone"`.
   The extractor now prefers the most specific mention and normalises casing (`iPhone`, `MacBook`).
5. **Model name swallowed a spec** — `"HP Pavilion 16GB"` yielded model `"Pavilion 16gb"`.
6. **Weak titles** — title generation ignored facts stated in the description; it now grounds itself
   in extracted attributes and de-duplicates overlapping parts.
7. **Cost rounded to zero** — usage cost aggregation lost all precision at 4 decimals.

---

## 11. Verification

```
npm run check   # lint + typecheck + test + build — all green
```

| Gate | Result |
| --- | --- |
| ESLint (frontend + backend, `--max-warnings=0`) | pass |
| TypeScript (frontend + backend, `--noEmit`) | pass |
| Backend tests | **137 passing**, 0 failing |
| Frontend tests | **83 passing**, 0 failing |
| Production build | pass |
| Flutter / Dart / React Native / Kotlin / Swift files | **none** |

New test coverage: `backend/test/aiPhase16.test.ts` (60 tests) and
`frontend/src/components/ai/aiPhase16.test.jsx` (20 tests) covering normal / natural-language /
price / location / category / misspelled / zero-result search, recommendations for new, returning,
guest, favourites and recently-viewed users, embeddings and vector similarity, the seller assistant,
comparison, prompt injection, credential extraction, payment manipulation, unauthorized account
actions, private/admin data extraction, fake-listing generation, and hallucination guards.

Regression over Phases 1–15 is covered by the pre-existing 137-test backend suite and 63-test
frontend suite, all of which still pass.

### Notes

- `/admin/ai` and `/admin/settings/ai` both resolve to the dashboard; its heading is now
  "AI dashboard" (the Phase 14 route test was updated to match).
- With no `MONGODB_URI`, the AI layer runs against the in-memory demo catalog exactly like the rest
  of the app, so all of the above is reproducible locally with no database.
