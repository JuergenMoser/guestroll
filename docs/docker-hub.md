<p align="center">
  <img src="https://raw.githubusercontent.com/achedon12/guestroll/main/docs/assets/logo.png" alt="Guestroll" width="96" />
</p>

<h1 align="center">Guestroll</h1>

<p align="center"><strong>Every guest's photos, in one place.</strong><br />
Guests scan a QR code on the table, their phone's camera opens, and every photo lands in your private album.<br />
Self-hosted. No app to install, no account to create.</p>

<p align="center">
  <a href="https://achedon12.github.io/guestroll/">Website</a> |
  <a href="https://github.com/achedon12/guestroll">GitHub</a> |
  <a href="https://github.com/achedon12/guestroll/wiki">Documentation</a> |
  <a href="https://youtu.be/MEuvBB-wVI8">Video tour</a>
</p>

![Guest page on a phone next to the admin dashboard](https://raw.githubusercontent.com/achedon12/guestroll/main/docs/assets/screenshots/hero.png)

## Quick start

```bash
docker run -d --name guestroll \
  --restart unless-stopped \
  -p 3000:3000 \
  -v guestroll-data:/data \
  -e ADMIN_PASSWORD='choose-a-long-password' \
  -e PUBLIC_URL='https://photos.example.com' \
  achedon12/guestroll:latest
```

Open `/admin`, sign in, create an event and print its QR code.

> **HTTPS is required on the day.** Phone browsers only open the camera on HTTPS
> pages: put Guestroll behind a reverse proxy with a certificate (Caddy, Traefik,
> nginx: ready-made configs in the
> [deployment guide](https://github.com/achedon12/guestroll/wiki/Deployment)).

No `ADMIN_PASSWORD`? One is generated on first start and printed once in
`docker logs guestroll`.

## Docker Compose

```yaml
services:
  guestroll:
    image: achedon12/guestroll:latest
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"   # reachable through your reverse proxy only
    environment:
      PUBLIC_URL: https://photos.example.com
      ADMIN_PASSWORD: change-me-please
      TRUST_PROXY: "true"       # only behind a proxy you control
      TZ: Europe/Paris
    volumes:
      - ./data:/data
```

The repository ships a [`docker-compose.yml`](https://github.com/achedon12/guestroll/blob/main/docker-compose.yml)
driven entirely by a `.env` file.

## What it does

**For guests**: the camera opens straight from the QR code; uploads survive a
crowded room's 4G (resized on the phone, queued, retried, resumed offline);
they only ever see their own photos; English, French, Italian and Spanish;
light and dark themes.

**For hosts**: as many events as you like, each with its own link, QR code,
color and logo; optional access code; moderation (publish then hide, or approve
first); a **live wall** for a projector; a **QR code designer** whose presets are
all scan-tested; a printable A4 table card; one-click ZIP of the whole album;
stats; **gallery links** protected by a password; **automatic emails** at
the end of an event (summary for you, album link for guests who opted in) and
admin alerts, through your own SMTP server.

| Guest page | Contact sheet | QR code designer |
|---|---|---|
| ![Guest page](https://raw.githubusercontent.com/achedon12/guestroll/main/site/assets/img/guest-light.webp) | ![Moderation](https://raw.githubusercontent.com/achedon12/guestroll/main/site/assets/img/moderation-light.webp) | ![QR designer](https://raw.githubusercontent.com/achedon12/guestroll/main/site/assets/img/qr-light.webp) |

## Tags

| Tag | Meaning |
|---|---|
| `latest` | Newest release |
| `0`, `0.4` | Newest release in that major / minor line |
| `0.4.0` | An exact release: pin this in production |

Every tag is multi-arch: `linux/amd64` and `linux/arm64` (a Raspberry Pi 4/5
works). Images carry provenance and an SBOM. The same tags are published on
GHCR as `ghcr.io/achedon12/guestroll`.

## Configuration

Everything is an environment variable; all are optional.

| Variable | Default | |
|---|---|---|
| `PUBLIC_URL` | request host | Address encoded in QR codes, e.g. `https://photos.example.com` |
| `ADMIN_PASSWORD` | generated | Password of the `admin` owner account (printed once in the logs when generated) |
| `PORT` | `3000` | Listening port inside the container; the health check follows it |
| `PUID` / `PGID` | `1001` | Owner of `/data`: match your host user for bind mounts |
| `TZ` | `UTC` | Time zone of the stats, e.g. `Europe/Paris` |
| `DEFAULT_LOCALE` | `en` | `en`, `fr`, `it` or `es`, when the browser's language isn't supported |
| `DETECT_BROWSER_LOCALE` | `true` | `false` to always start in `DEFAULT_LOCALE` |
| `TRUST_PROXY` | `false` | `true` behind a reverse proxy you control |
| `MAX_UPLOAD_MB` | `25` | Largest accepted photo |
| `SESSION_SECRET` | generated | 32+ characters; stored in `/data` when generated |
| `SMTP_HOST` / `SMTP_PORT` | none / `587` | Your SMTP server; turns email on (also settable in the admin) |
| `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | none | Credentials and sender |
| `ADMIN_EMAIL` | none | Where alerts and event summaries go |
| `STORAGE_DRIVER` | `local` | `s3` to keep photos in an S3-compatible bucket (`S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`) |

Full reference: [Configuration](https://github.com/achedon12/guestroll/wiki/Configuration).

## Volume, port, health

- **`/data`**: the SQLite database and every photo. Back it up.
- **Port `3000`** (or `PORT`): HTTP.
- **Health check**: `GET /api/health` returns `200 {"status":"ok"}`; the image
  declares it as its `HEALTHCHECK`.
- The server runs as an unprivileged user (`PUID`:`PGID`) on Alpine, with only
  the Node.js binary and the app in the image.

## Privacy

Photos are never public files: every request is checked against the guest's own
cookie, guests never see each other's photos, and GPS and camera metadata are
stripped from every upload. Details:
[Security](https://github.com/achedon12/guestroll/wiki/Security).

## License

MIT. Source, issues and contributions:
[github.com/achedon12/guestroll](https://github.com/achedon12/guestroll).
