# Design System

Public home `/`. Phase 2 ran from the phase brief on 2026-10-26 (`ux-heuristics` is not installed).

## Design Direction

Phase 3 and any later visual pass record this.

## Typography

Decided 2026-10-26. Keep IBM Plex Sans. No second face. IBM Plex Mono is not loaded on `/`.

The root layout loads latin weights 400, 500, 600, and 700 through `next/font`, which self-hosts, subsets, preloads, and defaults to `font-display: swap`. Do not add a `clamp()` scale. The live home page preloads one woff2 at 40,240 bytes, under the 200KB budget.

| Role | Size | Line height | Measure | Status |
|---|---|---|---|---|
| Heading (the offer) | `text-3xl` (30px) | `leading-tight` (1.25) | Near 65 characters, centered | ships with the offer sentence |
| Account note | `text-base` (16px) | about 1.6 | Near 65 characters | ships with the offer sentence |
| Wordmark | `text-2xl` (24px) | none (single line) | — | keep |
| Button and legal links | `text-sm` (14px) | — | — | keep |

Scale in use: 14 / 16 / 24 / 30. No new steps.

## Tokens

Decided 2026-10-26. Stay on the current sky/zinc scale. No new color or type tokens. No recolor. The sky band stays; brand rules require it.

Spacing scale: 4 / 8 / 16 / 24 / 32 / 48 / 64. Gaps between groups stay larger than gaps inside them.

| Token | Decision | Status |
|---|---|---|
| Page background | `zinc-50`. Text `zinc-900`, not `#000`. | keep |
| Brand band | `from-sky-200 via-sky-100 to-sky-50`. | keep |
| Action fill | Sky, on Start lifting only. | keep |
| Space above the heading | `pt-10` (40) is off the scale. Use `pt-12` (48) below `sm`, and keep `sm:pt-16` (64). | ships with the offer sentence |
| Heading to button | `mt-12` (48). On the scale. | keep |
| Button to legal links | `mt-16` (64). On the scale, and larger than the gap inside the legal row. | keep |
| Gap inside the legal row | `gap-x-3` (12) is off the scale. Use `gap-x-4` (16). | ships with the offer sentence |
| Offer measure | Cap the sentence near 65 characters. Keep it centered. | ships with the offer sentence |
| Shadow | None on this page. | keep |

## Components

| Component | Decision | Status |
|---|---|---|
| EvoLift wordmark | Visible name “EvoLift” at `text-2xl` bold. Plate mark is decorative (`aria-hidden`). Stays smaller than the heading. | keep |
| Heading | The hero. Size is already `text-3xl`. Weight is `font-medium`, so the bold wordmark competes. Use semibold or bold so size and weight agree. No new type size. | ships with the offer sentence |
| Start lifting | The only filled control. Stays `text-sm`. It does not also become the largest type. It must open Register once that fix ships. | backlog |
| Terms of use, Privacy policy | Quiet text links. They open a new tab with no visible warning. | backlog |

## UX Audit Findings

Trunk Test on `/` (the only page in scope):

| Question | Result |
|---|---|
| What site is this? | Pass. The wordmark reads EvoLift. |
| What page is this? | Pass for a one-page site. The heading is the offer, and that offer is the severity 4 issue below. |
| What are the options? | Pass. One named button and two named legal links. No icon-only controls. |
| Where am I? | Not applicable. There are no sections. |
| Where is search? | Not applicable. Do not add search. |

Word cut: the heading is five words. Cutting it further would remove the only explanation. Do not shorten it. The failure is recognition, not length.

Fixes run by severity. The easier Register handoff stays behind the severity 4 offer.

| Issue | Heuristic | Severity (0-4) | Fix | Owner | Priority | Status |
|---|---|---|---|---|---|---|
| A stranger has to already know EvoLift. The heading is a feature list. | Recognition rather than recall | 4 | One sentence a stranger can repeat. One button. | product | P1 | fix now |
| Start lifting matches neither Log in nor Register. | Consistency and standards | 3 | Open Register and use the same verb on the button and the screen. After the severity 4 fix. | product | P1 | backlog |
| The click does not say it creates an account or that there is no charge. | Visibility of system status | 2 | One short expectation beside the button. | product | P2 | backlog |
| Terms and Privacy open a new tab with no visible warning. | User control and freedom | 1 | Say that those links open in a new tab. | product | P4 | backlog |
| The stack is centered. | Aesthetic and minimalist design | 1 | Keep it centered. This page is one sentence and one button. | product | — | decided |
| Glossary is not linked. | Help and documentation | 0 | Leave it unlinked so it does not become a second action. | product | — | decided |
| Start lifting reads as a workout and opens Log in. | Execution gulf | 3 | The link opens Register. No error message on `/`. Same fix as the consistency row. | product | P1 | backlog |
| The next screen is the feedback, and today it is the Log in tab. | Evaluation gulf | 3 | The account note says what will happen before the click. The next screen is Register. | product | P1 | backlog |
| Nothing on `/` destroys data. | Execution gulf | 0 | Do not add undo. Do not add a confirm step. | product | — | decided |

## Microinteraction Inventory

No microinteraction work in this phase.

| Interaction | Trigger/Rules/Feedback/Loops | Fix | Status |
|---|---|---|---|
