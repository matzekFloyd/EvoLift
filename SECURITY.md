# Security Policy

## Secrets

Do not commit the Play upload keystore (`*.jks`, `*.keystore`) or `android/keystore.properties`. Those files hold the upload key and its passwords. Play App Signing keeps the app signing key with Google.

## Supported Versions

EvoLift is in active development. Security fixes are applied to the latest code on the default branch.

## Reporting a Vulnerability

Please do not open a public issue for security vulnerabilities.

- Report security concerns privately to the maintainer.
- Include clear reproduction steps, impact, and affected components.
- If applicable, include logs, screenshots, and a proof of concept.

## Response Expectations

- Initial acknowledgement target: within 5 business days.
- Confirmed issues are triaged and prioritized based on severity and exploitability.
- When a fix is released, disclosure details may be shared publicly after users have time to update.

## API authentication (JWT vs personal token)

Authenticated `/api/*` routes accept either:

1. **Session access token (JWT)** — Supabase user client. Row Level Security (RLS) applies.
2. **Personal API token (`evo_…`)** — resolved with the **service-role** client. RLS is **bypassed**.

For personal tokens, every user-owned read or write must filter by the authenticated `userId` (or use ownership helpers in `evo-lift/server/db/owned.ts`). A missing `user_id` filter is an IDOR risk unique to the token path.

`ApiRequestAuth.bypassesRls` is `true` for personal tokens and `false` for session JWTs. Prefer `requireOwned*` helpers over ad-hoc selects when loading a resource by id.

## HTTP security headers

The Next app sets security headers in `evo-lift/next.config.ts` via `evo-lift/lib/security-headers.ts`:

| Header | Intent |
| --- | --- |
| `Content-Security-Policy` | Default self; Supabase `connect-src`; no framing; Swagger/`next/font` stay self-hosted |
| `Strict-Transport-Security` | HTTPS only on Vercel production |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` (with CSP `frame-ancestors 'none'`) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Disables camera, microphone, geolocation, payment |

### CSP allowlists

- **connect-src:** `'self'`, `https://*.supabase.co`, `wss://*.supabase.co`
- **Local Supabase** (`http(s)://127.0.0.1:54321` / `localhost:54321` and matching `ws:`) is included outside Vercel production so `supabase start` works
- **script-src / style-src:** `'unsafe-inline'` (and script `'unsafe-eval'`) remain for Next.js and Swagger UI until nonce-based CSP is wired

Swagger UI on `/docs` loads from `swagger-ui-dist` (bundled), not a CDN. Geist fonts use `next/font` (self-hosted).

## Dependency updates (npm / Actions)

Dependabot (`.github/dependabot.yml`) opens weekly PRs for:

- npm lockfiles at `/`, `/evo-lift`, and `/mcp/evo-api`
- GitHub Actions at the repo root

### Reviewing Dependabot PRs

1. Confirm CI is green (tests, npm audit, CodeQL as applicable).
2. Skim the release notes for breaking changes; prefer grouped minor/patch bumps when Dependabot groups them.
3. Merge when the bump is intentional; close or ignore only with a short reason (e.g. known break, superseded PR).
4. Do not merge Dependabot PRs that skip or weaken the npm audit gate without an allowlist entry (below).

