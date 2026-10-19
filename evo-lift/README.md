## EvoLift

EvoLift is a mobile-first workout logging app built with Next.js and Supabase.

For product language, visual consistency, and action/feedback conventions, see:

- [`BRAND_GUIDELINES.md`](./BRAND_GUIDELINES.md)

## Contributing UI changes

Before merging UI or copy updates, quickly validate against the brand checklist in
[`BRAND_GUIDELINES.md`](./BRAND_GUIDELINES.md).

Minimum review checklist:

- Terminology is consistent (`Workout session`, `Set`, `Target weight (kg)`, `<number> reps`, working-set targets vs warmups).
- Action colors and icons match intent (primary/neutral/destructive/success).
- Feedback uses shared status notice patterns where applicable.
- Mobile/compact behavior remains usable for high-frequency actions.
- Text is concise, clear, and action-oriented.

## Setup

Install, local Supabase, and scripts are in the repository [README](../README.md). From this folder, `npm run dev` starts the app at [http://localhost:3000](http://localhost:3000).

## Supabase DB Workflow

Use this workflow for all database schema changes so local and remote stay in sync.

### 1) Create a new migration

```bash
supabase migration new <descriptive_name>
```

This generates a new timestamped SQL file in `supabase/migrations`.

### 2) Edit the generated migration SQL

Open the new migration file and add your schema changes (`create table`, `alter table`, indexes, RLS policies, etc.).

### 3) Validate locally

```bash
supabase db reset
```

This replays all migrations (and seed data if configured) against your local database to verify everything works from scratch.

### 4) Push to remote

```bash
supabase db push
```

Apply unapplied local migrations to your linked Supabase project.

### Recommended habit

- Make schema changes via migrations (avoid dashboard-only changes).
- Run `supabase db reset` before pushing.
- Commit each migration file to Git.

### Seed file structure

Store seeds by domain in `supabase/seeds` and keep them ordered:

- `supabase/seeds/001_exercises.sql` inserts base `exercises` rows by slug.
- `supabase/seeds/002_exercise_translations.sql` inserts `exercise_translations` for `en` and `de`.

The order matters when one seed depends on data from another seed. Configure this in `supabase/config.toml`:

```toml
[db.seed]
enabled = true
sql_paths = ["./seeds/*.sql"]
```

When adding future seeds, append a new numbered file (for example `003_defaults.sql`).

### Run seeds on linked remote

`supabase db push` applies migrations only. To run seed files on the linked remote database, execute:

```bash
supabase db query --linked --file supabase/seeds/001_exercises.sql
supabase db query --linked --file supabase/seeds/002_exercise_translations.sql
```

## Backend Supabase usage

Supabase server clients live in `lib/supabase/server.ts`:

- `createPublicServerClient(accessToken?)` uses anon key and obeys RLS.
- `createServiceRoleClient()` uses service role and bypasses RLS.

Backend query logic lives in:

- `server/db/exercises.ts`
- `server/db/workouts.ts`

Route handlers stay thin and call that data layer:

- `app/api/exercises/route.ts`
- `app/api/sessions/route.ts` and nested session exercise/set routes
- `app/api/templates/route.ts` and `app/api/templates/[id]/sessions/route.ts`

### Browser API testing (Swagger UI)

- After login, open `http://localhost:3000/docs` for interactive API docs.
- The OpenAPI spec is served from `http://localhost:3000/api/openapi`.
- Try-it-out uses your current session automatically. To use a personal API token instead, click Authorize and paste the token value (without an extra `Bearer` prefix).

### RLS choice guidelines

- Use `createPublicServerClient` for user-scoped endpoints and pass a valid user JWT as bearer token (`Authorization: Bearer <token>`).
- Use `createServiceRoleClient` only for trusted internal/admin operations.
- If an endpoint should never bypass policies, do not use the service role in that path.

## Environment variables

Set these in each environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Production (and preview, if you use a fixed host) should also set:

- `NEXT_PUBLIC_APP_URL` — public app origin used in confirm-email / email-change redirects (example: `https://evo-lift.vercel.app`). Do **not** set this for local `npm run dev`; the browser origin (`http://localhost:3000`) is used instead.

Optional page-load sampling stays off unless `NEXT_PUBLIC_EVOLIFT_PERF_TELEMETRY` is exactly `1`. Restart the app after changing it, because `NEXT_PUBLIC_*` values are embedded at build time. When it is on, each instrumented load (`/exercises`, `/exercises/[slug]`, `/sessions/[id]`) has a chance to POST a summary to `/api/perf`. The default chance is 10%. Set `NEXT_PUBLIC_EVOLIFT_PERF_SAMPLE_RATE` to a number from 0 to 1 to change it (`1` sends every load, `0` sends none). A sample contains the route template, load duration, query count, up to five slowest query names and durations, and cache hit/miss notes when that load already knew them. It does not contain workout notes, set values, or account data. The server writes one log line and stores nothing.

**Local Docker:** from the repo root, run `supabase start`, then `supabase status -o env --override-name api.url=NEXT_PUBLIC_SUPABASE_URL` and map `ANON_KEY` / `SERVICE_ROLE_KEY` into `evo-lift/.env.local` (see the root `README.md`).

Notes:

- `NEXT_PUBLIC_SUPABASE_URL` must be the project base URL (local: `http://127.0.0.1:54321`; hosted: `https://<project-ref>.supabase.co`), not `/rest/v1`.
- `NEXT_PUBLIC_*` values are embedded at build time, so redeploy after changing them.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed in client code.

### Hosted Supabase Auth URLs (required for production email confirm)

If Site URL stays at `http://localhost:3000`, confirmation emails fall back to localhost whenever the requested redirect is missing from the allow list.

In the hosted project: **Authentication → URL Configuration**:

1. **Site URL** — one default origin (fallback when a redirect is missing from the allow list). Use the live Vercel host until `evolift.at` is ready, then switch Site URL to `https://evolift.at`. Not localhost.
2. **Redirect URLs** — list every host users may land on (multiple is fine; they do not conflict):
   - `https://evo-lift.vercel.app/**`
   - `https://evolift.at/**` and `https://www.evolift.at/**` once DNS points at the app (safe to add early)
   - `http://localhost:3000/**` and `http://127.0.0.1:3000/**` for local register
   - optionally `https://*-<team>.vercel.app/**` for Vercel previews

Sign-up and email-change use `…/login?verified=1` as `emailRedirectTo`. That path must match the allow list (wildcards above cover it).

`NEXT_PUBLIC_APP_URL` should be a **single** canonical origin (the one you want in confirmation emails). Keep it on the Vercel host until `evolift.at` serves the app, then change it to `https://evolift.at` and redeploy. Do not put two URLs in that env var.

### Environment matrix

| Environment | Supabase project | Where to configure |
| --- | --- | --- |
| Local | Docker via Supabase CLI (`supabase start`) | `evo-lift/.env.local` |
| Preview | preview/staging Supabase (recommended) | Vercel Project Settings -> Environment Variables (Preview) |
| Production | production Supabase | Vercel Project Settings -> Environment Variables (Production) |

## Deployment checklist

1. Apply schema changes from migrations:
   - `supabase db push --linked`
2. Run only production-safe seeds:
   - `supabase db query --linked --file supabase/seeds/001_exercises.sql`
   - `supabase db query --linked --file supabase/seeds/002_exercise_translations.sql`
3. Verify Vercel env vars are set for the target environment (including `NEXT_PUBLIC_APP_URL` for Production).
4. Confirm hosted Supabase **Authentication → URL Configuration** Site URL and Redirect URLs (see above).
5. Redeploy application.
6. Smoke test:
   - `/login`
   - register → confirm-email link opens the production host (not localhost)
   - `/docs`
   - authenticated `GET /api/exercises?lang=en`

## Auth and API usage

- Users authenticate via Supabase Auth (email/password, OAuth, magic link, etc.).
- Frontend gets `access_token` from Supabase session for in-app requests.
- Authenticated `/api/*` routes accept a session JWT or a personal API token created on Account → Login (`Authorization: Bearer evo_…`). Tokens are stored hashed, shown once, and do not expire until revoked.
- Workout sessions and templates can be listed, created, updated, and deleted over the API (same ownership rules as the UI). Use `/docs` to try them.
- In Swagger (`/docs`), the logged-in session is sent automatically. To use a personal token, use Authorize and paste the raw token value (without adding an extra `Bearer` prefix).

## Seed policy

- Keep production-safe seeds under `supabase/seeds` (catalog/reference data).
- Keep dev-only sample/test data in separate files (for example `9xx_dev_*.sql`) and do not run these in production.
- Local demo workouts are created by `scripts/seed-local-demo.mjs` on `npm run dev`, and only when the Supabase URL is localhost. They are not applied to hosted projects.
- Prefer idempotent seeds using `on conflict do nothing` or `on conflict ... do update`.

## Security notes

- Never commit `.env.local`.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser/client code.
- Rotate any leaked keys/passwords immediately.
