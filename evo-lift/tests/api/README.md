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

## Timing note (#296)

Helper extraction + `fileParallelism: true` (2026-10-20). Local Vitest wall after warm Supabase: **~4 s** for 5 files / 17 tests (was serial four-file suite before; CI **API integration** job remains dominated by Supabase startup, not Vitest).
