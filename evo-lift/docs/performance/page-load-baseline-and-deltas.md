# Page Load Performance Baseline and Deltas

## Scope

- `app/sessions/[id]/page.tsx`
- `app/exercises/[slug]/page.tsx`
- `app/exercises/page.tsx`

## Instrumentation Added

- Shared tracker: `lib/page-load-perf.ts`
  - Captures total page load duration (client-side fetch flow).
  - Captures query count and per-query latency.
  - Logs a compact summary in the browser console.
  - Stores recent samples on `window.__evoLiftPerfMetrics`.
- Instrumented query wrappers were added to each scoped page load flow.

## Cache Strategy

- Shared exercise metadata cache: `lib/exercise-metadata-cache.ts`
  - Cached data: `exercises (id, slug)` + English label from `exercise_translations`.
  - Cache locations:
    - in-memory module cache (fast intra-session reuse),
    - `localStorage` key: `evolift:exercise-metadata:v1` (cross-page reuse).
  - TTL: 5 minutes.
  - Invalidation:
    - TTL expiry (automatic refresh),
    - explicit `invalidateExerciseMetadataCache()` hook for future metadata mutations.
- Safety:
  - Only stable exercise metadata is cached (not user workout/session data).
  - User-scoped data remains fetched directly and auth-gated.

## Baseline (Before Optimization)

Measured as query flow counts from previous page-load logic.

| Page | Query count (baseline) | Main bottlenecks |
|---|---:|---|
| `/sessions/[id]` | 8 | Repeated metadata fetch (`exercises` + `exercise_translations`) on every load |
| `/exercises/[slug]` | 6 | Separate exercise/translation lookup + full session chain each load |
| `/exercises` | 5 | Re-fetching metadata every load |

## Post-change (After Optimization)

### Cold cache (first load after TTL miss)

| Page | Query count (after, cold) | Delta vs baseline |
|---|---:|---:|
| `/sessions/[id]` | 8 | 0 |
| `/exercises/[slug]` | 5 | -1 |
| `/exercises` | 4 | -1 |

### Warm cache (within TTL)

| Page | Query count (after, warm) | Delta vs baseline |
|---|---:|---:|
| `/sessions/[id]` | 6 | -2 |
| `/exercises/[slug]` | 4 | -2 |
| `/exercises` | 3 | -2 |

## What Changed

- Added reusable exercise metadata cache and replaced duplicate metadata fetches in all three scoped pages.
- Added query-level and total-load instrumentation wrappers for the scoped page loads.
- Tightened one redundant page flow in `app/exercises/[slug]/page.tsx` by resolving exercise identity/label from cached metadata instead of separate queries.

## Known Trade-offs

- Cold-cache first hit still performs metadata queries.
- Metadata can be stale for up to 5 minutes; this is acceptable for non-critical exercise naming/slug metadata.
- Session number on `/sessions/[id]` is a prior-session count plus a same-timestamp id lookup. Those reads now run with the other independent loads.

## Next Steps (Optional)

- Add a tiny dev-only diagnostics panel to inspect `window.__evoLiftPerfMetrics` without opening console.
- Add explicit metadata cache invalidation wherever exercise definitions/translations are edited in-app.

## Read waterfalls

Independent reads on the three page loads now start together. Query counts are unchanged. Load time is the slowest read in each group, not the sum.

`/sessions/[id]` names the session-exercise and set columns on the initial load. Insert and update responses still use `select("*")`.

Local demo, one signed-in browser session, from `window.__evoLiftPerfMetrics`:

| Page | Cache | Load | Queries |
|---|---|---:|---:|
| `/exercises` | Cold metadata, counts fetched | 153.2 ms | 3 |
| `/exercises` | Warm metadata, home summary already loaded | 15.8 ms | 2 |
| `/exercises/[slug]` | Cold metadata | 102.0 ms | 5 |
| `/exercises/[slug]` | Warm metadata | 93.9 ms | 5 |
| `/sessions/[id]` | Cold metadata | 123.0 ms | 8 |
| `/sessions/[id]` | Warm metadata | 101.6 ms | 8 |

On the cold exercise list, metadata (132.2 ms) and `exercise_past_session_counts` (102.6 ms) overlapped, so the load was 153.2 ms rather than about 255 ms end to end. On the cold session editor, the five reads after the session row overlapped and the load was 123 ms rather than about 283 ms end to end. On the exercise page, session rows and set rows overlapped (about 15 ms each).
