---
layout: home
title: Guestroll
titleTemplate: Every guest's photos, in one place
description: "Self-hosted QR-code photo sharing for weddings and parties. Guests scan a QR code, the camera opens, and every photo lands in your private album. No app, no account, one Docker command."

hero:
  name: Guestroll
  text: Every guest's photos, in one place.
  tagline: Guests scan the QR code on the table, their phone's camera opens, and every photo lands in your private album. No app to install, no account to create. You host it, with one Docker command.
  image:
    src: /logo.svg
    alt: ""
  actions:
    - theme: brand
      text: Get started
      link: /getting-started
    - theme: alt
      text: Watch the tour
      link: https://youtu.be/MEuvBB-wVI8
    - theme: alt
      text: View on GitHub
      link: https://github.com/achedon12/guestroll

features:
  - icon: 📷
    title: The camera, straight from the QR code
    details: On any iPhone or Android, no install. Photos are resized on the phone, queued, retried and resumed when the room's 4G gives up.
    link: /getting-started
    linkText: Install it
  - icon: 🔒
    title: Private by design
    details: Guests only ever see their own photos. Every photo request is checked, GPS and camera metadata are stripped, and links can be rotated if a code leaks.
    link: /security
    linkText: How photos stay private
  - icon: ✅
    title: A contact sheet for the hosts
    details: Approve each photo first or hide later, star your favorites, import the photographer's shots, download everything as one ZIP.
    link: /admin-guide#photos
    linkText: The admin guide
  - icon: 🎯
    title: Challenges and a guestbook
    details: Photo prompts guests pick before shooting, and a guestbook for a few words or a voice note, both moderated.
    link: /admin-guide#guestbook
    linkText: Guests' extras
  - icon: 📺
    title: A live wall and a slideshow video
    details: A full-screen wall for the projector, as one print, a mosaic or a grid. After the party, an MP4 of the album with your music.
    link: /admin-guide#qr-sharing
    linkText: Wall and video
  - icon: 🖼️
    title: Your event's look
    details: A QR code designer whose presets are all scan-tested, frames drawn on the photos, filters, your colors and logo.
    link: /customization
    linkText: Make it yours
  - icon: ✉️
    title: After the event, on its own
    details: Gallery links with a password, the album emailed to guests who asked, a summary for you, alerts by email, ntfy, Discord, Slack or JSON.
    link: /admin-guide#gallery-links
    linkText: Automation
  - icon: 👥
    title: For more than one host
    details: Owners run the instance; organizers only see the events you give them. Backups, restores and automatic clean-up from the admin.
    link: /admin-guide#settings-1
    linkText: Accounts and backups
  - icon: 🐳
    title: One container
    details: SQLite and a folder of photos in one volume, or any S3-compatible bucket. amd64 and arm64, so a Raspberry Pi works. English, French, Italian and Spanish.
    link: /deployment
    linkText: Self-hosting
---

<section class="home-section">

## How it works

<p class="lead">Built for the night itself: a guest has twenty seconds and one free hand. Built for the morning after: the hosts want every photo, sorted, private.</p>

<div class="home-steps">
<div>

### Scan

Print the card, one per table. The QR code opens a web page on any phone.

</div>
<div>

### Shoot

The camera opens straight away. One tap and the photo is on its way, even on a weak connection.

</div>
<div>

### Keep

Everything lands in your album, with who took it. Approve, project, download, send the album to your guests.

</div>
</div>
</section>

<section class="home-section home-row">
<div>

## Guests only ever see their own photos.

<p class="lead">The album belongs to the hosts. Every photo request is checked, a copied link opens nothing elsewhere, and GPS position and camera metadata are stripped from every upload. Challenges, filters and a guestbook give guests something to do besides scrolling.</p>

[How photos stay private →](./security)

</div>
<figure class="home-shot phone">
  <img class="only-light" src="/img/guest-light.webp" alt="The guest page on a phone: the shutter and the guest's own photos">
  <img class="only-dark" src="/img/guest-dark.webp" alt="The guest page on a phone: the shutter and the guest's own photos, dark theme">
</figure>
</section>

<section class="home-section home-row reverse">
<div>

## A contact sheet for the hosts.

<p class="lead">Approve each photo first, or publish and hide later. Select in bulk, star your favorites, add the photographer's shots, and download the whole album, or just the best of it, as one ZIP that streams even when it weighs gigabytes.</p>

[The admin guide →](./admin-guide#photos)

</div>
<figure class="home-shot">
  <img class="only-light" src="/img/moderation-light.webp" alt="The contact sheet with photos selected">
  <img class="only-dark" src="/img/moderation-dark.webp" alt="The contact sheet with photos selected, dark theme">
</figure>
</section>

<section class="home-section home-row">
<div>

## A QR code that looks like your event.

<p class="lead">Colors, dot and corner shapes, your logo in the middle, a caption. Every preset is decoded by a real scanner in the test suite. PNG up to 4096 px, SVG for the print shop, a printable A4 table card.</p>

[QR & sharing →](./admin-guide#qr-sharing)

</div>
<figure class="home-shot">
  <img class="only-light" src="/img/qr-light.webp" alt="The QR code designer">
  <img class="only-dark" src="/img/qr-dark.webp" alt="The QR code designer, dark theme">
</figure>
</section>

<section class="home-section home-row reverse">
<div>

## Know how the night went.

<p class="lead">Photos, guests, views, downloads and storage at a glance, uploads hour by hour, who took the most photos, and how each challenge went.</p>

[The dashboard →](./admin-guide#dashboard)

</div>
<figure class="home-shot">
  <img class="only-light" src="/img/dashboard-light.webp" alt="The dashboard">
  <img class="only-dark" src="/img/dashboard-dark.webp" alt="The dashboard, dark theme">
</figure>
</section>

<section class="home-section">

## The live wall.

<p class="lead">A full-screen slideshow for a projector or a TV: one print at a time, a mosaic or a grid. New photos show up within seconds, credited to whoever took them, with the QR code in a corner so the room keeps joining. With moderation on, nothing reaches the screen before you approve it.</p>

<figure class="home-shot">
  <img src="/img/wall.webp" alt="The live wall showing a guest's photo as a print">
</figure>
</section>

<section class="home-section">

## The tour

<p class="lead">Every feature in a few minutes, from the QR code on the table to the album the morning after.</p>

<div class="home-video">
  <iframe src="https://www.youtube-nocookie.com/embed/MEuvBB-wVI8" title="Guestroll: the tour" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe>
</div>
</section>

<section class="home-section">

## Install it in a minute

<p class="lead">One container, one volume. Phones only open the camera on HTTPS pages: put it behind a reverse proxy with a certificate, the <a href="./deployment">deployment guide</a> has Caddy, Traefik and nginx setups.</p>

```bash
docker run -d --name guestroll \
  -p 3000:3000 \
  -v guestroll-data:/data \
  -e ADMIN_PASSWORD='choose-a-long-password' \
  -e PUBLIC_URL='https://photos.example.com' \
  ghcr.io/achedon12/guestroll:latest
```

Then open `/admin`, sign in as `admin`, create an event and print its QR code.

<div class="home-cta">

[Getting started →](./getting-started)

[All the settings →](./configuration)

</div>
</section>

<section class="home-section">

## How it compares

| | Guestroll | Shared cloud album | Paid event apps |
|---|---|---|---|
| Guests install an app or create an account | No | Often | Sometimes |
| Guests see each other's photos | Never | Yes | Usually |
| Your photos stay on your server | Yes | No | No |
| Price | Free, MIT | Free | Per event |

</section>
