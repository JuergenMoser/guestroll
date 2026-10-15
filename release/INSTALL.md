# Guestroll: install kit

1. Copy `.env.example` to `.env` and fill in at least `PUBLIC_URL` and `ADMIN_PASSWORD`.
2. Start it: `docker compose up -d`
3. Open `PUBLIC_URL/admin`, sign in, create an event and print its QR code.

Phones only open the camera on HTTPS pages: put Guestroll behind a reverse proxy
with a certificate. Ready-made Caddy, Traefik and nginx setups:
https://github.com/achedon12/guestroll/wiki/Deployment

Every setting: https://github.com/achedon12/guestroll/wiki/Configuration
