<div align="center">

<img src="docs/assets/logo.svg" alt="" width="80" height="80" />

# Guestroll

**Every guest's photos, in one place.**
Guests scan a QR code, their camera opens, and every picture lands in your private album.
Self-hosted. No app to install, no account to create.

[![Tests](https://github.com/achedon12/guestroll/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/achedon12/guestroll/actions/workflows/tests.yml)
[![Quality](https://github.com/achedon12/guestroll/actions/workflows/quality.yml/badge.svg?branch=main)](https://github.com/achedon12/guestroll/actions/workflows/quality.yml)
[![Security](https://github.com/achedon12/guestroll/actions/workflows/security.yml/badge.svg?branch=main)](https://github.com/achedon12/guestroll/actions/workflows/security.yml)
[![Release](https://img.shields.io/github/v/release/achedon12/guestroll)](https://github.com/achedon12/guestroll/releases)
[![GitHub downloads](https://img.shields.io/github/downloads/achedon12/guestroll/total?label=GitHub%20downloads)](https://github.com/achedon12/guestroll/releases)
[![Docker Hub pulls](https://img.shields.io/docker/pulls/achedon12/guestroll?label=Docker%20Hub%20pulls)](https://hub.docker.com/r/achedon12/guestroll)
[![Image size](https://img.shields.io/docker/image-size/achedon12/guestroll/latest?label=image)](https://hub.docker.com/r/achedon12/guestroll)
[![Stars](https://img.shields.io/github/stars/achedon12/guestroll?style=flat)](https://github.com/achedon12/guestroll/stargazers)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

[Website](https://achedon12.github.io/guestroll/) | [Quick start](#quick-start) | [Features](#features) | [Documentation](https://github.com/achedon12/guestroll/wiki)

<img src="docs/assets/screenshots/hero.png" alt="Guest page on a phone next to the admin dashboard" width="900" />

</div>

---

At a wedding, a birthday or a company party, the best photos end up scattered
across a hundred phones and never get shared. Guestroll fixes that with one QR
code on each table:

1. **Scan.** The guest's phone opens a page, not an app store.
2. **Shoot.** The camera opens straight away. One tap, and the photo is sent.
3. **Done.** It's in your album, with the guest's name, ready to download as a ZIP.

You run it yourself, on your own server, with one Docker command. The photos
never leave your machine.

## Watch the tour

<a href="https://youtu.be/MEuvBB-wVI8"><img src="docs/assets/video-thumbnail.png" alt="Guestroll presentation video on YouTube, about three minutes" width="640" /></a>

Three minutes: a guest taking photos, the hosts' admin, the QR code designer, the live wall, and installing it.

## Features

**For guests**
- 📷 Camera opens directly from the QR code. iPhone and Android, no install.
- 🔁 Uploads keep going on a weak 4G connection: resized on the phone, queued, retried, resumed when back online.
- 🙋 Optional name prompt so the hosts know who took what.
- 📝 **Guestbook**: a few words or a voice note for the hosts, moderated, exported as a ZIP.
- 🎯 **Photo challenges**: prompts guests pick before shooting ("The dance floor", "The cake"), with their progress.
- 🔒 Guests only ever see their own photos. The album belongs to the hosts.
- 🌍 English, French, Italian and Spanish, picked from the phone's language, switchable on the page.
- 🌗 Light and dark themes.

**For hosts**
- 🗂️ As many events as you want, each with its own link, QR code and accent color.
- 👥 **Several admin accounts**: owners run everything, organizers only the events you give them.
- 🔐 Optional access code per event, so a QR code shared on social media isn't enough.
- ✅ Moderation: publish right away and hide later, or approve each photo first.
- ⭐ **Favorites**: star your picks for a "best of" ZIP, or a gallery link that only shows them.
- 📺 **Live wall** for a projector or TV: one print at a time, a mosaic or a grid, with names, challenges, guestbook messages and the QR code in a corner.
- 🎨 **QR code designer**: colors, dot and corner shapes, your logo in the middle, a caption. Every preset is scan-tested.
- 🖨️ Printable A4 table card, plus PNG (up to 4096 px) and SVG exports.
- 🗣️ A default language per album, for a wedding in Italy with Italian guests.
- ⏰ Uploads close on a schedule, with an optional per-guest photo limit.
- 📦 One-click ZIP of the whole album, streamed (works for albums of several GB).
- 📊 Stats: uploads over time, views, downloads, storage, top photographers.
- 🔑 **Gallery links**: a private link + password to the album, for family or for guests afterwards. Expiry, view-only or downloads, revocable.
- ✉️ **Automatic emails** through your SMTP server: when uploads close, a summary for you and the album link for guests who asked for it. You choose what goes out.
- 🔔 Admin alerts: photos waiting for approval, failed sign-ins, disk almost full.

**For whoever runs the server**
- 🐳 A single container, multi-arch (`amd64`, `arm64`, so a Raspberry Pi works too).
- 🗃️ No external database: SQLite plus a folder of files in one volume, or photos in any **S3-compatible bucket** (AWS, R2, B2, Garage…).
- 🛡️ Private by design: photos are never public files, and every request is checked. See [Security](docs/security.md).
- 🧩 **Swappable capture component**: ship your own camera UI without touching the upload code. See [Customization](docs/customization.md).
- ⚙️ Configured with environment variables only: port, data path, `PUID`/`PGID`, time zone, limits.

## Quick start

```bash
docker run -d --name guestroll \
  -p 3000:3000 \
  -v guestroll-data:/data \
  -e ADMIN_PASSWORD='choose-a-long-password' \
  -e PUBLIC_URL='https://photos.example.com' \
  ghcr.io/achedon12/guestroll:latest
```

Open `http://localhost:3000/admin`, sign in, create an event and print its QR code.

> [!IMPORTANT]
> Phone browsers only open the camera on **HTTPS** pages. Put Guestroll behind a
> reverse proxy with a certificate before the event. The
> [deployment guide](docs/deployment.md) has copy-paste setups for Caddy, Traefik
> and nginx.

### With Docker Compose

Every [release](https://github.com/achedon12/guestroll/releases/latest) has an
install kit, `guestroll-vX.Y.Z-compose.zip`: a `docker-compose.yml` pinned to
that version and a commented `.env.example`. The same files are in this
repository.

1. Copy `.env.example` to `.env` and fill in at least `PUBLIC_URL` and `ADMIN_PASSWORD`.
2. Start it: `docker compose up -d`
3. Open `PUBLIC_URL/admin`, sign in as `admin`, create an event and print its QR code.

Every setting is described in [Configuration](docs/configuration.md).
Sign in at `/admin` as `admin`. Forgot to set `ADMIN_PASSWORD`? A password is
generated on first start and printed once in `docker logs guestroll`.

## Screenshots

| Guest page | Dark theme | Contact sheet |
|---|---|---|
| <img src="docs/assets/screenshots/guest.png" alt="Guest page: the camera in the event color, an exposure counter, the guest's own prints" width="260" /> | <img src="docs/assets/screenshots/guest-dark.png" alt="Guest page in the dark theme" width="260" /> | <img src="docs/assets/screenshots/moderation.png" alt="Moderation contact sheet with three photos selected" width="260" /> |

| QR code designer | Live wall |
|---|---|
| <img src="docs/assets/screenshots/share.png" alt="QR code designer with a logo, rounded dots and a caption" width="400" /> | <img src="docs/assets/screenshots/wall.png" alt="Full-screen live wall showing a print credited to its photographer" width="400" /> |

## Documentation

| | |
|---|---|
| [Getting started](docs/getting-started.md) | Install, first event, the day of the event |
| [Deployment](docs/deployment.md) | Docker, Compose, reverse proxies, HTTPS, backups, upgrades |
| [Configuration](docs/configuration.md) | Every environment variable |
| [Admin guide](docs/admin-guide.md) | Events, moderation, sharing, live wall, stats |
| [Customization](docs/customization.md) | Replace the capture component, theme, translations |
| [Security](docs/security.md) | Threat model and every protection in place |
| [Architecture](docs/architecture.md) | How the code is organised |
| [HTTP API](docs/api.md) | Routes, payloads and error codes |
| [Development](docs/development.md) | Run locally, tests, conventions |

## How it compares

|  | Guestroll | Hosted SaaS apps | Shared cloud album |
|---|---|---|---|
| Price | Free | Paid per event or subscription | Free |
| Your photos stay on | Your server | Their servers | Google / Apple |
| Guests need an account | No | No | Often |
| Camera opens from the QR code | Yes | Yes | No |
| Live wall | Yes | Depends on the plan | No |
| Open source | MIT | No | No |

## Contributing

Issues and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md)
first. It takes two minutes and explains the few rules that keep the project secure.

If Guestroll saved your wedding photos, a ⭐ helps other people find it.

## License

[MIT](LICENSE) © achedon12
