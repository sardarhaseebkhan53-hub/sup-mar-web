# QAVLIO

**Buy. Sell. Discover.**

QAVLIO is an API-first, security-oriented marketplace for Pakistan. Phase 0 establishes the controlling product, technology, data, monetization, security, and provider-independence blueprint. The repository also retains the implemented Phase 1 original brand/public UI and Phase 2 identity foundation: verified email/phone registration, secure recovery, rotating sessions, profiles, trust states, role-aware routes, seller onboarding, admin controls, i18n, and security auditing—without Docker.

## Included

- Complete Phase 0 blueprint covering domains, REST/realtime contracts, collections, provider boundaries, security, testing, operations, and Phases 0–13
- Original QAVLIO orbit-Q logo suite, premium public marketplace, 19-category bootstrap, listing details, filters, ads, help, and responsive navigation
- Complete seller monetization: authoritative free-listing quota, paid listings, credits, packages, promotions, checkout, invoices, refunds, and revenue analytics
- Unified Phase 14 Admin Command Center for users, sellers, moderation, commerce, ads, AI, support, announcements, analytics, settings, exports, and immutable audit trails
- Phase 15 human-in-the-loop trust and safety: seller/listing verification, internal risk scoring, reports, blocks, restrictions, appeals, moderation rules, violation history, and safety education
- Phase 16 AI-assisted marketplace: semantic natural-language search with did-you-mean and zero-result recovery, honest smart recommendations (guests included), AI listing assistant with seller-approved suggestions, real-data price insights, listing quality scores, grounded similar-item matching, AI comparison, response validation/hallucination guards, AI usage governance, and an admin AI dashboard
- Phase 17 Seller Business Center: real-data seller dashboard with onboarding, listing tabs with bulk actions and duplication, business inventory with stock alerts, lead pipeline with private notes, privacy-safe customers, orders with timelines, labeled revenue and payout architecture, windowed analytics, AI seller insights, quick-reply templates, team management with a permission matrix, notification center, business settings with working hours, CSV exports, and server-side global search
- Phase 18 Growth Engine: campaigns, coupons, referrals and rewards across customer, seller and admin surfaces
- Phase 19 production hardening: PWA (manifest, service worker, offline shell, install + update prompts), SEO (per-route metadata, canonicalization, Open Graph/Twitter, Schema.org structured data, expanded sitemap and robots.txt), code-splitting and vendor chunking, lazy-loaded realtime, image/avatar optimization, a global error boundary and premium 404, structured request logging, compression, slow-query detection, `GET /health` + `GET /ready`, response caching for safe public endpoints, and deployment readiness
- Multi-step email/phone registration, password and phone-OTP login
- Six-digit OTP UI and server workflow: expiry, resend cooldown, attempt lock, purpose isolation, and rate limits
- Email verification instructions/link success/failure/already-verified handling
- Forgot/reset password with one-time challenge and session invalidation
- Short JWT access tokens plus rotating, hashed, HttpOnly-cookie refresh sessions
- Active device list, single/all-device logout, password change, and soft account deactivation
- Profile, coarse location, English/Urdu preferences, verification center, and notification preferences
- Explicit seller onboarding; seller status never grants trust badges
- Secure duplicate-account linking intake requiring password, request-bound OTP, warning phrase, and review
- Server-side customer, seller, moderator, support, admin, and super-admin roles with protected return-to-intent routes
- API-driven admin user management, status/role/verification services, confirmation, revocation, and audit
- Social OIDC/OAuth+PKCE provider interfaces for Google/Facebook/Apple, safely disabled until configured
- Honest dashboard/listing/chat/search placeholders for later phases—no fabricated transactional data
- Express/Mongoose models, Socket.io integration point, CI, automated tests, and complete `docs/`

## Tech stack

- **Frontend:** React 18, Vite 8, Tailwind CSS, React Router, Lucide
- **Backend:** Node.js 20+, Express, MongoDB/Mongoose, Socket.io, Zod, bcrypt, JWT
- **Quality:** ESLint, Vitest, Node test runner, Supertest, and a GitHub Actions template in `docs/`
- **Runtime:** npm workspaces; **no Docker**

## Quick start

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:5000`
- Health: `http://localhost:5000/health`

### Two authentication contexts

