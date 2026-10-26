# Improve Website Plan

## Context

Started 2026-10-26. First run; no prior tracker.

**Page:** public home `/` (`evo-lift/app/page.tsx`). Logged-in app is out of scope.

**ONE action:** Start lifting (`/login`). Current copy is the heading “Log workouts, plans, and progress.” plus that button, Terms, and Privacy.

**Problem:** No measured conversion problem. Diagnose the page as shipped.

**Visitor input:** None, and none coming before diagnosis. Phase 1 objections will be hypothesized and labeled as such, not quoted from visitors.

**Traffic:** Under about 100 visits a week. Evidence stays qualitative and heuristic. Powered A/B tests are not the default.

**Complaint:** None heard. The page is thin. After Phase 1, expect the main fix to be the message (Phase 5), not a visual redesign.

**Positioning:** Start fresh in Phase 5. `evo-lift/BRAND_GUIDELINES.md` constrains terminology, color, and tone. There is no `POSITIONING.md`.

**Assets:** Repo only — live copy, brand guidelines, and the page as shipped.

**Do not skip:** Phase 1 (gate). Phase 5 and Phase 7 (message is one unvalidated line; positioning is unset). Phase 6 (no Core Web Vitals baseline; `/` is SEO-only in `evo-lift/LIGHTHOUSE.md`). Phase 4 (no body copy yet, so the 16px / ~66ch / 1.5–1.7 skip test does not apply; recheck after Phase 5 adds copy).

**Skill availability:** `cro-methodology` is not installed. Phase 1 runs from the phase brief unless the skill is added.

## Phase Status

| Phase | Skill | Status | Artifact | Date |
|---|---|---|---|---|
| 1 | cro-methodology | done | METRICS.md, WEBSITE.md, EXPERIMENTS.md | 2026-10-26 |
| 2 | ux-heuristics | done | DESIGN.md, EXPERIMENTS.md | 2026-10-26 |
| 3 | refactoring-ui | done | DESIGN.md, EXPERIMENTS.md | 2026-10-26 |
| 4 | web-typography | done | DESIGN.md, EXPERIMENTS.md | 2026-10-26 |
| 5 | storybrand-messaging | done | POSITIONING.md, EXPERIMENTS.md | 2026-10-26 |
| 6 | high-perf-browser | done | METRICS.md, WEBSITE.md, EXPERIMENTS.md | 2026-10-26 |
| 7 | made-to-stick | done | POSITIONING.md, EXPERIMENTS.md | 2026-10-26 |
| 8 | design-everyday-things | done | DESIGN.md, EXPERIMENTS.md | 2026-10-26 |

Statuses: pending · in-progress · awaiting-evidence · done · deferred: <reason> · skipped: <reason>

## Key Decisions

