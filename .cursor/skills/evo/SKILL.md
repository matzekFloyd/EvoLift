---
name: evo
description: Query and update live EvoLift training data through the HTTP API MCP (exercises, sessions, templates, sets). Use when the user runs /evo or asks for catalog, sessions, templates, or logging via the API.
disable-model-invocation: true
---

# EvoLift data (`/evo`)

Answer from the **EvoLift HTTP API** via the **`evo-lift` MCP** only. Never query Supabase, never invent rows, never SQL.

## How to call

1. Prefer MCP tools on **`evo-lift`**: `get_targets`, `get_openapi`, `list_exercises`, `evo_api_get`, `evo_api_request`.
2. If the MCP is missing, say so. Do not fall back to database access.
3. **Cloud Agents / remote MCP:** connect to `https://evo-lift.vercel.app/api/mcp` (Streamable HTTP). Put the production personal API token in `Authorization: Bearer evo_…`. Do **not** use `https://evo-lift.vercel.app` as the MCP URL — that is the app, not the MCP endpoint. Hosted MCP always queries that deployment (no local/prod switch).
4. **Laptop stdio MCP:** default **`target: "prod"`**. Pass **`target: "local"`** only when the user asks for local.
5. Prod (stdio) needs `EVO_API_PROD_URL` and `EVO_ACCESS_TOKEN_PROD`. Local needs `npm run dev` and `EVO_ACCESS_TOKEN`.
6. Always state which target or deployment you queried.

`GET /api/openapi` is the source of truth. Discover with `get_openapi` before assuming a path. Read with `evo_api_get`. Writes use `evo_api_request` (`POST` / `PATCH` / `PUT` / `DELETE`) and a JSON `body`. Confirm before `DELETE`.

If 401, stop and ask for `EVO_ACCESS_TOKEN_PROD` (prod) or `EVO_ACCESS_TOKEN` (local).

## What exists today

All listed routes except OpenAPI need bearer JWT or personal API token (`evo_…`). Bodies use **snake_case**. Mutating routes return the full session or template under `{ data }`.

| Route | Meaning |
|---|---|
| `GET /api/openapi` | Spec (no auth) |
| `GET /api/exercises` | Exercise catalog (`slug` + `en`/`de` names). Not filtered by hidden exercises. |
| `GET /api/sessions` | User sessions. Optional `from` / `to` (`YYYY-MM-DD`). |
| `POST /api/sessions` | Create session: `performed_on` plus `exercises[]` **or** `template_id` (not both). |
| `GET\|PATCH\|DELETE /api/sessions/{id}` | Load; update `performed_on` / `notes`; delete. |
| `POST /api/sessions/{id}/exercises` | Add exercise (`exercise_id`, optional targets). |
| `PATCH\|DELETE /api/sessions/{id}/exercises/{sessionExerciseId}` | Update targets or remove exercise. |
| `POST .../sets` | Log a set (`reps` required; `weight_kg`, `is_warmup`). |
| `PATCH\|DELETE .../sets/{setId}` | Edit or delete a set. |
| `GET\|POST /api/templates` | List or create templates. |
| `GET\|PUT\|DELETE /api/templates/{id}` | Load, replace, or delete a template. |
| `POST /api/templates/{id}/sessions` | Start a session from a template (`performed_on`, optional `notes`). |

No dedicated PB or “hidden for me” route. If asked for a PB, only derive it from sets returned by the session API and say it is derived. Account profile / defaults are not in this API.

Planned sessions (future `performed_on`) cannot have sets yet.

## Product terms

**Session**, **exercise**, **set**; **Loaded (kg)**; **Total (kg)**; **Target weight (kg)**; reps as `N reps`.

## Playbooks

### All exercises / loggable catalog

Call `list_exercises` (optional `lang: "en"`). Lead with the count. List **slug** + English name (or the requested language). Full catalog, not “hidden for this user.”

### List or inspect sessions

`evo_api_get` `/api/sessions` (optional `from` / `to`). For one workout, `GET /api/sessions/{id}` — exercises include `sets`.

### Create a session and log sets

1. Resolve `exercise_id` via `list_exercises` (use `id`, not slug, in the body).
2. `evo_api_request` `POST /api/sessions` with `performed_on` and `exercises` (or `template_id`).
3. From the response, take each session exercise `id` and `POST .../exercises/{sessionExerciseId}/sets`.

### Templates

`GET /api/templates` to list. Create/replace with `name` + `exercises[]` (same exercise fields as sessions). Start a workout with `POST /api/templates/{id}/sessions`.

## Answer shape

Lead with the number or the fact. Keep it short. Quote API errors. Never fabricate a PB or a catalog.
