# Development

## Run locally

```bash
git clone https://github.com/achedon12/guestroll && cd guestroll
nvm use            # Node 22, see .nvmrc
npm ci
echo "ADMIN_PASSWORD=dev-password-123" > .env.local
npm run dev        # http://localhost:3000
```

Fill it with demo events and photos (through the public API, in another
terminal):

```bash
BASE_URL=http://localhost:3000 ADMIN_PASSWORD=dev-password-123 npm run seed:demo
```

To try the camera on a real phone, the page must be HTTPS. The quickest way is
a tunnel (`cloudflared tunnel --url http://localhost:3000`) or
`next dev --experimental-https` on your LAN.

## Checks

```bash
npm run lint
npm run typecheck      # generates Next's route types first
npm test               # unit + integration (Vitest)
npm run test:coverage  # the same, with a coverage report in coverage/
npm run build
npm run test:e2e       # functional tests on the production build (Playwright)
```

`npm run test:e2e` starts the production build on port 3210 with a temporary
data folder, so it never touches your data. Locally it uses your installed
Chrome; in CI, the Chromium installed by `npx playwright install`.

### Three layers of tests

| Layer | Where | What it runs against |
|---|---|---|
| Unit | `tests/unit/` | Pure modules: access policy, validation, rate limiter, QR rendering… |
| Integration | `tests/integration/` | Real SQLite in a temp folder, real images through sharp, real ZIPs, QR codes decoded by ZXing |
| Functional | `tests/e2e/api/` | The HTTP API of a running production build: guest and admin scenarios, security, quotas |
| Browser | `tests/e2e/browser/` | Real journeys: a guest on a phone, an admin on a desktop |

Unit-level files:

| File | What it locks |
|---|---|
| `policy.test.ts` | Every access rule: who sees which photo, in which size |
| `routeGuards.test.ts` | Every admin page and route checks the session; every guest mutation checks the origin |
| `qrScan.test.ts` | Every QR preset and shape is rendered and decoded with ZXing |
| `qr.test.ts` | Style parsing, escaping, logo excavation |
| `request.test.ts` | Client IP and origin rules, the streaming body cap |
| `rateLimit.test.ts`, `validation.test.ts`, `ids.test.ts`, `negotiate.test.ts`, `translate.test.ts` | The rest of the pure modules |

## Branches and CI

`develop` is the default branch, where pull requests land; `main` is
production. Every change on either branch runs:

| Workflow | What it does |
|---|---|
| Quality | Lint, types, production build |
| Tests | Vitest with coverage, then Playwright on a production build |
| Security | CodeQL (code and workflows) and `npm audit` on production dependencies, plus a weekly run |
| Docker image | Builds the image, runs it on a custom port and user, uploads a photo end to end |
| Workflows | actionlint and zizmor on `.github/` |

**Publish to production** (manual) fast-forwards `main` to `develop` once
Quality and Tests passed there; **Align develop** carries anything that lands on
`main` back to `develop`. Tagging `main` with `vX.Y.Z` runs **Release**: the
multi-arch image on GHCR (and Docker Hub when its secrets are set) and a GitHub
release with generated notes. **Website** deploys `site/` to GitHub Pages.

Housekeeping: Dependabot (grouped, one-week cooldown), stale issues, a welcome
message on first pull requests, a "merge conflict" label, and pull requests sent
back to draft when changes are requested.

## Database changes

Edit `src/lib/db/schema.ts`, then:

```bash
npm run db:generate -- --name short_description
```

Commit the generated folder under `drizzle/`. Migrations run automatically on
startup. Never edit a migration that has been released.

## Conventions

- TypeScript strict, ESM, the `@/` alias for `src/`.
- Access rules go in `lib/policy.ts` with a test. Routes stay thin.
- UI text goes in `lib/i18n/messages.ts`, in all four languages.
- Colors only through the tokens in `globals.css` (`bg-surface`,
  `text-ink-muted`…), so both themes keep working.
- Comments explain *why*, not *what*.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org).

The visual direction is described in [design-prompt.md](design-prompt.md):
read it before changing the interface.
