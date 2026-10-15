# Admin guide

Sign in at `/admin` with the admin password. The admin works on a phone, but
it's most comfortable on a laptop.

## Dashboard

Totals across every event: photos, guests who sent at least one photo, page
views, downloads, storage used and photos waiting for approval. Below: uploads
per day over the last 30 days, the five most active photographers, and the
latest events.

## Events

**New event** asks for a name and nothing else; every other setting has a
default you can change later. Each event has four tabs.

### Photos

The contact sheet of everything guests sent, newest first.

- Filter by **All**, **Pending**, **Visible** or **Hidden**.
- Tap photos to select them, then **Approve**, **Hide** or **Delete** from the
  bar at the bottom. Hidden photos disappear for the guest who took them too,
  and leave the live wall; deleted photos are removed from disk.
- **Download ZIP** gets every visible photo at full resolution, named
  `0001-camille-1a2b3c4d.jpg` so they sort in the order they were taken.
  The archive streams, so even a multi-gigabyte album starts downloading
  immediately.

### Stats

Uploads per hour over the event (a party lasts a night, so hours are the
useful unit), page views, downloads, wrong access codes and top photographers.

### QR & sharing

- **Guest link**: the address behind the QR code, to paste in a message.
- **QR code design**: presets, colors, dot and corner shapes, margin, a logo in
  the middle and a caption. The preview is the exact file you download, as PNG
  (512 to 4096 px) or SVG. Remember to **Save** before downloading.
- **Printable poster**: an A4 card with the event name, date and QR code.
- **Open live wall**: a full-screen slideshow for a projector or a TV. New
  photos jump the queue and appear within five seconds; in between, it cycles
  through the latest ones. Only visible photos are shown, so with
  *Approve each photo first* nothing reaches the screen until you approve it.
- **Generate a new link**: changes the address. The old QR code stops working
  at once, for everyone. Use it if the code leaked.

### Settings

| Section | Setting | What it does |
|---|---|---|
| Event | Name, welcome message, date, accent color | What guests see at the top of their page. The color tints the camera and the buttons; the text on it adjusts automatically. |
| Access | Access code | Optional, 6+ characters. Guests type it once. Leave empty to let the QR code alone grant access. |
| Uploads | Accept uploads | Turn uploads off at any time; guests keep their own photos. |
| | Close uploads automatically at | For example the morning after. |
| | Capture mode | Camera only (the default), library only, or both. |
| | Photos per guest | 0 for no limit. Guests see a counter of photos left. |
| | Moderation | Publish immediately and hide later, or approve each photo first. |
| Guests | Album language | Automatic (each guest's phone) or one fixed language. Guests can still switch. |
| | Ask guests for their name | Shown next to their photos in the admin and on the live wall. |

| After the event | Let guests leave their email to get the album | Adds a card on the guest page. Opt-in; addresses are deleted with the event. |
| | Email me a summary when uploads close | Photos, photographers, views, what's still pending. |
| | Email guests a gallery link when uploads close | One password-protected link for the event, sent to every address once. |
| | Link valid for (days) | 0 for a link that never expires. |
| | Guests can download the photos from the link | Off: the link shows photos but not originals or the ZIP. |
| | Put the password in the email | Off: guests get the link only, and the password reaches you (summary email and the *End the event* card) so you can pass it on yourself. A forwarded email then isn't enough. |

### Gallery links

In **QR & sharing**, *Gallery links* creates private links to the visible
photos of the event: for family who weren't there, or for guests afterwards.
Each link has its own password (yours, or a generated one shown **once**), an
optional expiry, a downloads switch, and a view counter. **Revoke** cuts it off
at once, even for someone who already opened it. A gallery link never lets
anyone upload, and never shows pending or hidden photos.

### End the event

Uploads end on their own at the scheduled closing time; the end-of-event emails
then go out within a minute. **End the event now** does it immediately. It runs
once per event: ending again does nothing.

**Danger zone**: deleting an event removes every photo from disk. Type the
event name to confirm.

## Settings

- **Language and theme** for your own browser.
- **Email**: SMTP server (or read-only when set by `SMTP_HOST`), where alerts
  go, a **Send a test email** button that shows the server's answer, and the
  last emails with their state. Failed ones can be retried.
- **Alerts**, each switchable: photos waiting for approval (at most every 30
  minutes, only when the count grows), an event's end summary, 10+ wrong admin
  passwords within 15 minutes (at most hourly), disk 90% full (at most daily).
- **Admin password**: changing it signs out every other session. Not available
  when `ADMIN_PASSWORD` is set: change the variable and restart instead.
