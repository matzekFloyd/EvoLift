# Website

Public home `/` only. Logged-in app is out of scope. Phase 1 ran from the phase brief on 2026-10-26.

## Sitemap

| Path | Role |
|---|---|
| `/` | Public home. The page this journey improves. |
| `/login` | Account step. Arrival from Start lifting must open Register. The login screen itself is not being redesigned here. |
| `/privacy`, `/terms` | Legal pages. Quiet links from `/`. |

## Page Briefs

### / (home)

- Purpose & primary conversion action: Get a stranger to start an account. ONE action is **Start lifting**, and it opens **Register**.
- Message (from POSITIONING.md): Log each set before the next one starts. The internal problem, kept in the brand script: the log gets in the way of the workout.
- CTA (direct + transitional): Direct — Start lifting → Register. Transitional — none. The account note is not a second action.
- Copy blocks: heading “Log each set before the next one starts.” Account note “Create an account. There is no charge.” Button “Start lifting”. Terms of use. Privacy policy. Not shipped yet.

## Conversion Elements

Objections are hypothesized, except Price (confirmed: an account, no charge) and the Effort handoff (observed: `/login` opens on Log in).

| Objection (Big 5) | Counter | Placement | Status |
|---|---|---|---|
| Trust — “I don’t know what this is.” | One plain sentence of what EvoLift is. | Under the heading, before the button | backlog |
| Fit — “This could be any workout app.” | Say the omitted promise: log a session quickly while training, and keep progress clear. | The heading | backlog |
| Price — “This might ask me to pay.” | The click creates an account. There is no charge. | Beside the button | backlog |
| Effort — “Start lifting left me on a login form.” | The button opens Register, and the label matches that screen. | The button and its destination | backlog |
| Timing — “I’ll start when I have a workout.” | No real deadline. No countdown and no fake scarcity. | No pressure line | decided |

## Audit Findings

| Issue | Severity (0-4) | Fix | Owner | Priority | Status |
|---|---|---|---|---|---|
| The offer is one feature line. The brand promise is absent. | 4 | One sentence of who it is for and what they do. One button. | product | P1 | backlog |
| Start lifting opens the Log in tab. | 3 | Open Register from that button. Use the same verb on the button and the screen. | product | P1 | backlog |
| The cost of the click is unstated. | 2 | Say the step is an account and there is no charge. | product | P2 | backlog |
| No proof. | 2 | One concrete line about logging a session. No invented testimonials. | product | P2 | backlog |
| Core Web Vitals for `/` are not lab-measured. | 1 | Add a performance score for `/` in the Lighthouse suite. Ship no speed change until a lab run misses a target. | product | P4 | backlog |

## Lead Capture

No email capture and no lead magnet. The only action is an account.
