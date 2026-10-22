# Lighthouse checks

Catches load and runtime cost regressions on the surfaces lifters use most, and search-metadata regressions on public pages.

## Surfaces

| URL | Auth | Categories | Why |
| --- | --- | --- | --- |
| `/` | Logged out | SEO | Public marketing page |
| `/login` | Logged out | Performance, SEO | First paint for new and returning lifters |
| `/privacy` | Logged out | SEO | Privacy policy |
| `/terms` | Logged out | SEO | Terms of use |
| `/glossary` | Logged out | SEO | Glossary |
| `/app` (Home) | Local demo user | Performance | Main shell after login |
| `/app/insights` | Local demo user | Performance | Heavier charts and insight panels |

Login uses the local demo account from `npm run seed:local` (`demo@example.com` / `demo1234`) unless `LHCI_EMAIL` / `LHCI_PASSWORD` are set.

Home and Insights stay performance-only. This suite does not score SEO on signed-in screens.

## Pass / fail thresholds

Desktop Lighthouse, one run in CI. Raise `LHCI_NUMBER_OF_RUNS` locally if you want median stability.

### Performance

| Surface | Minimum score |
| --- | --- |
| `/login` | **0.70** |
| Home `/app` | **0.55** |
| `/app/insights` | **0.50** |

### SEO

| Surface | Minimum score |
| --- | --- |
| `/`, `/login`, `/privacy`, `/terms`, `/glossary` | **0.90** |

Scores below the minimum fail the command and the GitHub Actions job. Tighten these after a few green CI baselines if the app is consistently higher.

Reports are written under `evo-lift/.lighthouseci/` (gitignored). Public performance reports go in `public/`. Public SEO reports go in `public-seo/`. Authenticated reports go in `app/`.

## Run locally

From the repository root, with local Supabase already running and env set in `evo-lift/.env.local`:

```bash
cd evo-lift
npm ci
npx puppeteer browsers install chrome
npm run seed:local
npm run build
npm run lighthouse
```

`npm ci` does not leave a Chrome binary that Lighthouse CI can launch. The `browsers install` command downloads the Chrome build Puppeteer expects.

`npm run lighthouse` starts `next start` on `http://127.0.0.1:3000`, runs public performance on `/login`, then public SEO on the five pages above, then the authenticated performance suite, then stops the server.

Optional env:

- `LHCI_BASE_URL` — default `http://127.0.0.1:3000`
- `LHCI_NUMBER_OF_RUNS` — default `1`
- `LHCI_EMAIL` / `LHCI_PASSWORD` — override the demo user

`LHCI_PUBLIC_SUITE=seo` selects the SEO pass inside `lighthouserc.public.cjs`. `npm run lighthouse` sets that for the second public run. Leave it unset to collect `/login` performance only.

## CI

The **Lighthouse** workflow (`.github/workflows/lighthouse.yml`) runs on Node 22 (22.12 or newer, which Puppeteer 25 requires), installs Chrome with `npx puppeteer browsers install chrome`, starts local Supabase, seeds the demo user, builds the app, and runs the same `npm run lighthouse` command on pushes to `master`.

The job fails when a score is below the thresholds above. HTML/JSON reports under `.lighthouseci/` are uploaded as the `lighthouse-reports` workflow artifact (including on failure) so you can inspect a run in the Actions UI.

Chrome is launched with `--no-sandbox` so the job works on GitHub-hosted Ubuntu runners.
