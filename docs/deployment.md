# Deployment

## Requirements

- Docker 20.10+ (or Node.js 22.12+ to run without Docker)
- About 256 MB of RAM. Image processing peaks at ~150 MB per upload in flight.
- Disk space for the photos: about 3 MB per photo (original plus two previews)
- A domain name with HTTPS (required by phone cameras)

Images are published for `linux/amd64` and `linux/arm64` on
[GHCR](https://github.com/achedon12/guestroll/pkgs/container/guestroll) (`ghcr.io/achedon12/guestroll`)
and [Docker Hub](https://hub.docker.com/r/achedon12/guestroll) (`achedon12/guestroll`), with the same tags.

| Tag | Meaning |
|---|---|
| `latest` | Newest release |
| `1`, `1.2` | Newest release in that major / minor line |
| `1.2.3` | An exact release. Pin this in production. |

## Docker Compose

```yaml
services:
  guestroll:
    image: ghcr.io/achedon12/guestroll:1
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000" # only reachable through the reverse proxy
    environment:
      PUBLIC_URL: https://photos.example.com
      ADMIN_PASSWORD: ${GUESTROLL_ADMIN_PASSWORD}
      TRUST_PROXY: "true"
    volumes:
      - ./data:/data
```

With a bind mount (`./data`), set `PUID` and `PGID` to the owner of that folder
(`id -u`, `id -g`): the container hands the folder to that user on start, then
drops root and runs the server as them. Run with `--user` to skip that step
entirely and manage permissions yourself.

The repository's [`docker-compose.yml`](../docker-compose.yml) reads everything
from `.env`, including the published port (`HOST_PORT`), the interface it binds
to (`HOST_BIND`), the data path and the image tag:

```bash
cp .env.example .env   # then edit it
docker compose up -d
```

## HTTPS and reverse proxies

Always set `TRUST_PROXY=true` behind a proxy, and **only** then: it makes
Guestroll read the client IP from `X-Forwarded-For`, which anyone could forge
without a proxy in front.

Raise the proxy's body size limit above `MAX_UPLOAD_MB` (25 MB by default).

### Caddy

```caddy
photos.example.com {
	request_body {
		max_size 30MB
	}
	reverse_proxy guestroll:3000
}
```

### Traefik (labels)

```yaml
    labels:
      - traefik.enable=true
      - traefik.http.routers.guestroll.rule=Host(`photos.example.com`)
      - traefik.http.routers.guestroll.entrypoints=websecure
      - traefik.http.routers.guestroll.tls.certresolver=letsencrypt
      - traefik.http.services.guestroll.loadbalancer.server.port=3000
```

### nginx

```nginx
server {
    listen 443 ssl http2;
    server_name photos.example.com;
    # ssl_certificate / ssl_certificate_key …

    client_max_body_size 30m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # Stream ZIP downloads instead of buffering them on disk.
        proxy_buffering off;
    }
}
```

## Without Docker

```bash
git clone https://github.com/achedon12/guestroll && cd guestroll
npm ci
npm run build
cp -r .next/static .next/standalone/.next/ && cp -r drizzle .next/standalone/
cd .next/standalone
DATA_DIR=/var/lib/guestroll ADMIN_PASSWORD=… PUBLIC_URL=… node server.js
```

Run it under systemd or another supervisor, as an unprivileged user that owns `DATA_DIR`.

## A public demo

`DEMO_MODE=true` turns an instance into a demo anyone can try:
`docker compose -f docker-compose.demo.yml up -d`.

- On first start it seeds three events (a wedding with challenges, a
  guestbook, favorites, frames and a mosaic wall; a birthday with moderation;
  a conference) with generated photos, messages and a gallery link.
- A shared owner account, `demo` / `guestroll-demo`, is shown on the login
  page and in a banner on every page, with the gallery link's password.
- Everything is reset on `DEMO_RESET_CRON` (every night at 4:00 UTC): visitors'
  events, photos and accounts are gone, the seed runs again.
- Nothing leaves the instance: emails and webhooks stay queued, the update
  check is off, and email, webhook, backup, update, password, two-step and
  account settings answer `403`. `ADMIN_PASSWORD` remains the operator's own
  `admin` account.

## Backups

The simplest way: **Admin → Settings → Backup and retention → Download a
backup** (owners). One ZIP with the database (an online snapshot, consistent
while guests keep uploading), every photo, logo and voice note whatever the
storage driver, and the generated session secret. **Restore** on the same page
replaces the whole instance with a backup; it is also how photos move from
disk to an S3 bucket (back up, set `STORAGE_DRIVER=s3`, restart, restore).
Restores are sent as one upload: raise your reverse proxy's body limit
(`client_max_body_size` in nginx) above the backup's size.

To script it, the same ZIP comes from `GET /api/admin/backup?download=1` with
an owner's session. Or copy the data folder yourself; everything lives in
`/data`:

```
/data
├── guestroll.db          # events, photo metadata, stats, accounts, settings
├── guestroll.db-wal      # SQLite write-ahead log, part of the database
├── .session-secret       # only if SESSION_SECRET isn't set
└── uploads/<event-id>/   # photos, logo, messages/ (empty with STORAGE_DRIVER=s3)
```

For a consistent copy while the app runs, back up the database with SQLite's
online backup, then the files:

```bash
docker exec guestroll node -e "require('better-sqlite3')('/data/guestroll.db').backup('/data/backup.db').then(()=>console.log('ok'))"
tar czf guestroll-$(date +%F).tgz -C /var/lib/docker/volumes/guestroll-data/_data backup.db uploads
```

Copying the folder while the container is stopped works just as well.

## Upgrades

Guestroll checks GitHub for new releases every 12 hours. When one is out, the
owners get an email (and the webhooks subscribed to *A new version is
available*), and **Admin → Settings → Updates** shows its release notes.

### From the admin, in one click

Like Matomo's: **Update to X.Y.Z** makes a full backup, then replaces the
running container with the same one on the new image (volumes, ports,
networks, variables, restart policy kept), waits for its health check, and
puts the previous container back if the new one doesn't come up healthy.
Database migrations run on their own at start; the update history lists the
ones each update applied.

It needs the small **updater** container next to Guestroll, because a
container can't replace itself:

```bash
# .env
UPDATER_URL=http://updater:9900
UPDATER_TOKEN=$(openssl rand -hex 32)   # paste the value

docker compose --profile updater up -d
```

The updater holds the Docker socket, which gives root on the host. It publishes
no port, answers only with the token, only ever replaces the Guestroll
container, and only pulls new versions of that container's own image. Leave it
off if you'd rather not run anything with the socket: updates then stay a
command.

### From the server

```bash
docker compose pull && docker compose up -d
```

Either way, read the release notes' **Upgrading** list first. Every release is
tested by starting it on the data of the previous one (see
[Development](development.md#upgrades)).

## Health check

`GET /api/health` returns `200 {"status":"ok"}` when the database is readable,
`503` otherwise. The image declares it as its Docker `HEALTHCHECK`.
