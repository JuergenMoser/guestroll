# Admin guide

Sign in at `/admin` with your account: `admin` and the password from
`ADMIN_PASSWORD` on a fresh install, or the one an owner gave you. The admin
works on a phone, but it's most comfortable on a laptop.

## Dashboard

Totals across every event: photos, guests who sent at least one photo, page
views, downloads, storage used and photos waiting for approval. Below: uploads
per day over the last 30 days, the five most active photographers, and the
latest events.

## Events

**New event** asks for a name and nothing else; every other setting has a
default you can change later. Each event has its tabs: Photos, Guestbook
(once you turn it on), Stats, QR & sharing and Settings.

### Photos

The contact sheet of everything guests sent, newest first.

- Filter by **All**, **Pending**, **Visible**, **Hidden** or **Favorites**, and
  by challenge when the event has some.
- Tap photos to select them, then **Approve**, **Hide**, **Favorite**,
  **Unfavorite** or **Delete** from the bar at the bottom. Hidden photos disappear for the guest who took them too,
  and leave the live wall; deleted photos are removed from disk.
- **Download ZIP** gets every visible photo at full resolution, named
  `0001-camille-1a2b3c4d.jpg` so they sort in the order they were taken.
  The archive streams, so even a multi-gigabyte album starts downloading
  immediately.
- **Import photos** adds files from your computer, typically the
  photographer's: sent one by one at full quality (no compression in the
  browser), published at once, outside guest quotas and closing times, and
  credited to the name you give.
- **Favorites** are your picks, marked with a star. Under the Favorites filter,
  **Download the favorites** gets a "best of" ZIP, and a gallery link can show
  the favorites only. Guests never see which photos you picked.

### Guestbook

Turn it on in **Settings → Guestbook**: guests then find a card under their
photos to leave a few words, a voice note of up to 2 minutes recorded in the
browser, or both. Messages follow the event's moderation, like photos; a
guest sees and can delete only their own.

The **Guestbook** tab lists them with a player for each voice note. Select to
approve, hide or delete; **Download the guestbook** gets a ZIP with
`guestbook.txt` (every message, oldest first) and the voice notes, numbered to
match. *Show the messages behind gallery links* adds the approved ones under
the photos of every gallery link of the event (off by default: they were
written for you). The end-of-event summary counts them.

### Stats

Uploads per hour over the event (a party lasts a night, so hours are the
useful unit), page views, downloads, wrong access codes, top photographers,
and photos per challenge.

### QR & sharing

- **Guest link**: the address behind the QR code, to paste in a message.
- **QR code design**: presets, colors, dot and corner shapes, margin, a logo in
  the middle and a caption. The preview is the exact file you download, as PNG
  (512 to 4096 px) or SVG. Remember to **Save** before downloading.
- **Printable poster**: an A4 card with the event name, date and QR code.
- **Slideshow video**: an MP4 of the visible photos (or the favorites) in the
  order they were taken, with a title card, slow zooms and crossfades, 16:9 or
  9:16 for stories, 2 to 8 seconds per photo, up to 300 photos, and your own
  music if you add a file (cut and faded out at the end). It is made in your
  browser (WebCodecs, any recent Chrome, Edge, Safari or Firefox), so the server
  needs no video encoder: keep the tab open while the progress bar runs.
  Photos far from the video's shape are shown whole on a blurred backdrop
  instead of being cropped.
- **Live wall**: a full-screen slideshow for a projector or a TV. New photos
  jump the queue and appear within five seconds; in between, it cycles through
  the latest ones. Only visible photos are shown, so with *Approve each photo
  first* nothing reaches the screen until you approve it. Its settings:

  | Setting | What it does |
  |---|---|
  | Layout | **One print** at a time, a **mosaic** (the newest big, four around it) or a **grid** of fifteen |
  | Seconds per step | 3 to 30 |
  | Show who took each photo / the challenge | Captions under each photo |
  | Show the QR code in a corner | So the room keeps joining |
  | Favorites only | Only the photos you starred |
  | Show guestbook messages | Approved text messages: between photos in *One print*, along the bottom otherwise |

  An open wall picks up setting changes within 20 seconds, no reload needed.
