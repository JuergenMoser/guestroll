# Security

Guestroll holds other people's photos, often of children, at private events.
This page lists what it protects, against whom, and how. If you find a gap,
please report it privately (see [SECURITY.md](../SECURITY.md)).

## What is protected

| Asset | Who may access it |
|---|---|
| A guest's photos | That guest (from the browser that took them) and the admins |
| Everyone else's photos | Admins only, unless the hosts share the album (below) |
| Event settings, stats, QR codes | Admins only |
| The event page itself | Anyone with the QR code, plus the access code if one is set |

By default there is no shared gallery: each guest sees their own photos and
nothing else. The hosts can **share the album** with the guests of an event,
from the start or once it has ended. Guests who joined the event then also see
the others' **approved** photos, in screen size: never the pending or hidden
ones, never the originals, and no download button for them. The guest page
says which mode is on. It is off by default, per event, and leaves gallery
links unchanged.

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
- **Guests can take their photos back**, at any time, even after the event:
  deleting one removes its files, from the album, the gallery links and the
  wall. Only the browser that sent it can (same guest cookie).

## Photo booth

- The booth link carries a 24-character random key (about 118 bits). Whoever
  has it can send photos to the event, without its access code and without the
  per-guest limit: keep it on the booth's device.
- The key is checked in constant time, and again on every photo: a new link or
  *Turn off* stops a device set up with the old one at once (its later photos
  count as an ordinary guest's). A duplicated event never inherits it.
- The page is `noindex` and sends no referrer.

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

## Updates

- The update check is one anonymous `GET` to GitHub's API every 12 hours
  (`UPDATE_CHECK=false` turns it off). Nothing about the instance is sent.
- The optional updater holds the Docker socket, which is root on the host. It
  publishes no port, requires a 24+ character token compared in constant time,
  accepts only a `x.y.z` version, only ever replaces `UPDATER_CONTAINER`, and
  only pulls that container's own image repository at the requested version.
  The app only asks it for the version GitHub announced, after a backup.
- A new version that doesn't pass its health check is replaced by the previous
  container automatically.

## Backups

- Only owners download or restore backups. A backup holds everything,
  including password hashes and the generated session secret: store it like
  the server itself.
- A restore checks the whole archive before changing anything: the manifest,
  a real SQLite file, and file names in the shapes the app writes (paths
  climbing out with `../` are refused). An archive that fails these checks
  leaves the instance untouched.

## Webhooks

- Only owners manage them. URLs and signing secrets are encrypted at rest
  (a Discord or Slack webhook URL is a credential) and never sent back to the
  browser, which only sees a masked hint.
- Requests are plain `POST`s with a 10-second timeout and no redirects
  followed. They go to public addresses only: a URL whose host is or resolves
  to a private, loopback or link-local address (the server itself, the local
  network, cloud metadata, the updater) fails with a message saying so,
  however the address is written (IPv4 inside IPv6 included). The check is
  made by the connection's own DNS lookup, on the address it then connects to,
  so a name can't answer differently in between. To reach a Home Assistant or
  ntfy on your own network, set `WEBHOOK_ALLOW_PRIVATE=true`.
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
  10 per minute (see *Abuse* for the limits that hold without a cookie). The microphone is only requested when a guest taps *Record*.

## Email

- Guest addresses are **opt-in**, offered only on events whose hosts asked for
  them, used for that event's album only, and deleted with the event. A guest
  can remove theirs from the page.
- The SMTP password set in the admin is encrypted at rest and never sent back
  to the browser. It is only kept for the server and account it was typed for:
  changing either asks for it again, so another owner can't redirect it to a
  server of their own.
- With a user set, the login only goes over an encrypted connection (implicit
  TLS, or STARTTLS made mandatory), so it can't be read by stripping STARTTLS
  on the way. `SMTP_ALLOW_PLAIN=true` for a relay without TLS on a trusted
  network.
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
  are refused before decoding, HEIC included: its size is read from the file's
  header before the decoder allocates anything.
- One upload at a time per guest, so parallel requests from one guest can't
  bypass the per-guest quota. A guest is a cookie, though: a script that drops
  it is a new guest every time. What holds then is the per-event and per-address
  limits below; a memory budget for uploads being received, counted in bytes
  as they arrive (a connection trickling its upload in costs next to nothing,
  a burst of fast ones is asked to retry); at most 3 images decoded at once
  with 12 waiting; and a refusal once the disk has less than 512 MB free.
  Guests' phones retry a busy server on their own.

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
- **Two-step verification** (TOTP, RFC 6238) can be turned on per account
  from Settings: after the password, a code from an authenticator app. The
  secret is encrypted at rest, a code can't be used twice, codes are limited to
  5 tries a minute per account, and the half-signed-in state expires after 5
  minutes. Ten single-use recovery codes (stored hashed) cover a lost phone;
  an owner can also reset another account's verification. Turning it off
  takes the password and a code.
- A wrong username takes as long to refuse as a wrong password (a bcrypt
  comparison runs either way), so usernames can't be probed by timing.
- Sessions are encrypted, `HttpOnly`, `SameSite=Lax`, `Secure` in production
  cookies (iron-session) that carry the account and its session version.
  Changing or resetting a password signs that account out everywhere;
  deleting an account ends its sessions at once.
- Every admin page and API route checks the session itself, and every route
  under an event id checks the event is in the admin's scope.
  `tests/unit/routeGuards.test.ts` fails if one is added without the check.

## Abuse

| Limit | Default |
|---|---|
| Admin login | 5 wrong passwords per minute per address and username, 30 wrong passwords per minute per address, 30 attempts per minute per address (behind `TRUST_PROXY`) |
| Access code | 10 attempts per minute per guest, 30 wrong codes per minute per event, in-flight guesses included |
| Uploads | 30 per minute per guest, 300 per event, 120 per address (behind `TRUST_PROXY`), plus the per-guest quota |
| Guestbook | 10 messages per minute per guest, 60 per event, 30 per address (behind `TRUST_PROXY`) |
| Gallery link password | 10 attempts per minute per IP and link |
| Test email | 5 per minute |

Wrong codes and passwords are counted before they are checked, then given back
when they turn out right: a burst of parallel guesses all counts. A successful
sign-in only clears the limits of the account that signed in. There is no
ceiling per username across addresses: anyone could then lock a known account
out from anywhere.

Without `TRUST_PROXY`, every client looks like the same address to the app, so
per-address limits are shared by everyone; behind a reverse proxy, turn it on.

The per-event ceiling on wrong codes is a deliberate trade-off: someone flooding
wrong codes can make real guests wait up to a minute, but can't brute-force a
code of 6+ characters (enforced) in any useful time.

## Cross-site requests

Every state-changing request (admin and guest) must carry a matching `Origin`
header, on top of `SameSite` cookies. The app sets `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, a strict `Referrer-Policy`, and a
`Permissions-Policy` that allows the camera and microphone only for the app
itself. When `PUBLIC_URL` is `https://`, pages also send
`Strict-Transport-Security` (one year, without subdomains).

Every page carries a **Content-Security-Policy** with a fresh nonce
(`src/proxy.ts`): only scripts Next.js marked with it run, so injected markup
can't execute anything, and the page can only talk to its own origin. Styles
stay `unsafe-inline` (React writes `style` attributes; a style can't run code).
Served images, voice notes and SVG files carry their own sandboxing policy. The
app loads nothing from third parties: no CDN, no fonts or analytics from
elsewhere.

## Your part

- Serve it over **HTTPS**. Phones need it for the camera, and cookies are
  `Secure` in production.
- Set `TRUST_PROXY=true` behind your reverse proxy, and **only** then.
- Let the proxy buffer request bodies before passing them on (nginx does by
  default, `proxy_request_buffering on`): a client that sends most of an
  upload and then stalls then ties up the proxy, not Guestroll's memory. The
  app cuts such uploads after 2 minutes on its own, but a client reconnecting
  over and over could keep its upload budget busy.
- Back up `DATA_DIR` and keep it private: it holds every photo and the session
  secret.
- Pin an image version and follow releases for security fixes.
