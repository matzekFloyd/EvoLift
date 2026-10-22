# Security Policy

## Supported Versions

EvoLift is in active development. Security fixes are applied to the latest code on the default branch.

## Reporting a Vulnerability

Please do **not** open a public GitHub issue for security vulnerabilities.

**Private contact:** use [GitHub private vulnerability reporting](https://github.com/matzekFloyd/EvoLift/security/advisories/new) so the report stays confidential. If that form is unavailable, message the repository owner on GitHub privately — still not via public issues or discussions.

Include:

- Clear reproduction steps
- Impact and affected components (web, `/api`, MCP, Android shell, etc.)
- Logs, screenshots, or a proof of concept when useful

### Response expectations

- Initial acknowledgement target: within **5 business days**
- Confirmed issues are triaged by severity and exploitability
- When a fix is released, disclosure details may be shared publicly after users have time to update

## Scope

### In scope

| Surface | What it is |
| --- | --- |
| **Next.js web app** | UI on Vercel (`evo-lift/`), including login, account, and workout flows |
| **REST `/api/*`** | Authenticated HTTP API (session JWT or personal token); OpenAPI at `/api/openapi` |
| **Personal API tokens** | `evo_…` tokens from Account → Login; used by API clients and MCP |
| **MCP bridge** | Hosted Streamable HTTP at `/api/mcp`; laptop stdio proxy under `mcp/evo-api` (HTTP API only, no direct Supabase) |
| **Android shell** | Capacitor WebView (`android/`, `shell/`) that loads the production site (or a debug URL) |

Also in scope: Supabase Auth configuration that this repo documents (password policy, Site URL / redirect allowlists), RLS policies in migrations, and CI supply-chain gates described below.

### Out of scope (for reports aimed at us)

- Third-party platforms themselves (Vercel, Supabase, Google Play) except misconfiguration **we** control
- Social-engineering of individual user accounts without a product defect
- Theoretical issues with no realistic path on the surfaces above
- Full pen-test write-ups as a substitute for a concrete, reproducible finding (summaries with repro are welcome)

Living STRIDE model (DFD + threat table + re-review checklist): [`docs/threat-model.md`](docs/threat-model.md) ([#266](https://github.com/matzekFloyd/EvoLift/issues/266)). This file remains the reporter/maintainer map and control deep-dive, not that model.

## Key controls

Short map of what is already enforced. Details in the sections below.

| Control | Summary |
| --- | --- |
| **Supabase RLS** | Session JWT path uses the user client; Postgres RLS scopes rows to the signed-in user |
| **Personal tokens** | Stored as **SHA-256** hashes (`evo-lift/server/db/api-tokens.ts`); plaintext shown once. Token path uses the **service-role** client, so **RLS is bypassed** — every user-owned read/write must filter by `userId` / `requireOwned*` ([API authentication](#api-authentication-jwt-vs-personal-token)) |
| **UI session gate** | `proxy.ts` + `getUser()` redirects anonymous browsers away from private pages ([App session gate](#app-session-gate-ui-shell)) |
| **Auth UX** | Password strength aligned with local/hosted Auth; user-visible auth errors sanitized ([Authentication](#authentication-password-policy-redirects-mfa)) |
| **HTTP headers / CSP** | Set in `evo-lift/lib/security-headers.ts` ([HTTP security headers](#http-security-headers)) |
| **Secrets** | Service role and Play keystore never ship to the client or git ([Secrets and environment](#secrets-and-environment)) |
| **Supply chain** | Dependabot + CI `npm audit` for high/critical production advisories |
| **CI/CD** | Hash-pinned Actions, least-privilege workflow tokens, `master` ruleset ([CI/CD trust boundaries](#cicd-trust-boundaries)) |
| **Security events** | Structured `channel":"security"` logs (no passwords or raw tokens) |
| **Rate limits** | App budgets on `/api` + MCP; Auth login/signup via Supabase ([Rate limiting](#rate-limiting)) |
| **MCP bridge** | Own trust boundary: bearer-scoped tools, fail-closed `/api` paths, rate limits ([MCP bridge](#mcp-bridge)) |

## Rate limiting

### App-enforced (best-effort)

In-memory sliding windows in `evo-lift/server/rate-limit.ts` (per serverless isolate — not a global cluster quota). Exceeded calls get **429** with `Retry-After` and the message “Too many requests. Wait a minute, then try again.”

| Surface | Key | Budget (per 60s) |
| --- | --- | --- |
| Authenticated `/api/*` via `handleApi` | Session user id | 180 |
| Same, personal token (`evo_…`) | User id | 90 |
| Same | Client IP (`x-forwarded-for`) | 240 |
| `/api/mcp` | User id (or IP if unauthenticated) | 60 |
| `/api/security/events` | Client IP | 30 |

Normal gym logging (web/Android) stays well under these budgets. Automation and MCP share the token/MCP rows and can hit 429 if scripted aggressively.

### Provider-enforced (Auth)

Browser login, signup, email confirmation, and Google or Apple sign-in go to **Supabase Auth**, not our `/api` handlers. Limits live in `supabase/config.toml` under `[auth.rate_limit]` (and the hosted Auth dashboard), including:

- `sign_in_sign_ups` — email and OAuth sign-in / sign-up attempts per IP (5-minute window)
- `email_sent` / `max_frequency` — confirmation and recovery email volume
- `token_refresh` — session refresh per IP

User-visible Auth rate-limit errors are sanitized in `friendly-auth-error.ts`. Confirm hosted project Auth rate limits match local intent after dashboard changes.

### Not covered here

Edge / CDN DDoS scrubbing (Vercel platform). CAPTCHA on login only if abuse warrants it later.

## Secrets and environment

### Must never ship client-side or to git

| Secret | Notes |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Bypasses RLS. Never prefix with `NEXT_PUBLIC_`. |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` | Google OAuth client secret. Local only via env. Hosted value stays in the Supabase dashboard. |
| `SUPABASE_AUTH_EXTERNAL_APPLE_SECRET` | Apple client secret (a short-lived JWT). Do not commit. |
| Play upload keystore (`*.jks`, `*.keystore`) | Gitignored. Play App Signing holds the app signing key. |
| `android/keystore.properties` | Keystore passwords; gitignored. Copy from the `.example` file locally. |
| `.env.local` | Local secrets; gitignored. |
| Personal API token plaintext (`evo_…`) | Shown once at creation; revoke on Account if leaked. |

### Safe to expose in the browser (`NEXT_PUBLIC_*`)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon key is public by design; RLS still applies for end users)
- `NEXT_PUBLIC_APP_URL` (canonical origin for auth email redirects in production)

`NEXT_PUBLIC_*` values are embedded at **build** time — redeploy after changing them. Optional perf sampling flags are documented in `evo-lift/README.md`.

Rotate any leaked key or token immediately.

## API authentication (JWT vs personal token)

Authenticated `/api/*` routes accept either:

1. **Session access token (JWT)** — Supabase user client. Row Level Security (RLS) applies.
2. **Personal API token (`evo_…`)** — resolved with the **service-role** client. RLS is **bypassed**.

For personal tokens, every user-owned read or write must filter by the authenticated `userId` (or use ownership helpers in `evo-lift/server/db/owned.ts`). A missing `user_id` filter is an IDOR risk unique to the token path.

`ApiRequestAuth.bypassesRls` is `true` for personal tokens and `false` for session JWTs. Prefer `requireOwned*` helpers over ad-hoc selects when loading a resource by id.

## MCP bridge

MCP is a **separate trust boundary** from the HTML app: tool calls can read/write the same data as the REST API for whoever holds the bearer token. It is not an LLM product — only an HTTP/MCP tool bridge ([#265](https://github.com/matzekFloyd/EvoLift/issues/265)).

### Surfaces

| Surface | What it is |
| --- | --- |
| **Hosted** | `GET/POST/DELETE https://<deployment>/api/mcp` — Streamable HTTP MCP (Cursor Cloud Agents). Implementation: `evo-lift/app/api/mcp/route.ts`. |
| **Laptop stdio** | `mcp/evo-api` — local process that proxies the HTTP API (`local` or `prod` base URL). No service-role key; no direct Supabase. |

### Threat notes (short)

| Question | Answer |
| --- | --- |
| **Who can call it?** | Anyone who can present a valid **Bearer** credential to `/api/mcp` (or who runs the stdio proxy with a token in env). Unauthenticated requests fail `withMcpAuth` (`required: true`). |
| **What tokens?** | Same resolver as `/api/*`: personal API token (`evo_…`, service-role client / RLS bypassed) or session access JWT (user client / RLS). Cloud Agents should use a personal token. |
| **What can tools reach?** | Only **this deployment’s** `/api/*` (hosted always uses the deployment origin). Tools: `get_targets`, `get_openapi`, `list_exercises`, `evo_api_get`, `evo_api_request`. No arbitrary hosts, no Supabase Admin API, no filesystem. |
| **Spoofing** | Identity is the bearer token only. A stolen `evo_…` token is full API access for that user (including MCP). |
| **Elevation of privilege** | Tools never take a target `userId`. Every proxied call reuses the caller’s Bearer token (or `auth.client` for `list_exercises`). There is no cross-user tool. Authorization stays in `/api/*` + RLS / `requireOwned*`. |
| **Information disclosure** | Path allowlist is fail-closed (see below). OpenAPI and public catalog routes remain reachable with a valid token like the REST API. |

### Path allowlist (fail-closed)

Shared rules live in `evo-lift/server/mcp/api-path.ts` (stdio mirrors the same checks). Rejected inputs include:

- Paths that do not start with `/api/`
- `..`, `://`, `\`, null bytes, `//`, and percent-encoded `..` variants
- Recursive `/api/mcp` (and `/api/mcp/…`) to avoid tool→MCP amplification
- Resolved URLs whose **origin** is not the configured deployment / `EVO_API_*` base

Regression tests: `evo-lift/server/mcp/api-path.test.ts`.

### Rate / abuse limits

Hosted MCP uses the budgets from [#263](https://github.com/matzekFloyd/EvoLift/issues/263) / [Rate limiting](#rate-limiting): **60**/minute per authenticated user id, and the same budget per IP when the bearer is missing/invalid (before auth failure). Proxied `/api/*` calls also consume the normal `handleApi` limits. Stdio has no local rate limiter — the hosted API enforces limits when `target=prod`.

Treat a leaked personal token as full API access for that user (including MCP). Revoke on Account → Login.

## Android shell

The Capacitor shell is a **WebView** around the web app, not a separate backend.

- Release builds load the production site; navigation is limited to that origin and its Supabase host. Other hosts open in the system browser.
- Debug builds may point at a local/dev URL (`CAPACITOR_SERVER_URL` / allowlist). Cleartext HTTP is only enabled when the configured server URL is `http://`.
- Session cookies live in the WebView (same cookie-based auth as the browser client after the session-gate work).

Upload keystore handling: see [Secrets and environment](#secrets-and-environment).

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

Swagger UI on `/app/docs` loads from `swagger-ui-dist` (bundled), not a CDN. Geist fonts use `next/font` (self-hosted).

## Dependency updates (npm / Actions)

Dependabot (`.github/dependabot.yml`) opens weekly PRs for:

- npm lockfiles at `/`, `/evo-lift`, and `/mcp/evo-api`
- GitHub Actions at the repo root

### Reviewing Dependabot PRs

1. Confirm CI is green (tests, npm audit, CodeQL as applicable).
2. Skim the release notes for breaking changes; prefer grouped minor/patch bumps when Dependabot groups them.
3. Merge when the bump is intentional; close or ignore only with a short reason (e.g. known break, superseded PR).
4. Do not merge Dependabot PRs that skip or weaken the npm audit gate without an allowlist entry (below).

Android/Play keystore and secret handling remain covered under [Secrets and environment](#secrets-and-environment); this section is npm/JS supply chain only.

## CI/CD trust boundaries

Hardens the path workstation → git → Actions → artifacts / deploy against **Tampering** and **Elevation of Privilege** (STRIDE on CI/CD). Complements Dependabot / npm audit above ([#264](https://github.com/matzekFloyd/EvoLift/issues/264)).

### GitHub Actions workflows

| Control | Practice |
| --- | --- |
| **Action pins** | Third-party and first-party Actions are **commit-SHA pinned** in `.github/workflows/*` (with a `# vN` comment). The repository setting **Require actions to be pinned to a full-length commit SHA** is on. Dependabot’s `github-actions` ecosystem opens PRs when pins should move. |
| **Token permissions** | Every workflow sets explicit `permissions:`. Default is `contents: read`. **Release** is the only write path (`contents: write` to publish `vMAJOR.MINOR.PATCH`). CodeQL denies all at the workflow level and elevates only `security-events` / read scopes on the analyze job. |
| **Repo default** | Repository Actions setting **Workflow permissions** is **Read repository contents and packages permissions** (not read/write). Workflows that need write declare it explicitly. |
| **No untrusted write paths** | No `pull_request_target` or `workflow_run` workflows. Jobs do not read repository secrets on pull requests from forks (and current workflows use no repository secrets at all — only `github.token` where needed). |

### Branch protection (`master`)

Default branch protection is a **repository ruleset** named `master` (Settings → Rules → Rulesets), not classic branch protection.

| Rule | Intent |
| --- | --- |
| Block deletions | Default branch cannot be deleted |
| Block force pushes (`non_fast_forward`) | No history rewrite on `master` |
| Require a pull request | Direct pushes to `master` are blocked; changes go through PR |
| Required checks | **npm test**, **API integration**, **Production dependency advisories** must pass before merge |
| Require branch up to date | Status checks use the latest `master` tip (`strict` policy) |

**Who can bypass:** the ruleset has **no bypass actors**. Maintainers (including the repository owner) should not bypass required checks or force-push; fix failures and merge normally. If an emergency bypass is ever added in the GitHub UI, document the actor and reason here the same day.

Classic “Branch protection rules” for `master` may show as inactive; the ruleset is the source of truth.

### Secrets in CI and deploy

| Surface | Handling |
| --- | --- |
| **GitHub Actions** | Workflows do not hold `SUPABASE_SERVICE_ROLE_KEY`, Play keystores, or Vercel tokens. Local Supabase keys used in Test / Lighthouse jobs are generated on the runner by `supabase start` and never stored as repo secrets. |
| **Play / Android upload** | Keystore and `keystore.properties` stay on the maintainer machine (gitignored). CI does not upload to Play; see [Secrets and environment](#secrets-and-environment). |
| **Fork PRs** | GitHub does not expose repository secrets to workflows from forks on `pull_request`. Do not add `pull_request_target` that checks out untrusted code with secrets. |
| **Production deploy** | Vercel deploys via the **Vercel ↔ GitHub** integration (GitHub App), not long-lived deploy keys in this repo’s Actions. OIDC-to-cloud from Actions is **not** used today; revisit only if deploy moves into a workflow that needs cloud credentials. |

### Related workflows (reference)

| Workflow | When it runs | Role |
| --- | --- | --- |
| `test.yml` | **PR only** (required) | Unit/typecheck + API integration |
| `npm-audit.yml` | **PR only** (required) | High/critical production advisories |
| `codeql.yml` | **`master` push + weekly schedule** | Code scanning; not a merge gate |
| `release.yml` | **`master` push** when `app-version.json` changes | GitHub Release |
| `production-smoke.yml` | **`master` push** (+ manual dispatch) | Public production URL checks |
| `lighthouse.yml` | **`master` push** | Perf budgets; heavy local build |

PR gates stay on `pull_request` only so a merge does not re-run the same checks on the `push` to `master`. Post-merge signal is smoke + Lighthouse (+ CodeQL / Release when relevant).

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
| Site URL | `https://evolift.at` (not localhost) |
| Redirect URLs | `https://evolift.at/**`, `https://www.evolift.at/**`, `https://evo-lift.vercel.app/**`, local `http://localhost:3000/**` and `http://127.0.0.1:3000/**` |

Keep Site URL, Redirect URLs, `NEXT_PUBLIC_APP_URL`, and `PUBLIC_APP_ORIGIN` on `https://evolift.at`. DNS for that host is in the root `README.md` (Production domain). `www.evolift.at` and `evo-lift.vercel.app` redirect to the apex.

### Google and Apple sign-in

Email and password stay available. Magic link is not offered.

`/login` starts `signInWithOAuth` for Google or Apple and returns to `/auth/callback` (`authOAuthRedirectUrl` in `evo-lift/lib/auth-email-redirect.ts`). That callback exchanges the code for the cookie session and redirects to `/app`. Provider error text is not shown. The panel uses `friendlyOAuthError` and three fixed notices: cancelled, email already registered, or a generic failure.

Supabase Auth links a **verified** provider email to the existing user automatically. There is no switch to turn that off. Manual linking stays off (`enable_manual_linking = false`): this release has no screen to attach a second email. Production should keep **Confirm email** on, so an unconfirmed password signup cannot take over an address that later signs in with Google or Apple. Local `enable_confirmations = false` autoconfirms email and is not the production setting.

Account actions:

| Action | Password required? |
| --- | --- |
| Use the app, create or revoke API tokens | No. The signed-in session is enough, including Google or Apple. |
| Set the first password (Account → Login) | No, until a password exists. The Account screen and `PATCH /api/account/password` both allow this when the user has no email identity. |
| Change password, or `PATCH /api/account/email` | Yes. Current password. |
| Delete the account | Yes, when the account has a password. Google/Apple-only accounts confirm on Account without a password. The API skips the check only when `has_password` is false. |

OAuth failures stay in Supabase Auth logs. The app does not add a new security-event type for them. Password login failures still emit `login_failed`.

Hosted setup (dashboard, not this repo): enable the Google and Apple providers, and allow `https://evolift.at/auth/callback` via the existing `https://evolift.at/**` redirect entry. Provider console redirect URI is the Supabase callback `https://<project-ref>.supabase.co/auth/v1/callback`, not the app URL. Steps are in `evo-lift/README.md`.

### MFA decision

**Deferred.** MFA (TOTP / WebAuthn) is not enabled (`[auth.mfa.totp]` enroll/verify remain false locally). Product intent is to add it later; track in GitHub issue [#297](https://github.com/matzekFloyd/EvoLift/issues/297). Do not treat missing MFA as an accidental omission—it is an explicit near-term out-of-scope choice.

## App session gate (UI shell)

Next.js **`proxy.ts`** (Next 16; formerly middleware) runs `lib/supabase/update-session.ts` on matched requests:

1. Refreshes the Supabase auth cookie via `@supabase/ssr`.
2. Calls **`auth.getUser()`** (not cookie-only `getSession()`) to verify the user.
3. Redirects anonymous browsers to `/login` for protected app routes.
4. Redirects signed-in users away from `/login` to `/`, except `/login?recovery=1` (password-recovery callback stays open so the lifter can set a new password).

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

## Related hardening work

OWASP Top 10:2025 / STRIDE tracking: [#254](https://github.com/matzekFloyd/EvoLift/issues/254).

| Topic | Issue | Status |
| --- | --- | --- |
| HTTP headers / CSP | [#255](https://github.com/matzekFloyd/EvoLift/issues/255) | Done |
| Personal-token access control | [#256](https://github.com/matzekFloyd/EvoLift/issues/256) | Done |
| Session gate / `getUser` | [#257](https://github.com/matzekFloyd/EvoLift/issues/257) | Done |
| API error disclosure | [#258](https://github.com/matzekFloyd/EvoLift/issues/258) | Done |
| Security event logging | [#259](https://github.com/matzekFloyd/EvoLift/issues/259) | Done |
| Dependabot / npm audit | [#260](https://github.com/matzekFloyd/EvoLift/issues/260) | Done |
| Auth password policy / MFA decision | [#261](https://github.com/matzekFloyd/EvoLift/issues/261) | Done (MFA deferred → [#297](https://github.com/matzekFloyd/EvoLift/issues/297)) |
| This guide (`SECURITY.md`) | [#262](https://github.com/matzekFloyd/EvoLift/issues/262) | This file |
| Rate limiting / DoS | [#263](https://github.com/matzekFloyd/EvoLift/issues/263) | Done (app budgets + Auth docs; not global CDN) |
| CI/CD trust boundaries | [#264](https://github.com/matzekFloyd/EvoLift/issues/264) | Done (SHA-pinned Actions, least-privilege tokens, `master` ruleset documented) |
| MCP bridge hardening | [#265](https://github.com/matzekFloyd/EvoLift/issues/265) | Done (threat notes, path allowlist + tests, rate-limit docs) |
| Living STRIDE model | [#266](https://github.com/matzekFloyd/EvoLift/issues/266) | Done ([`docs/threat-model.md`](docs/threat-model.md)) |
| MFA (product) | [#297](https://github.com/matzekFloyd/EvoLift/issues/297) | Deferred |

## References

- [OWASP Top 10:2025](https://top10.owasp.org/2025/)
- [STRIDE overview](https://www.practical-devsecops.com/what-is-stride-threat-model/)
- [EvoLift STRIDE threat model](docs/threat-model.md)
