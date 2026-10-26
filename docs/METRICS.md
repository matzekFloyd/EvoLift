# Metrics

Public home `/` only. Started 2026-10-26 from the Phase 1 brief (the `cro-methodology` skill was not installed).

Traffic is under about 100 visits a week. There are no visitor quotes and no stage rates. Evidence is the live heading on https://evolift.at/, the page in `evo-lift/app/page.tsx`, and the login default in `evo-lift/app/login/page.tsx`. Objections in WEBSITE.md are hypothesized, except the price fact (an account, no charge) and the Log in default (observed).

## Funnel

No stage rate exists, so no blocked artery is named. The visible gap is a missing stage (understand the offer) and a mismatched handoff (Start lifting opens Log in).

| Stage | Where | Status | ONE action |
|---|---|---|---|
| Arrive | `/` | Exists. Logo and one line. | — |
| Understand the offer | `/` | Missing. Brand promise is not on the page. | — |
| Start | `/` | Exists. One button. Terms and Privacy are quiet legal links. | Start lifting, and it opens Register |
| Account | `/login` | Exists. Out of scope to redesign. Today the page opens on Log in, with Register as an equal tab. | Register, for a stranger sent from `/` |

Attack order, decided 2026-10-26: the missing offer first, then the Register handoff.

## Stage & One Metric That Matters

| Stage | Metric | Baseline | How we will read it |
|---|---|---|---|
| Arrive → Start lifting | Clicks on Start lifting ÷ visits to `/` | Unknown | Qualitative until volume can support a test. A stranger can say what EvoLift does and what the button opens. |
| Start lifting → account | Register completions ÷ clicks | Unknown. Not instrumented. | Out of scope for this page. Noted so the handoff is not forgotten. |

Do not treat a small click-rate swing as proof while traffic stays under about 100 visits a week.

## Baselines & Targets

Recorded 2026-10-26 from the live origin `https://evolift.at/`. No lab Core Web Vitals run. Lighthouse scores `/` for SEO only.

The document is prerendered (`X-Nextjs-Prerender: 1`), about 13KB, and the heading is in that HTML. One woff2 is preloaded at 40,240 bytes. The stylesheet is 75,912 bytes, render-blocking, and cached immutable. Static files use `Cache-Control: public, max-age=31536000, immutable`. The HTML itself is `max-age=0, must-revalidate`. Assets stay on this origin. No domain sharding. The curl client used here cannot offer HTTP/2, so the `HTTP/1.1` status line is not a server finding.

One request from this machine was a Vercel cache hit and took 954ms to the first byte, including the network. That is not a lab TTFB.

| Metric | Baseline | Target | Miss response |
|---|---|---|---|
| LCP | Not lab-measured. The candidate is the heading, already in the HTML. The font is preloaded. | < 2.5s | If a lab run misses, inspect the 76KB stylesheet before touching the font. |
| INP | Not measured. The page has two links and no inputs. | < 200ms | If a lab run misses, inspect hydration. |
| CLS | Not measured. The mark is an inline SVG with `h-12 w-12`. | < 0.1 | If a lab run misses, inspect font fallback shift. |
| TTFB | Not a lab score. One cache-hit sample was 954ms including network. | < 800ms | Repeat in a lab before changing hosting. |
