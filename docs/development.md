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
npm run typecheck   # generates Next's route types first
npm test            # vitest
npm run build
```

CI runs all four, plus a Docker build, on every pull request.

What the tests cover:

| File | What it locks |
|---|---|
| `policy.test.ts` | Every access rule: who sees which photo, in which size |
| `routeGuards.test.ts` | Every admin page and route checks the session; every guest mutation checks the origin |
| `qrScan.test.ts` | Every QR preset and shape is rendered and decoded with ZXing |
| `qr.test.ts` | Style parsing, escaping, logo excavation |
| `request.test.ts` | Client IP and origin rules, the streaming body cap |
| `rateLimit.test.ts`, `validation.test.ts`, `ids.test.ts`, `negotiate.test.ts`, `translate.test.ts` | The rest of the pure modules |

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
