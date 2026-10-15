# Getting started

This guide takes you from nothing to a printed QR code in about ten minutes.

## 1. Run Guestroll

You need a machine with Docker: a VPS, a home server, a NAS or a Raspberry Pi 4/5.

```bash
docker run -d --name guestroll \
  --restart unless-stopped \
  -p 3000:3000 \
  -v guestroll-data:/data \
  -e ADMIN_PASSWORD='choose-a-long-password' \
  -e PUBLIC_URL='https://photos.example.com' \
  ghcr.io/achedon12/guestroll:latest
```

- `-v guestroll-data:/data` keeps the database and photos when the container is recreated. **Don't skip it.**
- `PUBLIC_URL` is the address encoded in your QR codes. Use the public HTTPS address guests will reach.
- Without `ADMIN_PASSWORD`, a random password is generated and printed once: `docker logs guestroll`.

Other ways to run it (Compose, plain Node.js) are in [Deployment](deployment.md).

## 2. Put it behind HTTPS

Phones refuse to open the camera from an `http://` page. Before the event, the
instance must be reachable over HTTPS. The quickest route is Caddy, which gets a
certificate on its own:

```caddy
photos.example.com {
	reverse_proxy localhost:3000
}
```

Then set `TRUST_PROXY=true` so rate limits see the real client IP.
[Deployment](deployment.md#https-and-reverse-proxies) also covers Traefik and nginx.

## 3. Create an event

1. Open `https://photos.example.com/admin` and sign in.
2. **New event**: give it a name. Everything else has a sensible default and can be changed later.
3. You land on the **QR & sharing** tab.

Worth deciding up front:

| Setting | Recommended for a private party |
|---|---|
| Access code | Set one if the QR code may end up on social media |
| Album language | *Automatic* follows each guest's phone. Pick one if all guests share a language |
| Moderation | *Publish immediately* for friends, *Approve first* if you'll project the live wall |
| Close uploads at | The morning after |

## 4. Print the QR code

In **QR & sharing**, the designer lets you color the code, round its dots and
corners, put your logo in the middle and add a caption. The preview is the exact
file you'll download. Stay with dark dots on a light background: many Android
scanners can't read the reverse, and the designer warns you if you try.

**Printable poster** gives you an A4 card with the event name and QR code: print
it from the browser. For a print shop, download the **SVG**. It stays sharp at any size.

Test it: scan the code with your own phone, take a photo, and check it shows up
in the **Photos** tab.

## 5. On the day

- [ ] Phone test from the venue's network or 4G, not your home Wi-Fi
- [ ] The live wall open on the projector laptop (**QR & sharing → Open live wall**)
- [ ] One QR card per table, plus one near the entrance
- [ ] Space on the server: count about 3 MB per photo

## 6. After the event

- **Photos → Download ZIP** gets everything at full resolution.
- Close uploads (**Settings → Accept uploads**) if you didn't schedule it.
- Guests never see each other's photos in Guestroll. To share the album, send
  the ZIP, or the photos you picked, through whatever channel you like.
