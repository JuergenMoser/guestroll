# Guestroll

**Every guest's photos, in one place.** Guests scan a QR code, their camera
opens, and every picture lands in your private album. Self-hosted, no app, no
account.

Source, documentation and issues: **https://github.com/achedon12/guestroll**

## Quick start

```bash
docker run -d --name guestroll \
  -p 3000:3000 \
  -v guestroll-data:/data \
  -e ADMIN_PASSWORD='choose-a-long-password' \
  -e PUBLIC_URL='https://photos.example.com' \
  achedon12/guestroll:latest
```

Open `/admin`, create an event, print its QR code. Phones only open the camera
on HTTPS: put a reverse proxy with a certificate in front.

## Tags

`latest`, `1`, `1.2`, `1.2.3`. Images for `linux/amd64` and `linux/arm64`.

## Main variables

| Variable | Default | |
|---|---|---|
| `PORT` | `3000` | Listening port inside the container |
| `PUBLIC_URL` | request host | Address encoded in QR codes |
| `ADMIN_PASSWORD` | generated, printed in the logs | Admin password |
| `DEFAULT_LOCALE` | `en` | `en`, `fr`, `it` or `es` |
| `PUID` / `PGID` | `1001` | Owner of `/data` |
| `TZ` | `UTC` | Time zone of the stats |
| `TRUST_PROXY` | `false` | `true` behind your reverse proxy |
| `MAX_UPLOAD_MB` | `25` | Largest photo |

Every variable: [configuration.md](https://github.com/achedon12/guestroll/blob/main/docs/configuration.md).

## Volume

`/data` holds the SQLite database and every photo. Back it up.
