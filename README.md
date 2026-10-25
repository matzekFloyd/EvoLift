# EvoLift

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Test](https://github.com/matzekFloyd/EvoLift/actions/workflows/test.yml/badge.svg)](https://github.com/matzekFloyd/EvoLift/actions/workflows/test.yml) [![Lighthouse](https://github.com/matzekFloyd/EvoLift/actions/workflows/lighthouse.yml/badge.svg)](https://github.com/matzekFloyd/EvoLift/actions/workflows/lighthouse.yml)

EvoLift is a mobile-first workout logging application built with Next.js and Supabase.

It focuses on fast session creation, compact in-session logging, and practical defaults for recurring exercises so lifters can log training with minimal friction.

## Highlights

- Mobile-first workout flow from planning to set-by-set logging
- Email/password authentication via Supabase Auth
- Session tracking with planned vs completed views
- Per-exercise user defaults (target sets/reps/weight, base weight)
- Local draft persistence for new session creation
- Read-only mode for session details to prevent accidental edits
- OpenAPI endpoint for API contract visibility
- Supabase migration + seed workflow committed in-repo

## Tech Stack

- **Frontend/App:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS 4
- **Icons/UI:** lucide-react
- **Backend/Data:** Supabase (Postgres + Auth + RLS-aware querying)
- **Charting:** Recharts
- **Linting:** ESLint + `eslint-config-next`
- **Tests:** Vitest
- **Android:** Capacitor shell that opens the production site

## Repository Structure

This repository is organized as a root project with two main folders:

- `evo-lift/` - Next.js web application
- `supabase/` - Supabase local project config, migrations, and seed SQL
- `android/` - Capacitor Android shell that opens the site

Useful app paths:

- `evo-lift/app/` - App Router pages and API routes
- `evo-lift/app/sessions/new/` - New workout session flow
- `evo-lift/app/sessions/[id]/` - Session detail and set logging
- `evo-lift/app/account/` - Account + exercise defaults management
- `evo-lift/app/api/exercises/route.ts` - Authenticated exercise API endpoint
- `evo-lift/app/api/openapi/route.ts` - OpenAPI spec endpoint
- `evo-lift/server/db/` - Thin server-side data access layer
- `evo-lift/lib/supabase/` - Supabase browser/server clients

## Core Product Flows

### 1) Authentication

- Users can register and log in with email + password
- Post-login navigation redirects users to the main dashboard
- Unauthenticated access to protected pages redirects to `/login`

### 2) Session Planning and Creation

- Create sessions with:
  - `performed_on` date
  - Session notes
  - One or more exercise rows
  - Optional per-exercise targets (sets/reps/weight)
- Draft data is saved in local storage so in-progress work is not lost

### 3) Session Logging

- View each session with its ordered exercises and logged sets
- Add/edit/delete workout sets
- Mark warm-up sets
- Toggle session read-only mode for safety
- Update exercise-level targets within a session

### 4) Account Preferences

- Update email
- Update password (with re-auth flow)
- Save and clear per-exercise default values to prefill future planning

## Data Model (High Level)

The app is centered around the following entities in Supabase/Postgres:

- `workout_sessions`
- `workout_session_exercises`
- `workout_sets`
- `exercises`
- `exercise_translations` (currently `en` / `de`)
- `user_exercise_defaults`

Schema evolution lives in:

- `supabase/migrations/`

Seed data lives in:

- `supabase/seeds/001_exercises.sql`
- `supabase/seeds/002_exercise_translations.sql`
- `supabase/seeds/003_user_exercise_defaults_barbell_20kg.sql`

## Prerequisites

- Node.js 20+ recommended
- npm
- Docker Desktop (for local Supabase containers via the CLI)
- Supabase CLI (for local DB and migration workflow)

## Local Development

### Prerequisite: Docker

Local Supabase runs in Docker via the Supabase CLI. Install [Docker Desktop](https://docs.docker.com/desktop/) and keep it running before `supabase start`.

### 1) Install dependencies

From the app directory:

```bash
cd evo-lift
npm install
```

### 2) Start local Supabase (Docker)

From the **repository root** (the folder that contains `supabase/`):

```bash
supabase start
```

First time or after pulling new migrations, replay schema and seeds:

```bash
supabase db reset
```

Studio is at `http://127.0.0.1:54323`. Stop containers when finished: `supabase stop`.

### 3) Configure environment variables

Create `evo-lift/.env.local`.

**Local Docker (recommended)** — copy keys from the CLI (still from repo root):

```bash
supabase status -o env --override-name api.url=NEXT_PUBLIC_SUPABASE_URL
```

Use these values in `evo-lift/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY from the command above>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY from the command above>
```

**Hosted Supabase** — only if you intentionally point the app at a cloud project:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_APP_URL=https://evolift.at
```

Also set **Authentication → URL Configuration** on that hosted project: Site URL = the production app origin (not localhost), and Redirect URLs that allow that origin plus local `http://localhost:3000/**`. Details are in `evo-lift/README.md`.

Notes:

- `NEXT_PUBLIC_SUPABASE_URL` must be the base URL (not `/rest/v1`)
- `NEXT_PUBLIC_*` variables are embedded at build time
- `SUPABASE_SERVICE_ROLE_KEY` must remain server-side only
- Omit `NEXT_PUBLIC_APP_URL` for local Docker so confirm links use `http://localhost:3000`

### 4) Run the app

```bash
cd evo-lift
npm run dev
```

App runs at:

- `http://localhost:3000`

`npm run dev` creates a local demo user when Supabase is already running, the URL is localhost, and that user has no sessions yet:

- Email: `demo@example.com`
- Password: `demo1234`

The account gets the four starter plans from signup, none of them active, plus about 24 weeks of sessions (missed, deload, and heavy weeks), three templates (`Upper Power`, `Lower Strength`, `Push Focus`), a few template-started sessions, and one planned workout in March 2028 (targets only, no sets). That feeds Home, Insights, Plans, and Templates. It does not run against a hosted Supabase project. `npm run seed:local` runs the same step on its own. Re-running adds any missing templates or sessions without wiping existing history, and deletes the old local plans `3-Day Strength` and `Upper Lower` if they are still there.

### 5) Quality checks

```bash
cd evo-lift
npm run lint
npm test
npm run test:integration
npm run build
npm run lighthouse
```

`npm run test:integration` calls API route handlers against local Supabase (shared helpers in `evo-lift/tests/api/integration-helpers.ts`; files may run in parallel). Start Supabase with `supabase start` from the repository root first. The URL must be `127.0.0.1` or `localhost`. See [`evo-lift/tests/api/README.md`](evo-lift/tests/api/README.md) for coverage notes.

`npm run lighthouse` builds on a production `next start` server and fails if performance or public-page SEO scores drop below the thresholds in [`evo-lift/LIGHTHOUSE.md`](evo-lift/LIGHTHOUSE.md). Seed the local demo user first (`npm run seed:local`) so Home and Insights run logged in.

## Android app

The Android app is a Capacitor shell. It opens the existing site. Register, log in, and logging a set stay on those pages. The signed-in session stays in the WebView, so closing the app and opening it again keeps the user logged in. Product versions follow [VERSIONING.md](VERSIONING.md). The site footer shows the same version.

Back returns to the previous page opened in the app. On `/app`, Back leaves the app. While `/app/sessions/new` or a saved session at `/app/sessions/[id]` is open, the shell holds the screen awake. `/app/sessions` and `/app/sessions/[id]/edit` do not. Leaving that page, or sending the app to the background, lets the screen sleep on the system timeout again. The same pages in a browser still follow that timeout. A link whose host is not the configured site or its Supabase host opens in the system browser, and the app stays on the page that contained the link. The launcher name is EvoLift. The icon and splash use the EvoLift mark. The WebView is inset below the status bar and above the system gesture area, including a display cutout.

By default the shell loads `https://evolift.at/app`. The site origin stays `https://evolift.at`. It may also navigate to that site's Supabase host (`tiivtvejwxzgzgkmojuj.supabase.co`). A page on any other host does not load inside the shell. The phone opens that link in the system browser instead. The site in a browser is unchanged.

### Install a debug build

Install [Android Studio](https://developer.android.com/studio) and an Android SDK, then start an emulator or connect a phone with USB debugging. The shell's minimum Android version is API 23. The Gradle build needs JDK 21. Android Studio's bundled JDK can be newer than that. If the build reports `Unsupported class file major version`, install Temurin 21 and set `JAVA_HOME` to that JDK before the install command.

From the repository root:

```bash
npm install
npm run android
```

`npm run android` syncs the shell and installs a debug build. With no debug setting, that build opens production EvoLift.

### Point a debug build at a local dev server

The production URL stays the default. Set `CAPACITOR_SERVER_URL` for one install, then run the same command:

```bash
CAPACITOR_SERVER_URL=http://10.0.2.2:3000 npm run android
```

On PowerShell:

```powershell
$env:CAPACITOR_SERVER_URL = "http://10.0.2.2:3000"
npm run android
```

`10.0.2.2` is the emulator's address for this computer. A phone on the same network needs this computer's LAN address instead, and `npm run dev` in `evo-lift/` must be reachable there.

The shell already allows that host on any port, so local Supabase on the same host can load too. `127.0.0.1` from the phone or emulator is the device itself. For local login, set `NEXT_PUBLIC_SUPABASE_URL` in `evo-lift/.env.local` to the address the device can reach (for the emulator, `http://10.0.2.2:54321`) and restart the dev server.

To allow a different host, set `CAPACITOR_ALLOW_NAVIGATION` to a comma-separated host list. Or copy `shell/debug-server.example.json` to `shell/debug-server.json` (that copy is gitignored) and run `npm run android` with `CAPACITOR_SERVER_URL` unset. An environment URL wins over the file.

HTTP cleartext is turned on only when the configured server URL is `http://`. Run `npm run android` again with the variable unset to install a debug build that opens production.

`npm run android` rewrites `android/app/src/main/assets/capacitor.config.json`. That committed file must keep `https://evolift.at/app`. Sync again without a debug URL before committing.

### Ship a signed bundle to Play internal testing

Release builds are signed with an upload key that stays on this machine. Play App Signing holds the app signing key. The upload keystore and `android/keystore.properties` are gitignored.

Create the upload key once, with the same JDK 21 used for Gradle builds. From the repository root:

```bash
keytool -genkeypair -v -keystore android/upload-keystore.jks -storetype PKCS12 -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Copy `android/keystore.properties.example` to `android/keystore.properties`. Set `storeFile` to `upload-keystore.jks`, `keyAlias` to `upload`, and both passwords. Keep the passwords in a password manager.

Bump the product version when this upload should replace an earlier one ([VERSIONING.md](VERSIONING.md)), then build:

```bash
npm run android:bundle
```

That command ignores a debug server URL and writes `android/app/build/outputs/bundle/release/app-release.aab`. The bundle loads `https://evolift.at/app` on the `https://evolift.at` origin. Ship that bundle only after `evolift.at` verifies on Vercel (see [Production domain](#production-domain)).

In Play Console, use the app with package name `app.evolift`. Create the app first if it is not there yet. Enroll in Play App Signing and let Google manage the app signing key. The keystore above is only the upload key. Upload the `.aab` under **Test and release → Testing → Internal testing**. Add tester emails and install from the opt-in link. A tester should be able to log in and log a set.

The next upload needs a higher product version than the build already on that track. The public production track, store listing assets, the content rating, and the Data safety form are separate. `npm run android` still installs a debug build and does not need the upload key.

## Supabase Workflow

Use migrations for all schema changes instead of ad-hoc dashboard edits.

Grant every new table, view, and Data API or trigger function in `public` in that same migration. Tables keep `GRANT ALL` to `anon`, `authenticated`, and `service_role`, plus row-level security. Trigger functions get `EXECUTE` for the roles that write the table. A missing grant fails with `permission denied` before row-level security runs. Do not turn on `auto_expose_new_tables`.

### Create migration

```bash
supabase migration new <descriptive_name>
```

### Validate locally from clean state

```bash
supabase db reset
```

### Push unapplied migrations to linked project

```bash
supabase db push
```

### Run seed files on linked remote (when needed)

```bash
supabase db query --linked --file supabase/seeds/001_exercises.sql
supabase db query --linked --file supabase/seeds/002_exercise_translations.sql
supabase db query --linked --file supabase/seeds/003_user_exercise_defaults_barbell_20kg.sql
```

## API

### `GET /api/mcp`

Streamable HTTP MCP for Cursor Cloud Agents. Authenticate with `Authorization: Bearer <personal API token>`.

The MCP URL is `https://evolift.at/api/mcp`, not the site origin.

### `GET /api/exercises`

Returns exercises with translations.

- Requires bearer token in `Authorization` header: a **personal API token** from Account → Login (`evo_…`, does not expire until revoked) or a session JWT
- Optional query parameter: `lang` (`en` or `de`)

Example:

```bash
curl -H "Authorization: Bearer <personal_api_token_or_access_token>" \
  "http://localhost:3000/api/exercises?lang=en"
```

### `GET /api/openapi`

Returns OpenAPI 3.0 JSON for documented endpoints.

## Security Notes

Reporting, scope, and control map: [SECURITY.md](SECURITY.md).

- Never commit `.env.local`
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code
- Rotate credentials immediately if leaked
- Revoke leaked personal API tokens on Account → Login
- Prefer anon-key + user JWT (RLS-aware) for user-scoped server endpoints

## Deployment Notes

A pull request cannot merge to `master` until the Test workflow jobs `npm test` and `API integration` succeed. Vercel then deploys that commit to production (`https://evolift.at`). `https://evo-lift.vercel.app` redirects there.

Before that deploy:

1. Apply migrations (`supabase db push --linked`)
2. Apply production-safe seed files as needed
3. Ensure environment variables are set correctly in the hosting platform

After a push to `master` (including a merged pull request), the Production smoke workflow checks public surfaces on `https://evolift.at`: login (with Terms/Privacy links), privacy, terms, glossary, OpenAPI JSON (including key paths), and that protected API routes return 401 without auth. It retries briefly so a Vercel deploy can finish first. It does not sign in, create a session, or call the database. Unit tests and API integration tests stay on the pull request and use local Supabase. You can also run it manually with workflow_dispatch.

## Production domain

The canonical origin is `https://evolift.at`. `https://www.evolift.at` and `https://evo-lift.vercel.app` redirect there with HTTP 308. An Android shell already installed still opens `evo-lift.vercel.app`, then sends `evolift.at` to the system browser. The next Play upload loads `https://evolift.at` directly.

The domain is attached to the Vercel project `evo-lift`. DNS stays at world4you (`ns1.world4you.at` and `ns2.world4you.at`). Do not change those nameservers. Vercel issues the HTTPS certificate after the records below are in place.

In the world4you customer area, open the DNS zone for `evolift.at`. Remove the A records for `@` and `www` that point at `81.19.154.98`, then add:

| Type | Host | Value |
| --- | --- | --- |
| A | `@` | `216.198.79.1` |
| A | `@` | `64.29.17.1` |
| CNAME | `www` | `747d25b90ec2467c.vercel-dns-017.com` |

Leave no other A or CNAME record on `@` or `www`. From `evo-lift/`:

```bash
npx vercel domains verify evolift.at --project evo-lift
npx vercel domains verify www.evolift.at --project evo-lift
```

Both should report configured. HTTPS is ready when those checks pass.

Auth and email links use the same origin:

- Vercel Production `NEXT_PUBLIC_APP_URL` is `https://evolift.at`. It is applied on the next production deploy.
- Hosted Supabase, Authentication → URL Configuration: Site URL `https://evolift.at`. Redirect URLs include `https://evolift.at/**`, `https://www.evolift.at/**`, `https://evo-lift.vercel.app/**`, `http://localhost:3000/**`, and `http://127.0.0.1:3000/**`.

Auth mail uses the subdomain `auth.evolift.at`, not the apex. In Resend, add that subdomain and leave open tracking and click tracking off. Copy the SPF, DKIM, and DMARC records Resend shows into this same world4you zone. Wait until Resend marks the domain verified. The sender is `EvoLift <no-reply@auth.evolift.at>`. Supabase SMTP settings are in `evo-lift/README.md`. Do not commit the Resend API key.

Merge to `master` only after the verify commands succeed. The production smoke workflow calls `https://evolift.at`.

## Branding and UX Consistency

For copy, terminology, action tone, and UI behavior conventions, refer to:

- `evo-lift/BRAND_GUIDELINES.md`

## Scripts

From `evo-lift/`:

- `npm run dev` - Start local dev server
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run unit tests
- `npm run test:integration` - Run API integration tests against local Supabase

## License

This project is licensed under the MIT License. See [`LICENSE`](LICENSE).

## Contributing

Contributions are welcome.

- Open an issue first for larger changes so approach and scope are clear.
- Keep pull requests focused and include validation steps (for example `npm test`, `npm run lint`, and `npm run build` from `evo-lift/`).
- If you change schema or seed behavior, include the relevant updates under `supabase/migrations/` or `supabase/seeds/`.

## Support

- Bug reports and feature requests: open a GitHub issue in this repository.
- Security-related concerns: follow [`SECURITY.md`](SECURITY.md) and do not disclose sensitive details publicly.
