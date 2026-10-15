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

```bash
docker compose pull && docker compose up -d
```

Database migrations run on startup. Read the release notes before a major
version bump, and take a backup first.

## Health check

`GET /api/health` returns `200 {"status":"ok"}` when the database is readable,
`503` otherwise. The image declares it as its Docker `HEALTHCHECK`.
