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

## Gallery links

- A link is a 32-character random token **plus** a password (bcrypt). The
  token alone shows a password form, nothing else; unknown, expired and revoked
  links all answer `404`.
- Unlocking writes the link into a separate encrypted cookie (`gr_share`).
  Access is re-checked on every request, so revoking or expiring a link stops
  it immediately, including for browsers that already opened it.
- Links see visible photos only, or the visible favorites for a
  favorites-only link. Originals and the ZIP need the link's *downloads*
  switch, and a link's ZIP holds what that link shows. A link never grants
  uploading. Which photos are favorites is never sent to guests or links.
- Wrong passwords: 10 attempts per minute per IP and link, and a per-link
  ceiling across all IPs.
- Generated passwords (`xxxx-xxxx-xxxx-xxxx`, ~82 bits) are shown once and
  never stored in clear.

## Webhooks

- Only owners manage them. URLs and signing secrets are encrypted at rest
  (a Discord or Slack webhook URL is a credential) and never sent back to the
  browser, which only sees a masked hint.
- Requests are plain `POST`s with a 10-second timeout and no redirects
  followed. Owners may point them at the local network on purpose (Home
  Assistant), so treat the owner role as trusted with outbound requests.
- Notices carry event names, counts and admin links, never photos, guest
  emails or message audio.

## Guestbook

- Messages are private like photos: a guest reads and hears only their own,
  the event's admins all of them, gallery links the approved ones and only if
  the hosts share the guestbook. Voice notes leave the server through
  `/api/messages/<id>/audio`, checked on every request.
- Voice notes are identified by their bytes (Ogg/Opus, WebM, MP4/AAC, MP3)
  and stored as recorded: re-encoding would need ffmpeg in the image. They are
  only served with an audio type, `no-store`, under a sandboxing CSP. Browser
  recordings carry no location.
- 3 MB per note, 500 characters per text, 20 messages per guest and event,
  10 per minute. The microphone is only requested when a guest taps *Record*.

## Email

- Guest addresses are **opt-in**, offered only on events whose hosts asked for
  them, used for that event's album only, and deleted with the event. A guest
  can remove theirs from the page.
- The SMTP password set in the admin is encrypted at rest and never sent back
  to the browser.
- Every value in an email is HTML-escaped; each email has a plain-text twin.
- Choosing to keep the password out of guests' emails means a forwarded email
  doesn't open the album.

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

- The first owner account (`admin`, or `ADMIN_USERNAME`) gets its password
  from `ADMIN_PASSWORD`, or one generated on first start and printed once.
  There is no public sign-up page that a stranger could reach first: other
  accounts are created by an owner, with a generated password shown once.
- **Owners** manage every event, the accounts, email and instance settings.
  **Organizers** only reach the events assigned to them, and can't delete them.
  An event outside an organizer's scope answers `404`, exactly like a missing
  one, through the admin API and `/api/media` alike. The instance always keeps
  at least one owner.
- A wrong username takes as long to refuse as a wrong password (a bcrypt
  comparison runs either way), so usernames can't be probed by timing.
- Sessions are encrypted, `HttpOnly`, `SameSite=Lax`, `Secure` in production
  cookies (iron-session) that carry the account and its session version.
  Changing or resetting a password signs that account out everywhere;
  deleting an account ends its sessions at once.
- Every admin page and API route checks the session itself, and every route
  under an event id checks the event is in the admin's scope.
  `tests/unit/routeGuards.test.ts` fails if one is added without the check.
  `tests/routeGuards.test.ts` fails if one is added without the check.

## Abuse

| Limit | Default |
|---|---|
| Admin login | 5 attempts per minute per IP |
| Access code | 10 attempts per minute per guest, 30 wrong codes per minute per event |
| Uploads | 30 per minute per guest, plus the per-guest quota |
| Gallery link password | 10 attempts per minute per IP and link |
| Test email | 5 per minute |

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
