# Architecture

One Next.js app, one process, one SQLite file, one folder of photos.

```
                    ┌────────────────────── Guestroll (Node.js) ───────────────────────┐
 phone ──QR code──▶ │ /e/[slug]          guest page (server component + client app)   │
                    │ /api/e/[slug]/*    join, unlock, name, upload, own photos       │
                    │ /api/media/[id]    the only way a photo leaves the server       │
 laptop ──────────▶ │ /admin/*           admin pages                                  │
                    │ /api/admin/*       events, moderation, QR, archives, stats      │
                    │                                                                  │
                    │ lib/policy.ts ◀── every access decision, pure and tested        │
                    │ lib/*        ──▶ SQLite (Drizzle)   ──▶ DATA_DIR/guestroll.db   │
                    │              ──▶ files               ──▶ DATA_DIR/uploads/       │
                    └──────────────────────────────────────────────────────────────────┘
```

## Request flow: a guest takes a photo

1. The QR code opens `/e/<slug>`. The server component looks the event up; if
   the browser hasn't joined it yet, it renders `AutoJoin` (no code) or
   `UnlockScreen` (code). Joining writes the event id into the encrypted
   `gr_guest` cookie.
2. The guest page renders the capture component chosen for the event
   (`components/capture/registry.ts`) inside `CaptureHost`.
3. The capture component calls `onFiles(files)`. `useUploadQueue` compresses
   each file in the browser, then uploads it with progress, one at a time,
   retrying on network errors and waiting while offline.
4. `POST /api/e/<slug>/photos` checks the origin, the join, the upload state
   and quota (`lib/policy.ts`), takes a per-guest lock, reads the body with a
   size cap, sniffs and re-encodes the image (`lib/images/process.ts`) into
   three variants, writes them under `DATA_DIR/uploads/<event>/` and inserts
   the row.
5. The photo comes back as a `PhotoDto`: ids and dimensions, never a path.
   Thumbnails load from `/api/media/<id>?v=thumb`, which re-checks access.

## Code layout

```
src/
├── app/                      routes (Next.js App Router)
│   ├── e/[slug]/             guest page and its social card
│   ├── admin/                login, (panel)/ pages, poster, live wall
│   └── api/                  route handlers, thin: validate, ask policy, call lib
├── components/
│   ├── ui/                   design-system primitives (Button, Field, SegmentedControl…)
│   ├── capture/              swappable capture components and their contract
│   ├── upload/               CaptureHost, upload queue, exposure counter, prints tray
│   ├── guest/                guest page pieces
│   └── admin/                admin pieces (event-form/, moderation/, qr/…)
└── lib/
    ├── policy.ts             all access rules, no I/O
    ├── validation.ts         request body parsing, no I/O
    ├── db/                   Drizzle schema and client (migrations in /drizzle)
    ├── auth/                 admin password, sessions, page guard
    ├── security/             rate limiter, request helpers, ids
    ├── images/               upload and logo processing (sharp)
    ├── storage/              file paths and I/O
    ├── qr/                   style parsing, the SVG renderer, server export
    ├── i18n/                 messages (en, fr, it, es), locale resolution
    └── events.ts, photos.ts, stats.ts, archive.ts   data access
```

Two rules keep this maintainable:

- **Access rules live in `lib/policy.ts` only.** Routes ask it; they never
  re-derive a rule inline. The SQL filter in `listPhotos` mirrors
  `canViewPhoto` and is the one exception, commented as such.
- **Browser code never imports server modules.** Anything shared with client
  components lives in modules without Node imports (`lib/constants.ts`,
  `lib/qr/render.ts`, `lib/i18n/messages.ts`). Server-only modules import
  `server-only` so a mistake fails the build.

## Data

| Table | Holds |
|---|---|
| `events` | Settings, access-code hash, QR style (JSON), logo version |
| `photos` | One row per photo: event, guest id, optional name, size, status, download count |
| `activity` | Append-only log behind every stat (view, upload, download, failed code…) |
| `settings` | Key/value: admin password hash and its version |

Guests have no table: a guest is a random id in their cookie. Their name is
copied onto each photo they send.

Files: `uploads/<event-id>/<photo-id>.{original.jpg,display.webp,thumb.webp}`
and `uploads/<event-id>/logo.png`.

## Choices worth knowing

- **SQLite in WAL mode** handles a wedding's burst of uploads comfortably and
  makes backups a file copy. The flip side: one process, no horizontal scaling.
  That's also why the rate limiter is in memory.
- **Re-encoding every upload** costs CPU but removes GPS metadata and any
  payload hidden in the file.
- **One upload at a time per guest**, enforced on both sides, keeps quotas
  exact and phones responsive.
- **The QR renderer is pure** and shared by the live preview and the server
  export, so the downloaded file matches the preview.
