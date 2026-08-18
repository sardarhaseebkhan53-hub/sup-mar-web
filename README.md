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

## Configuration

- Real secrets belong only in `backend/.env`; all `.env` files are ignored.
- Browser-safe variables alone may use `VITE_`.
- Profile image upload uses signed Cloudinary direct uploads only when `MEDIA_PROVIDER=cloudinary` and server-only Cloudinary credentials are configured; otherwise the UI returns an honest unavailable state.
- Fees, limits, currencies, promotions, categories, trust decisions, roles, and ad campaigns are never trusted from frontend state.
- English/Urdu dictionaries live under `frontend/src/i18n`; future locales add dictionaries rather than rewriting components.

## Documentation

Start with the [Phase 0 controlling blueprint](docs/00-phase-0-blueprint.md), [documentation index](docs/README.md), [Phase 1 completion report](docs/PHASE-1-COMPLETION.md), and [Phase 0 completion record](docs/PHASE-0-COMPLETION.md). The [Phase 2 identity design](docs/12-phase-2-identity.md) records the implemented authentication boundary.

## Current boundary

Phases 0–17 are implemented, including listings/search, realtime chat, advertising, AI, trust and safety, buyer discovery, seller monetization, the Phase 16 AI-assisted marketplace, and the Phase 17 Seller Business Center: a grouped seller workspace with a real-data dashboard, bulk listing management, business inventory with stock alerts, a lead pipeline, privacy-safe customer views, orders, labeled revenue metrics, windowed analytics, grounded AI seller insights, quick-reply templates, business-team management with an enforced permission matrix, notification center, business settings with working hours, CSV exports, and server-side global search — all ownership-scoped from the authenticated identity. Real email/SMS/social credentials, a production payment adapter, durable production data without configured MongoDB, identity document review, mandatory admin 2FA, configured cloud media credentials, a production AI provider key, seller payouts, production hosting, and backups remain deployment integrations. The payment sandbox is restricted to non-production environments.

See [Phase 13 completion](docs/PHASE-13-COMPLETION.md) for the monetization boundary, [Phase 14 completion](docs/PHASE-14-COMPLETION.md) for command-center operations and administrative RBAC, [Phase 15 completion](docs/PHASE-15-COMPLETION.md) for the verification and anti-fraud boundary, [Phase 16 completion](docs/PHASE-16-COMPLETION.md) for the AI-assisted marketplace boundary, and [Phase 17 completion](docs/PHASE-17-COMPLETION.md) for the Seller Business Center boundary.

**Recommended next:** production provider integration, deployment, and launch readiness.
