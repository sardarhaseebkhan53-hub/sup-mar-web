# Phase 16 Completion Record — AI-Assisted Marketplace

**Status:** Complete. QAVLIO is now an AI-assisted marketplace: semantic natural-language search, smart recommendations with honest labeling, an AI listing assistant with seller-approved suggestions, similar-item matching over real listings, optional embedding-backed vector search, AI usage governance, and an admin AI dashboard.

**Technology lock honored:** React + TypeScript + Vite + Tailwind frontend; Node + Express + TypeScript REST backend; MongoDB + Mongoose; AI strictly server-side and provider-abstracted; PKR default currency; no Flutter/Dart/React Native anywhere.

## 1. AI architecture

- **`AIService`** (`backend/src/ai/AIService.ts`) is the single server-side facade. Features call `generateText`, `analyzeText`, `generateEmbeddings`, `classify`, `extractAttributes`, `extractIntent` — never a provider directly.
- **`AIProvider`** interface extended with `generateEmbeddings()`, `classify()`, `extractAttributes()`:
  - `HeuristicProvider` — deterministic, zero-credential, hashed bag-of-token embeddings (256-dim) plus regex attribute extraction. QAVLIO is fully functional with no external AI configured.
  - `OpenAIProvider` / `GeminiProvider` — real embeddings/classification with graceful fallback to the heuristic provider. API keys remain in `backend/.env` only; the browser never sees provider names beyond "configured: yes/no".
- **Request pipeline:** frontend → QAVLIO backend → AIService → marketplace data retrieval (Mongoose/search service) → AI processing → validated response → frontend. The model never queries MongoDB and never originates a listing, price, or seller.

## 2. Semantic search (upgrades Phase 3)

- `SearchIntent` now carries `query`, `minYear`/`maxYear`, plus the existing category/brand/model/price/condition/location/attributes/sort fields — all Zod-validated before execution ("Toyota Corolla 2020 to 2023 under 4 million in Islamabad" extracts make, model, year range, price ceiling, city).
- **Synonyms** (`ai/synonyms.ts`): controlled mappings (mobile→smartphone, bike→motorcycle, laptop→notebook, couch→sofa…) widen recall without rewriting the user's words.
- **Search correction** (`ai/correction.ts`): vocabulary built from real listing titles + controlled brand/city lists; "iphon 15 pro max" gets a *suggested* "iPhone 15 Pro Max" — the query is never silently changed.
- **Zero-result recovery** (`aiSearchService.ts`): "No exact matches found." plus related categories that actually contain listings, similar searches that actually return results, a broader-price option quoting the real cheapest comparable, and real nearby cities.
- **Stepwise relaxation**: attribute → keyword → category-only passes recover from descriptive noise while staying inside the database's published/available rules.
- **Transparent explanation**: every AI search returns `explanation` chips ("Showing 24 listings matching: iPhone · Under Rs. 150,000 · Islamabad · Used") and structured `appliedFilters` the user can adjust or remove chip-by-chip.
- 45-second response cache keyed by query+intent (deduplication); nothing cached for empty results.

## 3. AI shopping assistant

- `/ai-assistant` with `AIMessage`/`AIListingResults` — premium, accessible (roles, aria-live, focus management, reduced-motion) and grounded: listing cards come only from `runAiSearch`/storage.
- Capabilities: search, follow-up filters via conversation intent, compare, listing explanations, seller help, marketplace policy questions, support escalation.
- **Hallucination protection**: questions about non-existent listings (`QV-…`) or unverifiable sellers/prices get "I couldn't verify that from the available QAVLIO listings." instead of a guess.
- **Response validation** (`ai/responseValidation.ts`): every listing in a reply is re-fetched from storage (IDs must exist, price/title re-read authoritatively); intents are re-validated (category slugs, price bounds, operator-safe attribute keys) before reaching the client.
- **Limitations enforced**: no purchasing, payments, refunds, verification, bans, or account changes — sensitive-action phrasing is refused with a pointer to the proper screens.

## 4. Comparison

- `POST /ai/compare` compares up to 3 listings on price, condition, location, category, and only attributes that actually exist on the compared listings ("Not listed" otherwise).
- Grounded AI summary (`aiSummary`): cheaper/more RAM/more storage/closer-city claims each cite the compared values; ends with the "nothing is inferred" note.
- Frontend `CompareListings` tray (select up to 3, side-by-side table, AI summary with transparency labels).

## 5. Recommendations

- **`RecommendationService`** with `getForUser()`, `getSimilarListings()`, `getTrending()`, `getBecauseYouViewed()`, `getBecauseYouSearched()`.
- Homepage sections: **Recommended for You**, **Because You Viewed**, **Based on Your Searches**, **Similar to Your Favorites**, **Trending Near You** (plus honest **Popular Near You** for cold start).
- Signals: views, favorites, recent searches, saved-search categories, location, price bands. Logged-in users get account signals; guests get non-account session signals (locally stored categories/searches/views passed explicitly) — no login required.
- Ranking blends relevance, freshness, location proximity, price compatibility, behavior, quality, and availability; promoted listings get a small boost but must still rank on relevance.
- **No fake personalization**: without meaningful signals, sections are labeled "not personalized" and never claim "for you".
- 60-second cache with version invalidation on listing sold/removed/expired and meaningful listing changes.

