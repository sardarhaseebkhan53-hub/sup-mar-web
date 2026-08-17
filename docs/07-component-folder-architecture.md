# 7. Component and Folder Architecture

## 7.1 Repository shape

```text
sup-mar-web/
├── frontend/
│   ├── public/                  # crawler/static public files
│   └── src/
│       ├── assets/              # brand and optimized Phase 1 media
│       ├── components/
│       │   ├── dashboard/       # dashboard headings/stats
│       │   ├── marketplace/     # listings, categories, ads, filters, hero
│       │   ├── navigation/      # header, category/mobile nav, footer/search
│       │   └── ui/              # buttons, logo, badge, loader, primitives
│       ├── config/              # browser-safe runtime defaults
│       ├── constants/           # routes and stable identifiers
│       ├── data/                # Phase 1 preview fixtures only
│       ├── hooks/               # reusable React behavior
│       ├── layouts/             # public, auth, dashboard shells
│       ├── pages/               # route composition
│       │   ├── auth/
│       │   └── dashboards/
│       ├── services/            # REST adapters
│       ├── styles/              # Tailwind entry/global rules
│       └── utils/               # pure formatters/helpers
├── backend/
│   ├── src/
│   │   ├── config/              # env and database
│   │   ├── constants/           # roles, categories, ad IDs
│   │   ├── controllers/         # HTTP translation only
│   │   ├── middleware/          # validation/auth/security/errors
│   │   ├── models/              # Mongoose persistence schemas
│   │   ├── realtime/            # Socket.io bootstrap/event modules
│   │   ├── routes/              # versioned routers
│   │   ├── services/            # business/use-case logic
│   │   └── utils/               # errors/async helpers
│   ├── test/
│   └── uploads/                 # ignored local placeholder, never production store
├── docs/
├── .vscode/
└── package.json                 # npm workspaces and quality commands
```

No Docker artifacts are used or required.

## 7.2 Frontend boundaries

- **Pages compose; components render.** A page fetches/coordinates route data and combines components. It does not duplicate card/header/form internals.
- **Server state lives behind services/hooks.** Add TanStack Query only when persisted workflows justify caching/invalidation; Phase 1 avoids a premature state library.
- **Local UI state stays local.** Favorite preview, menu, filter disclosure and password visibility use component state.
- **Auth/session context is introduced in Phase 2.** It exposes actor/capabilities, not token storage details. Route guards use server-confirmed session state.
- **Fixtures are temporary.** `src/data` exists for visual review; migrate pages to `services` query adapters and keep fixtures in tests/Storybook-like catalogs.
- **Constants are stable contracts.** Ad slot IDs and route builders are imported rather than repeated strings.

## 7.3 Reusable component contracts

### `ListingCard`

Receives a normalized listing summary. Owns presentation and temporary saved state only. It must not fetch the listing, calculate promotion eligibility, or infer verification.

### `AdSlot`

Receives a registered `slotId` and format variant. It owns loading/empty/creative/error states and event hooks. Pages choose placement but never embed campaign creative, destination, price, or targeting logic.

### `CategoryIcon` / `CategoryCard`

Maps server-safe icon identifiers to allow-listed local icon components, with a fallback. Never evaluate arbitrary SVG/component code from category data.

### `DashboardLayout`

Provides consistent QAVLIO brand, responsive navigation, account utility shell and role-specific navigation configuration. Child dashboards supply domain content. Authorization remains a route/API concern.

### `Button` and fields

Visual variants are finite and token-based. Polymorphic navigation uses React Router links. Every loading/disabled state preserves dimensions and an accessible name.

## 7.4 Backend layering

Request path:

```text
Router → validation/auth/rate middleware → controller → service/policy → model/provider
                                                    ↘ outbox/audit/event
```

- **Router:** method/path and middleware order.
- **Controller:** extracts validated input, calls one use case, maps output/status.
- **Service:** business policy, transactions, ownership and provider abstraction.
- **Model/repository:** persistence details and indexes.
- **Provider adapter:** OTP, payment, media, email/SMS/push, AI; domain code does not import vendor SDKs directly.
- **Worker:** asynchronous media, notification, expiry, analytics and reconciliation tasks; shares services/contracts, not HTTP controllers.

As complexity grows, group backend files by domain (`modules/listings/...`) while preserving these layers. Do not create a single `controllers.js` or catch-all service.

## 7.5 Planned modules

```text
modules/
  auth/ accounts/ categories/ listings/ search/ media/
  conversations/ notifications/ reviews/ trust/
  payments/ pricing/ promotions/ advertising/
  support/ ai/ analytics/ admin/ audit/
```

Each owns route schemas, use cases, persistence adapters, events, authorization policies, and tests. Shared code remains small: error/result types, actor context, money, pagination, event envelope, observability.

## 7.6 API/mobile compatibility

Web components never depend on MongoDB shapes. Services map API DTOs to normalized view models. Future mobile clients use OpenAPI-generated types and the same stable IDs, cursor pagination, permission semantics, idempotency keys, media upload intents, and Socket.io event envelope. Browser-specific concepts (cookies, DOM, React components) do not enter domain contracts.

## 7.7 Error/loading/empty states

Every resource screen defines:

1. initial loading (skeleton preserving layout),
2. success with data,
3. valid empty result with next action,
4. recoverable error with retry,
5. unauthorized/forbidden/removed behavior,
6. stale/offline state for drafts or messages where applicable.

Global errors carry a request ID usable by support. User messages are safe and actionable; internal stack/provider payloads remain server-only.

## 7.8 Configuration ownership

- `frontend/src/config` is browser-safe presentation fallback only.
- `backend/.env` contains deployment secrets/endpoints, not changing business prices.
- `platformSettings`, `pricingRules`, `promotionProducts`, category documents and ad campaigns contain admin-managed runtime policy with publish/version/audit workflow.
- Feature flags control rollout, not permanent entitlement or authorization.

## 7.9 Test pyramid

- Pure unit tests: formatters, policy, price calculations, schema mapping.
- Component tests: controls, responsive disclosures, keyboard and a11y behavior.
- API integration: validation, auth matrix, idempotency, Mongo transactions.
- Contract tests: OpenAPI DTO/event compatibility and provider adapters.
- Browser E2E: top buyer/seller/admin journeys at mobile and desktop sizes.
- Security/abuse: object-level authorization, upload adversarial inputs, token replay, webhook replay, rate limits.

Phase 1 includes formatter tests and API smoke/contract-shape tests; broader suites arrive with functional features.
