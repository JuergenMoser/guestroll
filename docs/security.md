# Security

Guestroll holds other people's photos, often of children, at private events.
This page lists what it protects, against whom, and how. If you find a gap,
please report it privately (see [SECURITY.md](../SECURITY.md)).

## What is protected

| Asset | Who may access it |
|---|---|
| A guest's photos | That guest (from the browser that took them) and the admins |
| Everyone else's photos | Admins only. Never another guest. |
| Event settings, stats, QR codes | Admins only |
| The event page itself | Anyone with the QR code, plus the access code if one is set |

There is no public gallery and no guest download of other people's photos,
whatever the settings: this is a design decision, not an option.

## How photos stay private

- **No public files.** Photos are stored outside the web root
  (`DATA_DIR/uploads`) and only leave the server through `/api/media/<id>`,
  which checks access on **every** request. A copied URL is useless in another
  browser: answers are identical (`404`) for "doesn't exist" and "not yours".
- **Joining is a cookie, not a link.** Opening an event page writes the event
  into an encrypted guest cookie. Media requests require it, so a photo URL
  pasted into a chat doesn't open anywhere else.
- **Unguessable identifiers.** Photo ids are random UUIDs, event slugs carry
  ~40 bits of randomness. Slugs aren't the security boundary (the cookie is),
  but they keep events from being enumerated.
- **Private caching.** Media responses are `Cache-Control: private`, originals
  `no-store`, so no shared proxy or CDN keeps a copy.
- **Rotating links.** "Generate a new link" changes the slug: the old QR code
  stops working immediately, e.g. after it leaked on social media.
- **Optional access code** per event, hashed with bcrypt.

## Uploads

- Files are identified by their bytes, never by name or `Content-Type`; only
  JPEG, PNG, WebP, HEIC/HEIF, AVIF and GIF are accepted.
- Every image is **re-encoded**: EXIF metadata (GPS position, device serial
  numbers) is removed, and anything appended after the image data is dropped.
- Size is capped while the body streams in, so chunked requests without
  `Content-Length` can't exhaust memory. Images above `MAX_IMAGE_MEGAPIXELS`
  are refused before decoding.
- One upload at a time per guest, so parallel requests can't bypass the
  per-guest quota.

## Authentication

- One admin account, password from `ADMIN_PASSWORD` or generated on first
  start and printed once. There is no public "create the admin" page that a
  stranger could reach first.
- Sessions are encrypted, `HttpOnly`, `SameSite=Lax`, `Secure` in production
  cookies (iron-session). Changing the password signs out every other session.
- Every admin page and API route checks the session itself.
  `tests/routeGuards.test.ts` fails if one is added without the check.

## Abuse

| Limit | Default |
|---|---|
| Admin login | 5 attempts per minute per IP |
| Access code | 10 attempts per minute per guest, 30 wrong codes per minute per event |
| Uploads | 30 per minute per guest, plus the per-guest quota |

The per-event ceiling on wrong codes is a deliberate trade-off: someone flooding
wrong codes can make real guests wait up to a minute, but can't brute-force a
code of 6+ characters (enforced) in any useful time.

## Cross-site requests

Every state-changing request (admin and guest) must carry a matching `Origin`
header, on top of `SameSite` cookies. The app sets `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, a strict `Referrer-Policy`, and a
`Permissions-Policy` that allows the camera only for the app itself. Served
images and SVG files carry a sandboxing Content-Security-Policy.

## Your part

- Serve it over **HTTPS**. Phones need it for the camera, and cookies are
  `Secure` in production.
- Set `TRUST_PROXY=true` behind your reverse proxy, and **only** then.
- Back up `DATA_DIR` and keep it private: it holds every photo and the session
  secret.
- Pin an image version and follow releases for security fixes.
