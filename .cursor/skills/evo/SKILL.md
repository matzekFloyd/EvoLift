---
name: evo
description: Query live EvoLift data through the HTTP API MCP (exercises now; user-specific routes as they are added). Use when the user runs /evo or asks for catalog, PBs, sessions, or other training data.
disable-model-invocation: true
---

# EvoLift data (`/evo`)

Answer from the **EvoLift HTTP API** via the **`evo-lift` MCP** only. Never query Supabase, never invent rows, never SQL.

## How to call

1. Prefer MCP tools on **`evo-lift`**: `get_targets`, `get_openapi`, `list_exercises`, `evo_api_get`.
2. If the MCP is missing, say so. Do not fall back to database access.
3. Default **`target: "prod"`**. Pass **`target: "local"`** only when the user asks for local.
4. Prod needs `EVO_API_PROD_URL` (origin only) and, for authenticated routes, `EVO_ACCESS_TOKEN_PROD` (a **production** personal API token from Account, prefix `evo_` — not a JWT and not the local token).
5. Local needs the app running (`cd evo-lift && npm run dev`) and `EVO_ACCESS_TOKEN` (local personal API token). On 401, ask for the matching env var — do not guess data.
6. Always state which target you queried.

`GET /api/openapi` is the source of truth for which routes exist. After new endpoints ship, discover them with `get_openapi` and call them with `evo_api_get`. Do not assume PB/session routes until they appear in the spec.

## What exists today

| Route | Auth | Meaning |
|---|---|---|
| `GET /api/openapi` | no | Spec |
| `GET /api/exercises` | bearer JWT or personal API token (`evo_…`) | Exercise catalog (`slug` + `en`/`de` names). Not filtered by hidden exercises. |

User-specific questions (loggable-for-me, personal best, sessions) **wait for API support**. If the spec has no matching path, say the API cannot answer yet. Do not compute PBs from SQL.

## Product terms

**Session**, **exercise**, **set**; **Loaded (kg)**; **Total (kg)**; **Target weight (kg)**; reps as `N reps`.

## Playbooks

### All exercises / loggable catalog

Call `list_exercises` (optional `lang: "en"`). Lead with the count. List **slug** + English name (or the requested language). This is the full catalog, not “hidden for this user,” until the API adds that.

### User-specific (later)

When OpenAPI lists a matching route, `evo_api_get` it (same `target`, default prod) and answer from the JSON. If 401, stop and ask for `EVO_ACCESS_TOKEN_PROD` (prod) or `EVO_ACCESS_TOKEN` (local).

## Answer shape

Lead with the number or the fact. Keep it short. Quote API errors. Never fabricate a PB or a catalog.
