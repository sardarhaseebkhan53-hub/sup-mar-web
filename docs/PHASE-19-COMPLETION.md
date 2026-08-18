# Phase 19 — Production Hardening Completion

QAVLIO remains a **web application only** (React + TypeScript frontend, Node.js + Express + MongoDB backend, PKR default currency). Phase 19 adds the production-performance, PWA, SEO, observability, and deployment-readiness layer on top of Phases 0–18. No Flutter/Dart/React Native code was introduced.

## What changed

### Frontend — performance
- Confirmed route-based code splitting for `/`, `/search`, `/listing/:id`, `/create-listing`, `/seller/*`, `/admin/*`, `/ai-assistant`, `/settings`, etc. (admin/seller/AI code loads only when required).
- Added `rollupOptions.output.manualChunks` in `vite.config.js` to split React, React Router, Framer Motion, TanStack Query, Lucide and socket.io into long-cached vendor chunks.
- Made `socket.io-client` lazy (`getSocket()` is now async and dynamically imports the module), so realtime code is absent from the first paint for guests. Updated the three callers (`NotificationBell`, `useUnreadMessages`, `MessagesPage`).
- Refined TanStack Query defaults: `staleTime`, `gcTime`, no retry on 401/403/404/422/429, retry-once for transient failures, `refetchOnReconnect` on, `retry: 0` for mutations.
- Added debounced search + request cancellation in `CategoryPage`.
- Initial JS dropped from ~348 kB to ~155 kB (gzip ~106 kB → ~43 kB).

### Frontend — images
- `ImageWithFallback` now defaults to `loading="lazy"` + `decoding="async"` and supports `aspect-ratio` layout reservation (CLS-safe) with loading skeleton and error placeholder (never a broken-image icon).
- `Avatar` uses bounded intrinsic dimensions, lazy loading, and an initials fallback on error.

### Frontend — PWA
- `public/manifest.webmanifest` (name, short_name, start_url, standalone, theme/background colors, icons incl. maskable, shortcuts).
- Generated PNG icons from the brand SVG via `frontend/scripts/generate-icons.mjs` (`npm run icons`, dev-only `sharp`).
- `public/sw.js` service worker: network-first navigation shell with offline fallback, stale-while-revalidate for static assets, and it never caches `/api/` responses. Update/`SKIP_WAITING` messaging.
- `frontend/src/pwa/usePwa.ts` + `PwaPrompts.tsx`: offline banner, one-time install prompt (respects dismissal), and an update prompt (applies cleanly, never breaks an active session). Registered via the hook; disabled in dev and when unsupported.

### Frontend — SEO & accessibility
- `frontend/src/seo/Seo.tsx`: per-route title, description, canonical, Open Graph, Twitter, robots, and JSON-LD injection with scoped cleanup.
- `frontend/src/seo/jsonLd.ts`: Schema.org builders (WebSite, Organization, BreadcrumbList, ItemList, Product/Offer).
- Applied `<Seo>` to Home, Categories, Search/Category, Help, Info (about/contact/safety/terms/privacy), Campaign landing, and public seller pages. Listing details already carried Product JSON-LD + canonical + OG.
- Canonicalization to `/marketplace/:slug`; regenerated `sitemap.xml` with all 19 categories; `robots.txt` disallows private dashboards/auth areas.
- Premium 404 ("Looks like this listing got away.") with search, home and categories recovery.
- Added a global `ErrorBoundary` so a single component/route failure never destroys the whole app.

### Backend — observability & production config
- `requestLogger.ts`: structured JSON logging (method, path, status, latency, request ID) with redaction for sensitive routes/bodies.
- `GET /health` and new `GET /ready` (503 until MongoDB is connected).
- `slowQuery.ts`: optional Mongoose slow-query detection (`SLOW_QUERY_THRESHOLD_MS`) logging collection/operation/latency/rows — never conditions or data.
- `compression` middleware; `cacheControl.ts` for safe public read endpoints (categories, public config).
- Marketplace-appropriate CSP (allows CDN images/media/fonts, websockets, blocks inline scripts); kept helmet/CORS/rate limiting/request IDs.
- Added targeted `Listing` compound indexes for the primary published+available browse/search filters.

### Docs
- `README.md` updated with Phase 19 performance/PWA/SEO/observability sections and deployment notes.
- `backend/.env.example` documents `SLOW_QUERY_THRESHOLD_MS`; `frontend/.env.example` documents `VITE_SITE_URL`.
- This completion record.

## Verification

- `npm run build` (frontend + backend) succeeds.
- `npm run lint` passes for both workspaces (fixed pre-existing unused-import / empty-block errors).
- `npm run typecheck` passes for both workspaces.
- Backend tests: 136 passed. Frontend tests: 63 passed (404 test updated to the new Phase 19 copy).
- Backend served locally: `/health`, `/ready`, security headers, `Cache-Control` on categories verified via curl.
- Frontend dev server serves the SPA with PWA manifest, SPA routes (e.g. `/search?category=cars&minPrice=500000` → 200), and `/api` proxy.

## Notes / boundaries

- PWA service worker registers only in production; its failure is non-fatal.
- `/ready` correctly reports not-ready until a real MongoDB connection exists (no DB is present in this sandbox).
- Logs and slow-query output never include passwords, payment credentials, tokens, private message contents, or sensitive personal data.
- The offline experience shows the cached public shell only; it never fakes a successful transaction offline.
- Performance figures are measured from the real production build (no hardcoded metrics).
