# HTTP API

The routes the interface uses. They're stable within a major version, but they
exist for the UI, not as a public integration API.

All mutating requests need a same-origin `Origin` header (browsers send it).
Errors are JSON: `{ "error": "<code>", "details"?: { field: message } }`.

| Code | Status | Meaning |
|---|---|---|
| `bad_request` | 400 | Invalid input, see `details` |
| `unauthorized` | 401 | Not signed in as admin, or wrong password |
| `invalid_code` | 401 | Wrong event access code |
| `forbidden` | 403 | Cross-site request, or the guest hasn't joined the event |
| `uploads_closed` | 403 | Uploads are off or past their closing time |
| `quota_reached` | 403 | The guest reached the per-guest limit |
| `not_found` | 404 | Doesn't exist, or exists but isn't yours |
| `too_large` | 413 | Body above `MAX_UPLOAD_MB` |
| `invalid_image` | 415 | Not a supported image |
| `rate_limited` | 429 | Slow down; see `Retry-After` |

## Guest routes

Authenticated by the `gr_guest` cookie.

| Route | Body | Response |
|---|---|---|
| `POST /api/e/:slug/join` | none | `{ ok }`. Events without an access code only. |
| `POST /api/e/:slug/unlock` | `{ code }` | `{ ok }` |
| `POST /api/e/:slug/guest` | `{ name }` | `{ name }`. Stored in the cookie. |
| `POST /api/e/:slug/photos` | multipart, field `photo` | `201 { photo: PhotoDto }` |
| `GET /api/e/:slug/photos?before=<ms>` | | `{ photos: PhotoDto[], nextCursor }`, the guest's own photos only |
| `GET /api/e/:slug/logo?v=<n>` | | The event logo (PNG), public with the slug |
| `GET /api/media/:id?v=thumb\|display\|original[&download=1]` | | The image, if the viewer may see it |

| `POST /api/e/:slug/contact` | `{ email }` | `{ email }`. Only on events that collect emails. |
| `DELETE /api/e/:slug/contact` | | `{ ok }`, the address is deleted |

### Gallery link routes

Authenticated by the `gr_share` cookie, set by `unlock`.

| Route | Body | Response |
|---|---|---|
| `POST /api/g/:token/unlock` | `{ password }` | `{ ok }`, or `invalid_code` |
| `GET /api/g/:token/photos?before=<ms>` | | `{ photos, nextCursor }`, visible photos only; `403` until unlocked |
| `GET /api/g/:token/archive` | | Streamed ZIP, if the link allows downloads |

```ts
interface PhotoDto {
  id: string;
  width: number;
  height: number;
  guestName: string | null;
  status: "visible" | "pending" | "hidden";
  mine: boolean;
  downloads?: number; // admins only
  createdAt: number;  // epoch ms
}
```

## Admin routes

Authenticated by the `gr_admin` cookie.

| Route | Body | Response |
|---|---|---|
| `POST /api/admin/login` | `{ password }` | `{ ok }` |
| `POST /api/admin/logout` | | `{ ok }` |
| `POST /api/admin/password` | `{ current, next }` | `{ ok }` |
| `GET /api/admin/events` | | `{ events: EventSummary[] }` |
| `POST /api/admin/events` | event fields, `name` required | `201 { event }` |
| `GET /api/admin/events/:id` | | `{ event }` |
| `PATCH /api/admin/events/:id` | any event fields | `{ event }` |
| `DELETE /api/admin/events/:id` | | `{ ok }`, photos deleted from disk |
| `POST /api/admin/events/:id/rotate` | | `{ event }` with a new slug |
| `POST /api/admin/events/:id/logo` | multipart, field `logo` | `{ event }` |
| `DELETE /api/admin/events/:id/logo` | | `{ event }` |
| `GET /api/admin/events/:id/qr?format=svg\|png&size=512..4096&download=1` | | The styled QR code |
| `GET /api/admin/events/:id/photos?status=&before=` | | `{ photos, nextCursor }` |
| `POST /api/admin/events/:id/photos` | `{ action: "approve"\|"hide"\|"delete", ids }` | `{ changed }` |
| `GET /api/admin/events/:id/archive[?all=1]` | | Streamed ZIP; `all=1` includes pending and hidden |
| `GET /api/admin/stats[?eventId=]` | | Totals, time series, top guests |
| `GET /api/admin/events/:id/shares` | | `{ shares }` |
| `POST /api/admin/events/:id/shares` | `{ password?, label?, allowDownload?, expiresInDays? }` | `201 { share, password }`; `password` is the generated one, else `null` |
| `DELETE /api/admin/events/:id/shares/:shareId` | | `{ ok }`, revoked |
| `POST /api/admin/events/:id/end` | | `{ event, result }`; `400` if already ended |
| `GET /api/admin/mail` | | SMTP settings (never the password), alerts, queue |
| `PUT /api/admin/mail` | `{ smtp?, adminEmail?, alerts? }` | Same as `GET` |
| `POST /api/admin/mail/test` | `{ to? }` | `{ ok, to }`, or `502 { error: "smtp_failed", message }` |
| `POST /api/admin/mail/retry` | | `{ requeued, sent, failed }`: failed emails requeued, then the queue is processed |

Event fields: `name`, `description`, `eventDate` (`YYYY-MM-DD`), `accentColor`
(`#rrggbb`), `accessCode` (string to set, `null` to remove), `uploadsOpen`,
`uploadsCloseAt` (epoch ms or `null`), `moderation` (`post`|`pre`),
`captureMode` (`camera`|`picker`|`both`), `askGuestName`, `maxPhotosPerGuest`,
`defaultLocale` (`en`|`fr`|`it`|`es`|`null`), `collectGuestEmails`,
`notifyAdminSummary`, `emailGuestsGallery`, `galleryLinkDays` (0–3650),
`galleryLinkDownload`, `galleryMailIncludesPassword`, `qrStyle` (object, see
`src/lib/qr/style.ts`).

## Health

`GET /api/health` returns `200 {"status":"ok"}`, or `503` when the database
can't be read.
