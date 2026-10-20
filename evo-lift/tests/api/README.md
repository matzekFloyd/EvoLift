# API integration tests

Vitest suite against **local Supabase only** (`127.0.0.1` / `localhost`). Shared helpers live in `integration-helpers.ts`.

```bash
# from repo root
supabase start
cd evo-lift
npm run test:integration
```

Files may run in parallel (`fileParallelism: true`); each file creates its own users with unique emails.

## Coverage inventory (vs `app/api/**`)

| Area | Covered in |
| --- | --- |
| Sessions create/list/get/patch, add exercise/set, template start | `workout-api` |
| Set PATCH/DELETE, session-exercise PATCH/DELETE, plan duplicate, template PUT/DELETE | `session-mutations` |
| Plans/goals/account/profile/bodyweight/tokens/insights/activity/history | `app-api` |
| Account delete + cascade | `account-delete` |
| Personal-token IDOR | `personal-token-idor` |
| OpenAPI GET, security `login_failed` | `session-mutations` |

**Still thin / not integration-covered:** MCP (`/api/mcp`), `/api/perf`, most account email-change happy paths, broader security-event authenticated types. Prefer unit tests or a dedicated follow-up for MCP (auth + path allowlist already unit-tested).

## Timing note (#296, #312)

Helper extraction + `fileParallelism: true` (2026-10-20). Local Vitest wall after warm Supabase: **~4 s** for 5 files / 17 tests. In CI the suite itself is ~2 s.

**API integration** on `ubuntu-latest`, before the slimmer startup ([run 39426654986](https://github.com/matzekFloyd/EvoLift/actions/runs/39426654986)):

| Step | Duration |
| --- | --- |
| Start local Supabase | ~1m 48s |
| Apply migrations and catalog seeds | ~29s |

That seed step was `supabase db reset`, which dropped the database `supabase start` had just migrated and replayed every migration, then loaded the catalog. CI now migrates once during `supabase start` (`scripts/ci-supabase-start.mjs`). The seed step runs `001_exercises.sql` and `002_exercise_translations.sql` only. `003_user_exercise_defaults_barbell_20kg.sql` stays out of this suite. CI starts Postgres, Auth, and the API. Local `supabase start` still brings up the full stack from `config.toml`. Lighthouse uses the same startup. The pull request that lands this change records the new durations for those two steps on the same runner class.