| Date | Phase | Decision | Rationale |
|---|---|---|---|
| 2026-10-26 | Intake | Scope is public home `/`. ONE action is Start lifting → `/login`. | Only public conversion surface. Logged-in app stays out. |
| 2026-10-26 | Intake | No measured problem; diagnose the page as shipped. | No analytics. |
| 2026-10-26 | Intake | No visitor quotes. Objections will be hypothesized and labeled. | None available and none coming before diagnosis. |
| 2026-10-26 | Intake | Under ~100 visits/week. Qualitative and heuristic evidence. | A/B tests will not reach significance. |
| 2026-10-26 | Intake | No standing complaint; the page is thin. | Main fix is expected to be the message, after Phase 1. |
| 2026-10-26 | Intake | Positioning starts fresh in Phase 5. Brand guidelines constrain voice and color only. | No POSITIONING.md. |
| 2026-10-26 | Intake | Evidence is the repo only. | Live copy, brand guidelines, page as shipped. |
| 2026-10-26 | Intake | Phase plan confirmed. All eight phases stay pending. None skipped. | No body copy, no Core Web Vitals baseline, message unvalidated. Low traffic: no powered A/B tests. |
| 2026-10-26 | 1 | Ran from the phase brief. | `cro-methodology` is not installed. |
| 2026-10-26 | 1 | ONE action stays Start lifting, and it opens Register. Terms and Privacy stay quiet legal links. | A stranger is starting an account. The live page opens Log in. |
| 2026-10-26 | 1 | Attack the missing offer first, then the Register handoff. | ICE ranks the handoff higher (486 vs 270). The tab change does not explain the product. |
| 2026-10-26 | 1 | Qualitative evidence accepted. | Under ~100 visits a week. No visitor quotes. No powered A/B test. |
| 2026-10-26 | 1 | The click costs an account. There is no charge. The page may say that. | No checkout in the app. Confirmed by the user. |
| 2026-10-26 | 2 | Ran from the phase brief. | `ux-heuristics` is not installed. |
| 2026-10-26 | 2 | Fix the severity 4 recognition gap now. The severity 3 label mismatch stays backlog. | Fixes run by severity, not by ease. |
| 2026-10-26 | 2 | Severity 1 new-tab warning stays backlog. Centered layout waits for Phase 3. Do not shorten the five-word heading. Glossary stays unlinked. | They are not the conversion block. |
| 2026-10-26 | 3 | Ran from the phase brief. Stay on sky/zinc. No new tokens and no recolor. | Brand band stays. Sky stays on the button only. |
| 2026-10-26 | 3 | The heading is the hero: weight matches size. The button stays the only fill and stays smaller. | In grayscale, the bold wordmark was competing with a medium heading. |
| 2026-10-26 | 3 | Snap off-scale gaps, cap the sentence near 65 characters, keep it centered. Ship that with the offer sentence. | Not a separate visual test. |
| 2026-10-26 | 4 | Ran from the phase brief. Keep IBM Plex Sans. No second face and no clamp() scale. | Four latin weights stay. Phase 6 measures the 200KB budget. |
| 2026-10-26 | 4 | Heading stays 30px / 1.25. Account note is 16px / ~1.6 / ~65ch. Button and legal links stay 14px. | The page is not reading-heavy. Controls are not body text. |
| 2026-10-26 | 5 | Ran from the phase brief. Internal problem: the log gets in the way of the workout. | Hypothesized. The heading states the promise, not a second problem sentence. |
| 2026-10-26 | 5 | Heading at the time: “A workout log that keeps up while you train.” One button. Account note is not a second action. | Repeat-after-one-hearing choice. Replaced in Phase 7. |
| 2026-10-26 | 7 | Ran from the phase brief. Commander's Intent: “Log each set before the next one starts.” | “Keeps up” scored 2/6. No timing stat was invented. The account note stays. |
| 2026-10-26 | 6 | Ran from the phase brief. No emergency speed patch. | The heading is in the prerendered HTML. One preloaded font is 40KB. |
| 2026-10-26 | 6 | Backlog a Lighthouse performance score for `/`. Ship no speed change until a lab run misses. | The current suite scores `/` for SEO only. One 954ms sample included network and is not a lab TTFB. |
| 2026-10-26 | 8 | Ran from the phase brief, scoped to the Start lifting link. | Login form errors stay out of scope. |
| 2026-10-26 | 8 | The link opens Register. No error message on `/`. No undo and no confirm step. | Nothing on the page destroys data. The wrong step is the Log in tab. |
| 2026-10-26 | Close | Tracker closed. Experiment cards stay empty. | A 95% test cannot be powered. The next build is the heading, when asked. |

## Next Actions

- [x] Confirm this phase plan (user)
- [x] Phase 1 — funnel, objections, and ICE backlog written
- [x] Phase 2 — heuristic findings written
- [x] Phase 3 — hierarchy and tokens written
- [x] Phase 4 — type scale written
- [x] Phase 5 — offer sentence chosen
- [x] Phase 6 — speed baselines written
- [x] Phase 7 — concrete heading chosen
- [x] Phase 8 — gulfs on the Start lifting link written
- [x] Journey closed. Cards stay empty. Ship the heading when asked.
- [x] Tickets: heading is #424. Register handoff is #464.
