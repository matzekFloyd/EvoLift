# Experiments

Public home `/`. Phase 1, 2026-10-26. Qualitative evidence only: under about 100 visits a week, no visitor quotes, no powered A/B test.

ICE is impact × confidence × ease, each scored out of 10. The Register handoff scores higher (486) because it is certain and small. Execution order follows the Phase 1 decision: the missing offer first, because the tab change does not give a stranger a reason to click.

## Experiment Cards

No card. Closed 2026-10-26 without promoting the backlog. Under about 100 visits a week, a 95% test cannot be powered. The read is qualitative: a stranger can say what EvoLift does and what the button opens.

Next build, when asked:

- [ ] Ship the heading “Log each set before the next one starts.” and the note “Create an account. There is no charge.” with the type and spacing already decided — [#424](https://github.com/matzekFloyd/EvoLift/issues/424)
- [ ] Then open Register from Start lifting, and match the label to that screen — [#464](https://github.com/matzekFloyd/EvoLift/issues/464)

## Experiment Backlog

| Order | Idea | ICE (impact/confidence/ease) | Owner | Priority | Status |
|---|---|---|---|---|---|
| 1 | Replace the heading with “Log each set before the next one starts.” Add the note “Create an account. There is no charge.” Keep a single Start lifting button. Heading 30px, weight matches size, line height 1.25, centered. The note is 16px with line height about 1.6. Button and legal links stay 14px. Spacing on the 4/8/16/24/32/48/64 scale. IBM Plex Sans only. No new colors. | 270 (9/5/6) | product | P1 | decided — not shipped |
| 2 | Open Register from Start lifting, and use a label that matches that screen. This is the constraint: a new lifter cannot land on Log in. No error message on `/`. | 486 (6/9/9) | product | P1 | backlog |
| 3 | Say that the click creates an account and there is no charge. | 240 (5/6/8) | product | P2 | backlog |
| 4 | Offer a sample session a visitor can read without an account. | 72 (6/4/3) | product | P3 | backlog |
| 5 | Say that Terms and Privacy open in a new tab. | 144 (2/8/9) | product | P4 | backlog |
| 6 | Revisit the centered stack when Phase 3 sets hierarchy. | 60 (3/4/5) | product | — | decided — keep centered |
| 7 | Score `/` for performance in the Lighthouse suite. Ship no speed change until a lab run misses a target. | 112 (2/8/7) | product | P4 | backlog |
