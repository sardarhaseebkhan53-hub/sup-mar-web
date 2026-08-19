# 13. Administrator authentication

QAVLIO has **two independent authentication contexts**. They share the same secure token
infrastructure but never share a login screen, a session, or a redirect target.

```text
                     QAVLIO
                       |
             ┌─────────┴─────────┐
             │                   │
        MARKETPLACE            ADMIN
             │                   │
          /login             /admin/login
          /register                │
             │                     │
        User Auth              Admin Auth
             │                     │
       User Dashboard       /admin/dashboard
```

## 13.1 Routing rules

| Route | Behaviour |
|---|---|
| `/login`, `/register` | Marketplace customers and sellers. Unchanged. |
| `/admin` | Redirects to `/admin/dashboard` when an admin session exists, otherwise to `/admin/login`. |
| `/admin/login` | Administrator sign-in: username + password only. |
| `/admin/*` | Guarded by `AdminRoute`. Logged out ⇒ `/admin/login?returnTo=<path>`. |

`/admin` never redirects to the marketplace `/login`, so the previous
`/admin → /login?returnTo=%2Fadmin` loop cannot occur. `ProtectedRoute` (marketplace) and
`AdminRoute` (admin) read different session states and therefore cannot disagree.

After a successful admin login the browser is sent to `returnTo` when it is a same-origin
`/admin/...` path, otherwise to `/admin/dashboard`.

## 13.2 API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/admin/auth/login` | `{ username, password, remember? }` ⇒ admin identity + access token |
| POST | `/api/v1/admin/auth/refresh` | Rotates the admin session from the HttpOnly cookie |
| POST | `/api/v1/admin/auth/logout` | Revokes the admin session and clears the cookie |
| GET | `/api/v1/admin/auth/me` | Current administrator, resolved permissions, live OTP status |

The frontend never validates administrator credentials. There is no admin password, hash,
JWT secret, OTP pepper or provider secret in the browser bundle; the backend verifies the
bcrypt hash and issues the session.

Errors are explicit: `INVALID_ADMIN_CREDENTIALS` (401), `NOT_AN_ADMINISTRATOR` (403),
`ADMIN_ACCOUNT_RESTRICTED` (403), `ADMIN_LOGIN_LOCKED` (423).

## 13.3 Sessions

- Login returns a short-lived access token (kept in memory by the Admin Panel) and sets
  `qavlio_admin_refresh`: **HttpOnly**, `SameSite=Lax`, `Secure` in production, scoped to
  `Path=/api/v1/admin/auth`.
- Sessions carry a `context` of `user` or `admin`. Marketplace `/auth/refresh` rejects admin
  sessions (`SESSION_CONTEXT_MISMATCH`) and `/admin/auth/refresh` rejects marketplace ones.
- Refresh tokens rotate on every use, with reuse detection revoking the whole family.
- Access tokens include a `ctx` claim so the API can tell the two contexts apart.

## 13.4 Authorization

Every `/admin` API route runs `authenticateAdmin` (authentication **plus** an administrator
role check) before the existing per-permission checks:

```text
authenticated === true  AND  role ∈ { admin, super_admin, moderator, support, finance }
```

A marketplace customer or seller receives `403 ADMIN_FORBIDDEN` on every admin endpoint,
including `/admin/auth/me`, and is redirected to `/admin/login` in the UI.

## 13.5 Administrator bootstrap

`ensureAdminAccount()` runs once at API startup and is idempotent:

```text
Admin exists?
 ├── YES → do nothing
 └── NO  → create the administrator with a bcrypt-hashed password
```

It is driven by backend environment variables, which are never exposed to the frontend:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ChangeThisAdminPassword123!
ADMIN_NAME=QAVLIO Administrator
ADMIN_EMAIL=
```

Outside production the development defaults above apply automatically. In production the
seed only runs when both `ADMIN_USERNAME` and `ADMIN_PASSWORD` are set explicitly, the
password must satisfy the password policy, and it must be rotated after first sign-in.
`npm run create-admin --workspace backend` performs the same bootstrap on demand.

## 13.6 OTP policy

Administrator sign-in requires username and password only — never phone, SMS or OTP — and
`/admin/login` never calls the OTP endpoints.

The OTP policy for **marketplace** authentication is admin-managed at
`/admin/authentication` and stored server-side (`AuthenticationSettings`, bootstrapped from
`OTP_ENABLED`, `OTP_REQUIRED_FOR_*`). The panel shows `OTP Verification · OFF · Disabled`
while it is off. Enforcement lives in the backend (`authSettingsService.isOtpRequired`), so
toggling it in the panel changes marketplace login, signup and password-reset behaviour
immediately, in both directions.
