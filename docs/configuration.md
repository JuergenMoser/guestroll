# Configuration

Guestroll is configured with environment variables only. Every variable is
optional: an empty instance starts with safe defaults. A complete template is in
[`.env.example`](../.env.example).

Invalid values stop the server at startup with a message naming the variable,
instead of running with a silent fallback.

## Docker and network

These are read by the container or by `docker-compose.yml`, not by the app itself.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port the server listens on inside the container (or on the machine without Docker). The health check follows it. |
| `HOSTNAME` | `0.0.0.0` | Interface the server binds to inside the container. |
| `HOST_PORT` | `3000` | Compose only: port published on the host. |
| `HOST_BIND` | `0.0.0.0` | Compose only: host interface to publish on. `127.0.0.1` keeps Guestroll reachable only through a local reverse proxy. |
| `DATA_PATH` | `guestroll-data` | Compose only: named volume or host path mounted on `/data`. |
| `PUID` / `PGID` | `1001` | User and group that own the data folder and run the server. Match your host user for bind mounts. |
| `TZ` | `UTC` | Time zone of the stats (hourly and daily buckets), e.g. `Europe/Paris`. |
| `GUESTROLL_IMAGE` | `ghcr.io/achedon12/guestroll:latest` | Compose only: image to run. Pin a version in production. |
| `CONTAINER_NAME` | `guestroll` | Compose only: lets you run several instances side by side. |

## Instance

| Variable | Default | Description |
|---|---|---|
| `APP_NAME` | `Guestroll` | Shown in page titles, the admin header and social cards. |
| `PUBLIC_URL` | *(request host)* | Public origin encoded in QR codes and social cards, e.g. `https://photos.example.com`. Set it: behind a proxy, the request host may be an internal name. |
| `DATA_DIR` | `./data` (`/data` in Docker) | Where the SQLite database and photos live. |

## Languages

Guestroll speaks English (`en`), French (`fr`), Italian (`it`) and Spanish (`es`).
Each visitor gets, in this order:

1. the language they picked with the language menu (kept in their browser);
2. the album's language, if the hosts set one in the event settings;
3. their browser's language, if supported and `DETECT_BROWSER_LOCALE` is on;
4. `DEFAULT_LOCALE`.

| Variable | Default | Description |
|---|---|---|
| `DEFAULT_LOCALE` | `en` | Language used when nothing more specific applies. |
| `DETECT_BROWSER_LOCALE` | `true` | `false` skips step 3: everyone without a choice gets the album's language or `DEFAULT_LOCALE`. |

## Security

| Variable | Default | Description |
|---|---|---|
| `ADMIN_USERNAME` | `admin` | Username of the owner account created on first start. |
| `ADMIN_PASSWORD` | *(generated)* | Password of that owner account. When set, it wins on every start (and the account stays an owner): it is the way back in if every other password is lost. When empty, a password is generated on first start and printed once in the logs; change it in **Admin → Settings**. Other accounts are created from the admin. |
| `SESSION_SECRET` | *(generated)* | Key that signs and encrypts cookies, 32+ characters. When empty, one is generated and stored in `DATA_DIR/.session-secret`. Changing it signs everyone out. |
| `TRUST_PROXY` | `false` | Read the client IP from `X-Forwarded-For` and the host from `X-Forwarded-Host`. Turn it on **only** behind a reverse proxy you control, or rate limits can be dodged with a forged header. |
| `SECURE_COOKIES` | `true` in production | Cookies only travel over HTTPS. Set to `false` only to test over plain HTTP on a local network. |
| `WEBHOOK_ALLOW_PRIVATE` | `false` | Let webhooks reach private, loopback and link-local addresses (a self-hosted ntfy or Home Assistant on your network). Off, a webhook to such an address fails with a message saying so: an owner's webhook can't probe the server's own network or cloud metadata. |

## Uploads

| Variable | Default | Description |
|---|---|---|
| `MAX_UPLOAD_MB` | `25` | Largest accepted photo. Phones resize before sending, so most uploads weigh 1–4 MB. Raise your reverse proxy's body limit above this. |
| `MAX_IMAGE_MEGAPIXELS` | `80` | Images above this are refused before decoding, which protects memory from "decompression bombs". |
| `DEFAULT_CAPTURE_MODE` | `camera` | Capture mode preselected for new events: `camera`, `picker` or `both`. |

## Rate limits

Per minute. Upload limits apply per guest, login limits per client IP.

| Variable | Default | Description |
|---|---|---|
| `RATE_LIMIT_UPLOADS_PER_MINUTE` | `30` | Photos one guest can send per minute. |
| `RATE_LIMIT_LOGIN_PER_MINUTE` | `5` | Admin login attempts per IP. |
| `RATE_LIMIT_UNLOCK_PER_MINUTE` | `10` | Access-code attempts per guest; three times this value is the ceiling for wrong codes on one event, across all guests. |

## Storage

Photos, logos and voice messages go to a folder under `DATA_DIR` by default.
Set `STORAGE_DRIVER=s3` to keep them in any S3-compatible bucket instead (AWS
S3, Backblaze B2, Cloudflare R2, Wasabi, Garage, RustFS, SeaweedFS…). The
SQLite database always stays in `DATA_DIR`, so keep the volume either way.