QAVLIO separates marketplace and administrator authentication completely.

| Context | Sign in at | Session |
|---|---|---|
| Marketplace customers and sellers | `/login`, `/register` | `qavlio_refresh` (HttpOnly, `/api/v1/auth`) |
| Administrators | `/admin/login` | `qavlio_admin_refresh` (HttpOnly, `/api/v1/admin/auth`) |

`/admin` resolves to `/admin/dashboard` for a signed-in administrator and to `/admin/login`
otherwise — it never redirects to the marketplace login. Admin sign-in requires a username
and password only; no phone number, SMS or OTP is involved. The API validates the
credentials at `POST /api/v1/admin/auth/login`; the browser never holds an admin password.

The API bootstraps the administrator once at startup from backend-only environment values
(`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `ADMIN_EMAIL`), storing a bcrypt hash and
never a plaintext password. Development defaults are `admin` / `ChangeThisAdminPassword123!`
— rotate them before any shared environment. See
[docs/13-admin-authentication.md](docs/13-admin-authentication.md).

### Local identity mode

When MongoDB is absent in non-production, the identity repository uses process memory so Phase 2 flows can be exercised without Docker. Accounts vanish when the API restarts. Development email/SMS challenges stay in the in-process test outbox; OTPs and reset secrets are redacted from backend logs. Production startup requires MongoDB and strong JWT/OTP secrets, and delivery fails closed until real provider adapters are configured.

## Commands

```bash
npm run dev
npm run dev:web
npm run dev:api
npm run lint
npm run test
npm run build
npm run check

# Production-only, one-time admin bootstrap; reads backend env values
npm run create-admin --workspace backend
```

Admin bootstrap requires `MONGODB_URI`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and strong production secrets. It creates the first `super_admin` only when no account exists for that email and refuses to mutate an existing identity.

## Routes

### Public

| Route | Purpose |
|---|---|
| `/`, `/browse`, `/category/:slug`, `/listing/:id/:slug` | Marketplace discovery |
| `/login`, `/login/phone` | Password and OTP login |
| `/register` | Multi-step email/phone registration |
| `/verify-otp`, `/verify-email` | Verification states |
| `/forgot-password`, `/reset-password` | Recovery flow |
| `/help`, `/ai-assistant` | Support and QAVLIO Assistant |

### Authenticated

| Route | Access |
|---|---|
| `/dashboard`, `/saved`, `/messages` | Customer/seller identity |
| `/account/profile` | Profile and location |
| `/account/verification` | Trust states and phone verification |
| `/account/security` | Sessions, password, linking, deletion |
| `/account/notifications`, `/account/settings` | Preferences/i18n |
| `/seller/onboarding` | Authenticated seller upgrade |
| `/sell`, `/seller/*` | Seller role/onboarding gate |
| `/admin`, `/admin/users`, `/admin/*` | Server-confirmed admin/super-admin role |

Protected actions preserve a validated local `returnTo` destination so users continue after login instead of losing context.

## Security summary

Passwords are bcrypt-hashed; OTP/email/reset secrets are HMAC-hashed; refresh tokens are random, hash-only in storage, HttpOnly/SameSite cookies and rotate on use. Protected APIs verify token, server session, account status, token version, current roles, and resource policy. Password/status/role changes revoke sessions. Login/OTP/recovery have route and identity attempt controls. Inputs are normalized, Zod-validated and operator-sanitized; errors never return password hashes, raw database errors, or provider internals.

## Performance, PWA & SEO (Phase 19)

- **Route code-splitting** — major routes (`/search`, `/listing/:id`, `/create-listing`, `/seller/*`, `/admin/*`, `/ai-assistant`, `/settings`, etc.) are lazy-loaded; admin/seller/AI code ships only when required.
- **Vendor chunking** — React, React Router, Framer Motion, TanStack Query, Lucide and socket.io are split into separate long-cached chunks. `socket.io-client` is lazy-imported so guests don't download realtime code on the first paint.
- **PWA** — `public/manifest.webmanifest`, generated PNG icons (`npm run icons` from the brand SVG), a `sw.js` service worker with a network-first navigation shell and stale-while-revalidate static caching (never caching private `/api/` data), an offline banner, a subtle one-time install prompt, and a clear update prompt. Installability is best-effort and never blocks the web app.
- **SEO** — a reusable `<Seo>` component (title, description, canonical, Open Graph, Twitter, robots) plus Schema.org JSON-LD (WebSite, Organization, BreadcrumbList, ItemList, Product/Offer) on public pages; canonicalization to `/marketplace/:slug`; an expanded `sitemap.xml` and a `robots.txt` that disallows private dashboards.
- **Performance budget guidance** — initial JS is under ~160 kB (≈43 kB gzip); images use `loading="lazy"`, `decoding="async"` and CLS-safe `aspect-ratio` reservations with loading/error placeholders; reduced-motion is honored site-wide.

## Backend observability (Phase 19)

- Structured JSON request logging (method, path, status, latency, request ID) with body redaction for `/auth`, `/payments`, `/conversations`, `/messages`, `/sellers`, `/admin`, `/coupons`, `/referrals` and `/users` password/account routes.
- `GET /health` (service + DB status) and `GET /ready` (readiness; 503 until MongoDB is connected).
- Optional slow-query detection: set `SLOW_QUERY_THRESHOLD_MS` to log any MongoDB operation above the threshold (collection, operation, latency, row count — never query conditions or data).
- Response caching (`Cache-Control`) on safe public read endpoints (categories, public config).
- gzip `compression` middleware; marketplace-appropriate Content Security Policy; helmet, CORS, rate limiting, request validation and request IDs.

## Configuration

- Real secrets belong only in `backend/.env`; all `.env` files are ignored.
- Browser-safe variables alone may use `VITE_`.
- Optional observability: `SLOW_QUERY_THRESHOLD_MS` (backend), `VITE_SITE_URL` (frontend canonical base).
- Profile image upload uses signed Cloudinary direct uploads only when `MEDIA_PROVIDER=cloudinary` and server-only Cloudinary credentials are configured; otherwise the UI returns an honest unavailable state.
- Fees, limits, currencies, promotions, categories, trust decisions, roles, and ad campaigns are never trusted from frontend state.
- English/Urdu dictionaries live under `frontend/src/i18n`; future locales add dictionaries rather than rewriting components.

## Documentation

Start with the [Phase 0 controlling blueprint](docs/00-phase-0-blueprint.md), [documentation index](docs/README.md), [Phase 1 completion report](docs/PHASE-1-COMPLETION.md), and [Phase 0 completion record](docs/PHASE-0-COMPLETION.md). The [Phase 2 identity design](docs/12-phase-2-identity.md) records the implemented authentication boundary.

## Current boundary

Phases 0–19 are implemented, including listings/search, realtime chat, advertising, AI, trust and safety, buyer discovery, seller monetization, the Phase 16 AI-assisted marketplace, the Phase 17 Seller Business Center, the Phase 18 Growth Engine, and the Phase 19 production-hardening layer (PWA, SEO, performance, observability, and deployment readiness): a grouped seller workspace with a real-data dashboard, bulk listing management, business inventory with stock alerts, a lead pipeline, privacy-safe customer views, orders, labeled revenue metrics, windowed analytics, grounded AI seller insights, quick-reply templates, business-team management with an enforced permission matrix, notification center, business settings with working hours, CSV exports, and server-side global search — all ownership-scoped from the authenticated identity. Real email/SMS/social credentials, a production payment adapter, durable production data without configured MongoDB, identity document review, mandatory admin 2FA, configured cloud media credentials, a production AI provider key, seller payouts, production hosting, and backups remain deployment integrations. The payment sandbox is restricted to non-production environments.

See [Phase 13 completion](docs/PHASE-13-COMPLETION.md) for the monetization boundary, [Phase 14 completion](docs/PHASE-14-COMPLETION.md) for command-center operations and administrative RBAC, [Phase 15 completion](docs/PHASE-15-COMPLETION.md) for the verification and anti-fraud boundary, [Phase 16 completion](docs/PHASE-16-COMPLETION.md) for the AI-assisted marketplace boundary, [Phase 17 completion](docs/PHASE-17-COMPLETION.md) for the Seller Business Center boundary, and [Phase 19 completion](docs/PHASE-19-COMPLETION.md) for the production-hardening boundary.

**Recommended next:** Phase 20 — final QA, security audit, full regression, deployment verification and launch preparation.
