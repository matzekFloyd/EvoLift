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