## 6. Embeddings & vector search (optional architecture)

- **`ListingEmbedding`** model: `listingId`, `embeddingReference`, `model`, `dimensions`, `contentHash`, `updatedAt` — no provider secrets.
- Embedding input = title + description excerpt + category + allowed public attributes only (never seller identity/contact).
- **Regeneration by content hash** — embeddings rebuild only when meaningful content changes, never on views. Publish/update transitions regenerate in the background; sold/removed listings invalidate.
- **`VectorSearchService`** with `searchSimilar()` and `searchByIntent()`: cosine similarity over real same-category candidates with price/location blending; the in-process index is replaceable (interface-shaped for Atlas Vector Search). Listing detail "Similar Listings" now uses this ranking.

## 7. AI listing assistant

- Dedicated endpoints: `POST /api/ai/listing/title`, `/description`, `/attributes`, `/category`, `/price-insight`, `/quality`.
- Seller panel (`AIListingAssistant`) inside Create Listing with six sections — Improve Title, Improve Description, Suggest Category, Extract Attributes, Price Insight, Listing Quality — each with **Apply / Edit / Dismiss** controls. Nothing is applied silently.
- Title/description generation uses only seller-supplied facts and states so; attribute extraction ("Samsung S24 256GB black" → brand/model/storage/color) is confirm-required; category suggestions are a path the seller confirms.
- **Price insight**: min/median/typical range from comparable live listings, labeled "Based on N available QAVLIO listings", with an explicit not-a-guarantee disclaimer and an honest "not enough comparable listings" state below three comparables.
- **Quality score** (0–100): title quality, description completeness, image availability, attribute completeness, category accuracy + improvement suggestions — explicitly not a trust score.

## 8. Governance, tracking, cost control

- **AI usage tracking**: `AIEvent` records type, feature, provider, model, latency, tokens in/out, estimated cost, cached flag, success — never prompt text. Analytics add p95 latency, popular features, provider breakdown, cached responses.
- **Admin dashboard `/admin/ai`**: requests, searches, no-result rate, errors, latency (avg + p95), tokens/cost, popular features, provider split, plus controls for provider/model, per-minute/per-day limits, max response tokens, and per-feature flags (Assistant, Search, Recommendations, Listing Assistant, **Price Insights**, Support, Moderation). Users cannot pick models.
- **Rate limiting**: express window + per-user/session/IP bucket per feature, configurable in admin settings.
- **Data protection**: passwords, payment credentials, verification documents, private messages, admin notes, fraud rules, and tokens are never sent to providers; untrusted text is wrapped and injection/sensitive-action probes are refused.

## 9. API surface added

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/ai/search` | Natural-language marketplace search (upgraded payload: explanation, appliedFilters, correction, zeroResult) |
| POST | `/api/ai/assistant` | Assistant alias of `/ai/chat` |
| POST | `/api/ai/listing/title` \| `/description` \| `/attributes` \| `/category` \| `/price-insight` \| `/quality` | Dedicated listing-assistant actions |
| GET | `/api/recommendations` | Homepage sections (guest signals supported) |
| GET | `/api/recommendations/trending` | Trending (optionally near a city) |
| GET | `/api/recommendations/similar/:listingId` | Grounded similar listings with match reasons |

## 10. Components added/updated (frontend)

`AISearchBar`, `AISearchFilters`, `AISearchExplanation`, `AIAssistant` (panel), `AIMessage`, `AIListingResults`, `RecommendationSection`, `RecommendationCard`, `CompareListings`, `AIListingAssistant`, `AITitleSuggestion`, `AIDescriptionSuggestion`, `AIAttributeSuggestion`, `AICategorySuggestion`, `AIPriceInsight`, `AIQualityScore`, `AIUsageIndicator` — all matching the existing QAVLIO card/design language, keyboard accessible, aria-labeled, and responsive from 320px up. The header/hero search bars gained an opt-in AI toggle while normal keyword search remains one tap away.

## 11. Verification performed

- `npm run check` green: ESLint (0 warnings), TypeScript (both workspaces), backend suite **114 passing** (37 new Phase 16 tests), frontend suite **63 passing**, production builds.
- Live run verified: backend on :5000 (memory mode, no MongoDB in sandbox) and Vite dev server on :5173 with `/api` proxy; NL search with year ranges, did-you-mean, zero-result recovery, guest + personalized recommendation sections, similar listings with reasons, price insight, quality score, attribute extraction, compare with AI summary, assistant hallucination guard, prompt-injection refusal, and rate limiting (429 observed on burst) all exercised over HTTP.
- Security tests: injection refusal, unauthorized tool denial, fabricated listing IDs dropped by response validation, Mongo-operator injection via attribute keys blocked, API keys absent from every response.
- Regression: Phases 1–15 suites pass unchanged (two heading-copy assertions updated to match the new assistant header/admin page title).

## 12. Boundary

AI features degrade gracefully: with no provider key the heuristic engine serves everything locally; recommendation embeddings regenerate lazily after process restarts; a production provider key is a deployment integration, as are MongoDB-backed persistence and Atlas vector search if desired. No autonomous purchasing, AI payments, auto-bans, or future-feature work was added.