| Variable | Default | Description |
|---|---|---|
| `STORAGE_DRIVER` | `local` | `local` or `s3`. |
| `S3_ENDPOINT` | *(none)* | e.g. `https://s3.eu-west-3.amazonaws.com`, `https://<account>.r2.cloudflarestorage.com`, `http://garage:3900`. |
| `S3_REGION` | `us-east-1` | Region used to sign requests. Most self-hosted servers accept the default. |
| `S3_BUCKET` | *(none)* | The bucket must exist. Keep it **private**: Guestroll serves every file itself, after checking access. |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | *(none)* | Credentials allowed to read, write, list and delete in the bucket. |
| `S3_PREFIX` | *(none)* | Folder inside the bucket, to share one bucket between instances. |
| `S3_FORCE_PATH_STYLE` | `true` | `true` sends `endpoint/bucket/key`; `false` sends `bucket.endpoint/key` (AWS virtual-hosted style). |

At startup Guestroll writes, reads back and deletes a small probe file, and
logs `[storage] S3 bucket NOT usable` with the reason if that fails. Files are
never served from the bucket directly, so photos stay private even with a
bucket on a public endpoint. To move existing photos to a bucket, make a backup
(Admin → Settings → Data), switch the driver, then restore it.

## Scheduled backups

Owners set them in **Admin → Settings → Data**; these variables
set them from the environment instead (the admin then shows them read-only).
Each backup is the same ZIP as a manual one: database, every photo, logo and
voice note, and the generated session secret.

| Variable | Default | Description |
|---|---|---|
| `BACKUP_CRON` | *(none)* | Turns scheduled backups on, e.g. `0 3 * * *` (every night at 3:00, in `TZ`). Five fields. |
| `BACKUP_KEEP` | `7` | How many backups to keep; older ones are deleted after each new one. |
| `BACKUP_DIR` | `DATA_DIR/backups` | Where they go. Mount another disk here: a backup on the same disk as the photos doesn't survive that disk. |
| `BACKUP_S3_ENDPOINT`, `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY`, `BACKUP_S3_REGION`, `BACKUP_S3_PREFIX`, `BACKUP_S3_FORCE_PATH_STYLE` | *(none)* | Send them to an S3-compatible bucket instead of a folder (`BACKUP_S3_BUCKET` set). Use another bucket than the photos'. Large archives go up in 16 MB parts. |

A failed backup emails the owners and the instance address, and notifies
webhooks subscribed to *A scheduled backup failed*.

## Demo

| Variable | Default | Description |
|---|---|---|
| `DEMO_MODE` | `false` | A public demo: seeded content, the `demo` account, nightly reset, nothing sent out. See [Deployment](deployment.md#a-public-demo). |
| `DEMO_RESET_CRON` | `0 4 * * *` | When the demo goes back to its seed, in `TZ`. |

## Updates

| Variable | Default | Description |
|---|---|---|
| `UPDATE_CHECK` | `true` | Ask GitHub every 12 hours for the latest release and tell the owners about new ones. `false` makes no outbound call. |
| `UPDATER_URL` | *(none)* | Where the updater container answers, `http://updater:9900` with the bundled compose file. Turns on one-click updates. |
| `UPDATER_TOKEN` | *(none)* | A long random secret shared by the app and the updater (24+ characters). |

The updater itself reads `UPDATER_TOKEN`, `UPDATER_CONTAINER` (the container to
replace, `guestroll` by default) and `UPDATER_PORT` (`9900`). See
[Deployment](deployment.md#upgrades).

## Email

Optional. Without SMTP, everything else works and no email is ever sent.
SMTP can also be set in **Admin → Settings → Notifications**, where the password is
stored encrypted (AES-256-GCM, key derived from `SESSION_SECRET`). When
`SMTP_HOST` is set, the environment wins and the admin form is read-only.

| Variable | Default | Description |
|---|---|---|
| `SMTP_HOST` | *(none)* | SMTP server, e.g. `smtp.fastmail.com`. Setting it turns email on. |
| `SMTP_PORT` | `587` | `587` (STARTTLS) or `465` (TLS). |
| `SMTP_SECURE` | `false` | `true` for implicit TLS on port 465. |
| `SMTP_USER` / `SMTP_PASSWORD` | *(none)* | Credentials, when the server asks for them. |
| `SMTP_FROM` | `SMTP_USER` | Sender, e.g. `Guestroll <photos@example.com>`. |
| `SMTP_ALLOW_PLAIN` | `false` | With a user set, the login is only sent once the connection is encrypted (implicit TLS or STARTTLS), so nobody on the path can strip STARTTLS and read it. `true` for a relay without TLS on the same machine or a trusted network. |
| `ADMIN_EMAIL` | *(none)* | Where alerts and event summaries go. Settable in the admin when empty. |
| `SCHEDULER_INTERVAL_SECONDS` | `60` | How often the background worker sends queued mail, closes scheduled events and checks alerts. `0` turns it off. |

Emails wait in a queue in the database and are retried after 1, 5, 15 minutes,
1 and 6 hours, then marked failed (Admin → Settings shows them, with a retry
button). Set `PUBLIC_URL`: links in emails are built from it, since a
background job has no request to read the host from.