- **Generate a new link**: changes the address. The old QR code stops working
  at once, for everyone. Use it if the code leaked.

### Settings

Settings are split into five areas, listed on the left (a row of tabs on a
phone). An area that needs your attention says so in the list: two-step
verification off, no automatic backups, no email server, an update waiting.
Organizers only see **Your account**.

### Your account

- **Profile**: display name and the address where *your* events' summaries
  and alerts go.
- **Password**: changing it signs out your other sessions. Not available for
  the account set by `ADMIN_PASSWORD`: change the variable and restart instead.
- **Two-step verification**: scan the QR code with an authenticator app,
  type the code, and keep the ten recovery codes shown once. Every sign-in then
  asks for a code after the password. Lost your phone? Sign in with a recovery
  code, or ask an owner to reset it from **Team**.
- **Language and theme** for your own browser.

### Team (owners)

Add people and pick their role.

| Role | Can |
|---|---|
| Owner | Everything: every event, creating and deleting events, accounts, email, alerts |
| Organizer | Only the events assigned to them: photos and moderation, settings, QR code, gallery links, live wall, ending the event. Not deleting it. |

A new account gets a generated password, shown once for you to pass on.
*New password* generates another one and signs the person out; *Delete*
ends their access at once. The last owner can't be demoted or deleted.

### Notifications (owners)

- **Email**: SMTP server (or read-only when set by `SMTP_HOST`), where alerts
  go, and a **Send a test email** button that shows the server's answer.
- **Alerts**, each switchable: photos waiting for approval (at most every 30
  minutes, only when the count grows), an event's end summary, 10+ wrong admin
  passwords within 15 minutes (at most hourly), disk 90% full (at most daily).
- **Recent emails** with their state. Failed ones can be retried.
- **Webhooks**: the same alerts on your phone or in a chat, whatever
  the email settings. Up to 10, each with its own choice of alerts (event
  ended, photos waiting, new guestbook message, failed sign-ins, storage).

  | Service | URL | What arrives |
  |---|---|---|
  | ntfy | a topic on ntfy.sh or your own server | A push notification that opens the admin page |
  | Discord | channel settings → Integrations → Webhooks | An embed (mentions disabled) |
  | Slack | an Incoming Webhook | A message with a link |
  | JSON | anything: Home Assistant, n8n, your script | `{ app, kind, title, message, url, event, data, sentAt }`, signed with `X-Guestroll-Signature: sha256=<HMAC of the body>` when you set a secret |

  **Test** sends a notice right away and shows the service's answer. Real
  alerts go through a queue retried like emails (1, 5, 15 minutes, 1 and 6
  hours); the last deliveries are listed under the webhooks.

### Data (owners)

- **Backup**: download a backup of everything (see
  [Deployment](deployment.md#backups)).
- **Automatic backups**: every night, every 6 hours, weekly, or any cron
  expression, to a folder or an S3 bucket with the newest N kept, each listed
  with download and restore buttons. **Back up now** runs one at once.
- **Restore** a backup file.
- **Delete ended events**: with a number of days (14 or more), an event is
  deleted that long after it ended, photos and messages included; its hosts
  get an email a week before, and the date shows on the event's *QR & sharing*
  tab. Events that never ended (no closing time, never ended by hand) are kept.

### System (owners)

- **Updates**: the version you run, the newest one with its release
  notes, **Check now**, and, with the updater container, **Update to X.Y.Z**:
  a backup, the new image, a health check, the old one back if anything goes
  wrong. The history lists every update and the database migrations it
  applied. A line under the navigation tells owners when a version is out.
- **About**: version, default language, photo storage, largest photo
  accepted, public address and time zone of the instance.

Event emails (summaries, photos waiting for approval) go to the instance
address in **Email** and to every account managing the event that set an
address. Instance alerts (failed sign-ins, disk) go to the owners.
