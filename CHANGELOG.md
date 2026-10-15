# Changelog

Every release, what changed for the people who run Guestroll and the people who
use it. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/). Each release's
notes on GitHub are this file's section for it.

**Upgrading** sections list what to check before updating. Database migrations
always run on their own at startup; take a backup first all the same
(Admin → Settings → Data).

## [Unreleased]

### Added

- Guests can delete their own photos, from the photo itself, at any time.
- The documentation website: every release's docs with a version switcher and
  search, and the wiki generated from the same files.

- Two-step verification (authenticator app codes) for admin accounts, with
  recovery codes; owners can reset it for a lost phone.

- Scheduled backups (node-cron) to a folder or an S3 bucket, with rotation,
  a list to download or restore from, and an alert when one fails.

- Update notifications: the admin shows new releases with their notes; owners
  get an email and a webhook once per version.
- One-click updates from the admin with the optional updater container: a
  backup, the new image, a health check, automatic rollback, and an update
  history listing the migrations each update applied.

- Demo mode (`DEMO_MODE=true`): seeded events, a shared account, a nightly
  reset, nothing sent out. `docker-compose.demo.yml` runs one.

### Changed

- Settings are split into five areas (account, team, notifications, data,
  system), each a page of its own; the list says which area needs attention:
  two-step verification off, no automatic backups, no email server, an update
  waiting.
- The language picker lists each language under its own name with its name in
  the current language beside it ("Italiano, italien"), works from the
  keyboard, and opens upwards near the bottom of the screen. The event form's
  default language reads the same way.

### Security

- Every page carries a nonce-based Content-Security-Policy.
- Photo compression no longer loads a worker script from a CDN: guests'
  browsers never contact a third party.

## [0.3.0] - 2026-10-15

### Added

- **Several admin accounts.** Owners run the instance; organizers only see the
  events assigned to them and can't delete them. Accounts get a generated
  password, shown once.
- **S3-compatible storage** for photos, logos and voice notes (AWS, R2, B2,
  Garage, RustFS…), next to the local folder.
- **Favorites**: star photos, download the favorites as a ZIP, share a gallery
  link limited to them.
- **Photo challenges** guests pick before shooting, with their progress and
  per-challenge stats.
- **Guestbook**: written messages and voice notes for the hosts, moderated,
  exported as a ZIP.
- **Live wall layouts**: one print, a mosaic or a grid, with names, challenges,
  guestbook messages and the QR code in a corner.
- **Duplicate an event** with its settings, look, logo and organizers.
- **Import the photographer's photos** at full quality.
- **Webhooks**: alerts to ntfy, Discord, Slack or a signed JSON endpoint.
- **Backup and restore** from the admin, and automatic deletion of ended events
  after a chosen delay.
- **Frames and filters** drawn on the phone before sending.
- **Slideshow video**: an MP4 of the album, made in the browser.

### Fixed

- Emails and webhooks queued in the same second kept no order.

### Security

- Guest text reaching Slack and Discord notices is escaped: no mentions or
  disguised links.

### Upgrading

- Sign-in now asks for a username. Your existing password becomes the `admin`
  account (or `ADMIN_USERNAME`); signing in with the password alone still works.
- Events, photos and settings are kept; new tables are created at startup.

## [0.2.0] - 2026-10-15

### Added

- **Email** through your SMTP server, set by environment variables or in the
  admin with an encrypted password and a test button.
- **Admin alerts**: photos waiting for approval, an event's summary, failed
  sign-ins, disk almost full.
- **End of the event**: guests who left their address get a gallery link; you
  get a summary. On schedule or with *End the event now*.
- **Gallery links** protected by a password, with an expiry and a downloads
  switch.

### Upgrading

- Events that had already closed are marked as ended, so no end-of-event email
  goes out for past parties.
- New optional variables: `SMTP_*`, `ADMIN_EMAIL`, `SCHEDULER_INTERVAL_SECONDS`.

## [0.1.1] - 2026-10-15

Tagged but never published as an image (its release build stalled and was
cancelled): these changes reached Docker Hub and GHCR with 0.2.0.

### Added

- An install kit (`docker-compose.yml` and `.env.example`) attached to every
  release.

### Security

- The image drops the system font packages and their expat vulnerabilities:
  no known CVE left in the image.

## [0.1.0] - 2026-10-15

First release.

- Guests scan a QR code, the camera opens, photos upload over weak connections
  and only their author sees them.
- Admin: events, moderation, ZIP download, stats, a live wall, a printable
  table card.
- QR code designer with scan-tested presets, logo and caption.
- English, French, Italian and Spanish; light and dark themes.
- One multi-arch Docker image with a `/data` volume.

[Unreleased]: https://github.com/achedon12/guestroll/compare/v0.3.0...develop
[0.3.0]: https://github.com/achedon12/guestroll/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/achedon12/guestroll/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/achedon12/guestroll/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/achedon12/guestroll/releases/tag/v0.1.0
