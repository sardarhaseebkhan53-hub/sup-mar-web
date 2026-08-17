# 10. Development Workflow and Git/GitHub Setup

## 10.1 Prerequisites

- Node.js 20+ (repository `.nvmrc` currently selects 22)
- npm 10+
- Git and VS Code (recommended settings/extensions included)
- Optional in Phase 1: local MongoDB or free MongoDB Atlas deployment

**Docker is neither required nor supported by this project setup.**

## 10.2 Local setup

```bash
nvm use
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run dev
```

The root npm workspace starts Vite and Express together. Vite binds `0.0.0.0` and proxies browser `/api` requests to the local API, which prevents browser code from depending on localhost API URLs in hosted previews. Express also binds `0.0.0.0`.

MongoDB is optional for local visual/identity development. If `MONGODB_URI` is empty outside production, category/config services return safe defaults and identity services use an ephemeral process-memory repository. Development email/SMS secrets appear only in backend logs; data disappears on restart. Production startup refuses empty MongoDB or weak JWT/OTP secrets, and auth delivery fails closed until provider adapters are configured.

## 10.3 Environment policy

- Commit only `.env.example`; all real `.env*` are ignored.
- Only browser-safe values may use `VITE_`. Never place JWT, database, OTP, payment, media or AI secrets in frontend configuration.
- Business policy (fees, limits, durations, campaign targeting) belongs in versioned database configuration, not environment variables.
- Keep development, test, staging and production credentials/databases isolated.

## 10.4 Quality commands

```bash
npm run lint       # both workspaces
npm run test       # Vitest + Node/Supertest
npm run build      # production Vite bundle
npm run check      # complete local/CI gate
```

Before merging a functional feature, add tests at the correct level and manually verify 360px, 768px, 1024px, and 1440px layouts; keyboard/focus; one screen reader; no console/network errors; and relevant security/authorization cases.

## 10.5 Git conventions

- Protected `main`; changes arrive by pull request.
- Short-lived branch names normally follow `feature/...`, `fix/...`, `docs/...`. This Arena session is fixed to `arena/01a00abd-sup-mar-web`.
- Conventional-style commits: `feat(listings): ...`, `fix(auth): ...`, `docs(phase-1): ...`, `chore(ci): ...`.
- Keep commits reviewable and never commit secrets, runtime uploads, build output, logs or dependency directories.
- Pull request description covers problem, solution, screenshots/responsive checks, tests, security/data/config impact, migrations and rollback.

## 10.6 GitHub controls

The repository includes a pull request template and `docs/github-actions-ci.yml.example`. The active workflow path is intentionally omitted because the connected GitHub App cannot push workflow files; restore the template to `.github/workflows/ci.yml` after granting workflow permission. Recommended repository settings:

1. Require PR for `main`, at least one approval, conversation resolution and up-to-date branch.
2. Require `QAVLIO CI / quality` status.
3. Block force-push/deletion of `main`; use CODEOWNERS for auth/payments/admin/security when teams exist.
4. Enable secret scanning/push protection, Dependabot security updates and code scanning as available.
5. Keep production environments protected with required reviewers and environment-scoped secrets.
6. Use issue labels by domain (`frontend`, `backend`, `security`, `a11y`, `payments`, `trust`, `docs`) and milestone by phase.

## 10.7 CI/CD path

CI checks install from lockfile, lint, test and build. Add API contract/security and browser E2E jobs as those suites arrive. Deployment flow should be staging → smoke checks → approval → production, with immutable build artifacts and rollback.

Early low-cost hosting options:

- Static Vite bundle on Cloudflare Pages, Netlify or Vercel.
- Express API/worker on Render, Railway, Fly.io, or comparable Node host (verify current free-tier terms before choosing).
- MongoDB Atlas shared tier; managed object storage/CDN for images.

Do not rely on ephemeral API filesystem uploads in production. Serve browser API requests through same-site routing/reverse proxy where possible. Add Redis only when distributed sessions/queues/rate limits/realtime scaling require it.

## 10.8 Release checklist

- Scope and acceptance criteria linked.
- `npm run check` passes on clean install.
- No untracked secret/generated artifact; dependency audit reviewed.
- Database/index/config migration is idempotent with rollback/forward plan.
- Desktop/mobile/accessibility and browser smoke tests recorded.
- API contract, error/loading/empty states and observability added.
- Authorization matrix and abuse cases tested.
- Feature flag/config defaults safe; ads/AI/analytics fail open to core browsing.
- Documentation and intentional deferrals updated.

## 10.9 Troubleshooting

- **Frontend cannot call API:** use relative `/api/v1`; ensure API runs on port 5000 and Vite proxy is active.
- **API says disconnected:** set `MONGODB_URI`; public Phase 1 preview still works without it.
- **CORS failure:** add the exact browser origin to `CLIENT_ORIGINS`; do not use `*` with credentials.
- **Port occupied:** stop the process or override API `PORT`; update Vite proxy if changed.
- **Preview host issue:** both dev servers bind `0.0.0.0`; Vite handles arbitrary preview host and proxies API calls.