Android/Play keystore and secret handling remain covered under [Secrets](#secrets); this section is npm/JS supply chain only.

## Dependency advisories (npm audit)

CI workflow **npm audit** (`.github/workflows/npm-audit.yml`) runs `scripts/npm-audit-ci.mjs` on every push/PR to `master`.

| Policy | Detail |
| --- | --- |
| Scope | Production dependencies only (`npm audit --omit=dev`) |
| Fail | **high** and **critical** advisories |
| Warn / defer | low/moderate, and **devDependency** advisories (still updated via Dependabot; fix when practical) |

### Temporary allowlist

If a high/critical production advisory cannot be fixed immediately (no patched release, or a forced upgrade is unsafe):

1. Add the advisory id (`GHSA-…`) to `.github/npm-audit-allowlist.json` under `advisories`.
2. Document it in the table below: id, package, reason, and a review-by date.
3. Remove the entry when the dependency is upgraded or the advisory is withdrawn.

| Advisory | Package | Reason | Review by |
| --- | --- | --- | --- |
| _(none)_ | | | |

## Authentication (password policy, redirects, MFA)

### Password policy

In-app rules live in `evo-lift/lib/password-policy.ts` (register and password change):

- Minimum **8** characters
- At least **one letter** and **one number**

Local Auth mirrors that in `supabase/config.toml`:

- `minimum_password_length = 8`
- `password_requirements = "letters_digits"`

**Hosted Supabase (ops):** Authentication → Providers → Email → password strength must match (min length 8, require letters and digits). After changing `config.toml`, restart local Supabase (`supabase stop` then `supabase start`).

Login does **not** re-check strength so existing accounts can still sign in; Auth still verifies the password.

User-visible auth failures go through `evo-lift/lib/friendly-auth-error.ts` (login, register, account email/password updates, and account API paths). Raw Supabase/GoTrue strings are not shown.

### Site URL and redirect allowlists

Production confirm / email-change links use `NEXT_PUBLIC_APP_URL` via `evo-lift/lib/auth-email-redirect.ts` (path `/login?verified=1`). Locally, omit that env var so the browser origin is used.

**Hosted checklist** (Authentication → URL Configuration) — see also `evo-lift/README.md`:

| Setting | Expected |
| --- | --- |
| Site URL | Canonical production origin (e.g. `https://evo-lift.vercel.app`; not localhost) |
| Redirect URLs | Production `/**`, local `http://localhost:3000/**` and `http://127.0.0.1:3000/**`, plus future custom domain / preview wildcards as needed |

When the public host moves (e.g. to `evolift.at`), update Site URL, Redirect URLs, `NEXT_PUBLIC_APP_URL`, and `PUBLIC_APP_ORIGIN` together.

### MFA decision

**Deferred.** MFA (TOTP / WebAuthn) is not enabled (`[auth.mfa.totp]` enroll/verify remain false locally). Product intent is to add it later; track in GitHub issue #297. Do not treat missing MFA as an accidental omission—it is an explicit near-term out-of-scope choice.

## App session gate (UI shell)

Next.js **`proxy.ts`** (Next 16; formerly middleware) runs `lib/supabase/update-session.ts` on matched requests:

1. Refreshes the Supabase auth cookie via `@supabase/ssr`.
2. Calls **`auth.getUser()`** (not cookie-only `getSession()`) to verify the user.
3. Redirects anonymous browsers to `/login` for protected app routes.
4. Redirects signed-in users away from `/login` to `/`.

**Public without a session cookie:** `/login`, `/privacy`, `/terms`, `/glossary`, and all `/api/*` paths.

`/api/*` is intentionally not redirected: API auth stays bearer JWT / personal token + RLS (or ownership helpers). The proxy is defense-in-depth for the HTML shell only.

The browser client (`lib/supabase/browser.ts`) uses **cookie** session storage so the proxy can see the session. After deploy, users who only had a localStorage session may need to **log in once** again.

Client pages use `getBrowserUser` / `getBrowserAuthSession` (`lib/supabase/browser-auth.ts`) so identity checks prefer `getUser()`.

## Security event logging

Server routes and a small client reporter emit **one JSON object per line** on stdout with `"channel":"security"`. On Vercel, open the deployment **Logs** and filter for `channel":"security"` (or the event `type`).

| `type` | When |
| --- | --- |
| `api_auth_failed` | `/api/*` request failed bearer auth (401) |
| `login_failed` | Browser password login failed (email fingerprint + domain only) |
| `token_created` / `token_revoked` | Personal API token create or revoke |
| `password_changed` | Password update succeeded |
| `email_change_requested` | Email change requested (confirmation still required) |
| `password_verify_failed` | Current-password check failed for a sensitive action |
| `account_deleted` | Account deletion succeeded |

### What is never logged

Passwords, full session JWTs, personal API token secrets (`evo_…`), or request bodies that carry credentials.

Login failures store a short **email fingerprint** (truncated SHA-256 of the normalized address) and the **email domain**, not the raw address.

### Retention

Retention follows the host log product (Vercel log retention for the project plan). There is no separate long-term SIEM store in-app.

### Alerting (minimal / deferred)

Automated paging on auth-failure spikes is **not** wired yet. Until a log drain or platform alert exists:

1. In Vercel Logs, watch for bursts of `"type":"api_auth_failed"` or `"type":"login_failed"`.
2. Prefer enabling a **Vercel log drain** (or equivalent) to an alerting tool and alert on elevated counts of those types.

Document any chosen drain/alert target here when it is enabled.
