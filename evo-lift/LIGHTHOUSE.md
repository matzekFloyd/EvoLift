# Lighthouse performance checks

Catches load and runtime cost regressions on the surfaces lifters use most.

## Surfaces

| URL | Auth | Why |
| --- | --- | --- |
| `/login` | Logged out | First paint for new and returning lifters |
| `/` (Home) | Local demo user | Main shell after login |
| `/insights` | Local demo user | Heavier charts and insight panels |

Login uses the local demo account from `npm run seed:local` (`demo@example.com` / `demo1234`) unless `LHCI_EMAIL` / `LHCI_PASSWORD` are set.

## Pass / fail thresholds

Desktop Lighthouse **performance** category (one run in CI; raise `LHCI_NUMBER_OF_RUNS` locally if you want median stability):

| Surface | Minimum score |
| --- | --- |
| `/login` | **0.70** |
| Home `/` | **0.55** |
| `/insights` | **0.50** |

Scores below the minimum fail the command and the GitHub Actions job. Tighten these after a few green CI baselines if the app is consistently higher.

Reports are written under `evo-lift/.lighthouseci/` (gitignored).

## Run locally

From the repository root, with local Supabase already running and env set in `evo-lift/.env.local`:

```bash
cd evo-lift
npm ci
npm run seed:local
npm run build
npm run lighthouse
```

`npm run lighthouse` starts `next start` on `http://127.0.0.1:3000`, runs the public suite, then the authenticated suite, then stops the server.

Optional env:

- `LHCI_BASE_URL` — default `http://127.0.0.1:3000`
- `LHCI_NUMBER_OF_RUNS` — default `1`
- `LHCI_EMAIL` / `LHCI_PASSWORD` — override the demo user

## CI

The **Lighthouse** workflow (`.github/workflows/lighthouse.yml`) starts local Supabase, seeds the demo user, builds the app, and runs the same `npm run lighthouse` command on pull requests and pushes to `master`.
