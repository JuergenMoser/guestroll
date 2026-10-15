# API HTTP

Le route usate dall'interfaccia. Sono stabili all'interno di una versione
major, ma esistono per la UI, non come API pubblica di integrazione.

Tutte le richieste che modificano dati richiedono un header `Origin` della
stessa origine (i browser lo inviano). Gli errori sono in JSON:
`{ "error": "<code>", "details"?: { field: message } }`.

| Codice | Stato | Significato |
|---|---|---|
| `bad_request` | 400 | Input non valido, vedi `details` |
| `unauthorized` | 401 | Accesso admin non effettuato, o password sbagliata |
| `invalid_code` | 401 | Codice di accesso all'evento sbagliato |
| `forbidden` | 403 | Richiesta cross-site, o l'ospite non si è unito all'evento |
| `uploads_closed` | 403 | I caricamenti sono disattivati o oltre l'orario di chiusura |
| `quota_reached` | 403 | L'ospite ha raggiunto il limite per ospite |
| `not_found` | 404 | Non esiste, o esiste ma non è tuo |
| `too_large` | 413 | Body oltre `MAX_UPLOAD_MB` |
| `invalid_image` | 415 | Non è un'immagine supportata |
| `rate_limited` | 429 | Rallenta; vedi `Retry-After` |

## Route ospite {#guest-routes}

Autenticate dal cookie `gr_guest`.

| Route | Body | Risposta |
|---|---|---|
| `POST /api/e/:slug/join` | nessuno | `{ ok }`. Solo eventi senza codice di accesso. |
| `POST /api/e/:slug/unlock` | `{ code }` | `{ ok }` |
| `POST /api/e/:slug/guest` | `{ name }` | `{ name }`. Salvato nel cookie. |
| `POST /api/e/:slug/photos` | multipart, campo `photo`, `challenge` facoltativo (un id di sfida) | `201 { photo: PhotoDto }`; una sfida sconosciuta viene ignorata |
| `DELETE /api/e/:slug/photos/:id` | | `{ ok }`: la foto dell'ospite stesso, file inclusi; `404` altrimenti |
| `GET /api/e/:slug/photos?before=<ms>` | | `{ photos: PhotoDto[], nextCursor }`, solo le foto dell'ospite stesso |
| `GET /api/e/:slug/logo?v=<n>` | | Il logo dell'evento (PNG), pubblico con lo slug |
| `GET /api/media/:id?v=thumb\|display\|original[&download=1]` | | L'immagine, se chi guarda può vederla |

| `POST /api/e/:slug/contact` | `{ email }` | `{ email }`. Solo negli eventi che raccolgono le e-mail. |
| `DELETE /api/e/:slug/contact` | | `{ ok }`, l'indirizzo viene eliminato |

| `GET /api/e/:slug/messages` | | `{ messages: MessageDto[] }`, quelli dell'ospite stesso |
| `POST /api/e/:slug/messages` | multipart: `text` e/o `audio`, `seconds` | `201 { message }` |
| `DELETE /api/e/:slug/messages/:id` | | `{ ok }`, solo quelli dell'ospite stesso |
| `GET /api/messages/:id/audio[?download=1]` | | Il messaggio vocale, se chi ascolta può sentirlo |

### Route dei link alla galleria {#gallery-link-routes}

Autenticate dal cookie `gr_share`, impostato da `unlock`.

| Route | Body | Risposta |
|---|---|---|
| `POST /api/g/:token/unlock` | `{ password }` | `{ ok }`, oppure `invalid_code` |
| `GET /api/g/:token/photos?challenge=&before=<ms>` | | `{ photos, nextCursor }`, solo foto visibili; `403` finché non è sbloccato |
| `GET /api/g/:token/messages?before=` | | `{ messages, nextCursor }`, quando gli organizzatori condividono il libro degli ospiti |
| `GET /api/g/:token/archive` | | ZIP in streaming, se il link consente i download |

```ts
interface PhotoDto {
  id: string;
  width: number;
  height: number;
  guestName: string | null;
  status: "visible" | "pending" | "hidden";
  mine: boolean;
  downloads?: number; // admins only
  favorite?: boolean;  // admins only
  challengeId: string | null;
  createdAt: number;  // epoch ms
}
```

## Route admin {#admin-routes}

Autenticate dal cookie `gr_admin`. Le route sotto `/api/admin/events/:id`
rispondono `404` per gli eventi fuori dal perimetro di un organizzatore;
creazione ed eliminazione degli eventi, account e impostazioni e-mail sono
riservate ai proprietari (`403` altrimenti).

| Route | Body | Risposta |
|---|---|---|
| `POST /api/admin/login` | `{ username, password }` | `{ ok }`. Senza `username`, il primo proprietario (`ADMIN_USERNAME`). |
| `POST /api/admin/login/code` | `{ code }` (codice dell'app di autenticazione o di recupero) | `{ ok }`; richiesto quando il login ha risposto `{ codeRequired: true }` |
| `GET /api/admin/me/two-factor` | | `{ enabled, recoveryCodesLeft }` |
| `POST /api/admin/me/two-factor` | `{ action: "start" }`, `{ action: "confirm", code }`, `{ action: "recovery", code }` | `{ secret, uri, qr }` / `{ enabled, recoveryCodes }` / `{ recoveryCodes }` |
| `DELETE /api/admin/me/two-factor` | `{ password, code }` | `{ enabled: false }` |
| `POST /api/admin/logout` | | `{ ok }` |
| `POST /api/admin/password` | `{ current, next }` | `{ ok }`, per l'account con cui hai effettuato l'accesso |
| `GET /api/admin/me` / `PATCH` | `{ name?, email? }` | `{ account }` |
| `GET /api/admin/accounts` | | Proprietari: `{ accounts }` |
| `POST /api/admin/accounts` | `{ username, role, name?, email?, eventIds?, password? }` | `201 { account, password }`; `password` è quella generata, altrimenti `null` |
| `PATCH /api/admin/accounts/:id` | gli stessi campi, oppure `{ resetPassword: true }`, `{ resetTwoFactor: true }` | `{ account, password }` |
| `DELETE /api/admin/accounts/:id` | | `{ ok }` |
| `GET /api/admin/events` | facoltativi `?page`, `perPage` (1–100, default 20), `q` (il nome contiene) | senza `page` né `q`: `{ events: EventSummary[] }`, tutti gli eventi; con questi: `{ events, total, page, pageCount }` |
| `POST /api/admin/events` | campi dell'evento, `name` obbligatorio | `201 { event }` |
| `GET /api/admin/events/:id` | | `{ event }` |
| `PATCH /api/admin/events/:id` | qualsiasi campo dell'evento | `{ event }` |
| `DELETE /api/admin/events/:id` | | `{ ok }`, foto eliminate dal disco |
| `POST /api/admin/events/:id/rotate` | | `{ event }` con un nuovo slug |
| `POST /api/admin/events/:id/logo` | multipart, campo `logo` | `{ event }` |
| `DELETE /api/admin/events/:id/logo` | | `{ event }` |
| `GET /api/admin/events/:id/qr?format=svg\|png&size=512..4096&download=1` | | Il codice QR con il suo stile |
| `GET /api/admin/events/:id/photos?status=&favorites=1&challenge=&before=` | | `{ photos, nextCursor }` |
| `POST /api/admin/events/:id/photos` | `{ action: "approve"\|"hide"\|"favorite"\|"unfavorite"\|"delete", ids }` | `{ changed }` |
| `POST /api/admin/events/:id/photos/import` | multipart: `photo`, `credit` facoltativo | `201 { photo }`, visibile subito |
| `POST /api/admin/events/:id/duplicate` | `{ name? }` | Proprietari: `201 { event }`, impostazioni senza foto |
| `GET /api/admin/events/:id/archive[?all=1\|?favorites=1]` | | ZIP in streaming; `all=1` include le foto in attesa e nascoste, `favorites=1` sono le preferite visibili |
| `GET /api/admin/webhooks` | | Proprietari: `{ webhooks, deliveries }` |
| `POST /api/admin/webhooks` | `{ name, type: "ntfy"\|"discord"\|"slack"\|"json", url, kinds, secret?, enabled? }` | `201 { webhook }` |
| `PATCH /api/admin/webhooks/:id` / `DELETE` | gli stessi campi; un `url` vuoto lo mantiene | `{ webhook }` / `{ ok }` |
| `POST /api/admin/webhooks/:id/test` | | `{ ok }`, oppure `502 { error: "webhook_failed", message }` |
| `GET /api/admin/backup[?download=1]` | | Proprietari: `{ files, bytes, storage, retentionDays }`, oppure lo ZIP del backup |
| `POST /api/admin/backup/restore` | lo ZIP come body | `{ ok, manifest }`; `400 { details: { file } }` se rifiutato |
| `PUT /api/admin/backup/retention` | `{ days }`: 0, o da 14 a 3650 | `{ retentionDays }` |
| `GET /api/admin/updates` | | Proprietari: `{ current, latest, available, checkEnabled, history, updater }` |
| `POST /api/admin/updates/check` | | `{ available }`, oppure `502` quando GitHub non è raggiungibile |
| `POST /api/admin/updates/apply` | `{ version, skipBackup? }` (solo la versione disponibile) | `202 { job, backup }`; `409/502` se il backup o l'updater falliscono |
| `GET /api/admin/stats[?eventId=]` | | Totali, serie temporali, ospiti più attivi |
| `GET /api/admin/events/:id/messages?status=&before=` | | `{ messages, nextCursor }` |
| `POST /api/admin/events/:id/messages` | `{ action: "approve"\|"hide"\|"delete", ids }` | `{ changed }` |
| `GET /api/admin/events/:id/messages/archive` | | ZIP: `guestbook.txt` e i messaggi vocali |
| `GET /api/admin/events/:id/shares` | | `{ shares }` |
| `POST /api/admin/events/:id/shares` | `{ password?, label?, allowDownload?, favoritesOnly?, expiresInDays? }` | `201 { share, password }`; `password` è quella generata, altrimenti `null` |
| `DELETE /api/admin/events/:id/shares/:shareId` | | `{ ok }`, revocato |
| `POST /api/admin/events/:id/end` | | `{ event, result }`; `400` se già terminato |
| `GET /api/admin/mail` | | Impostazioni SMTP (mai la password), avvisi, coda |
| `PUT /api/admin/mail` | `{ smtp?, adminEmail?, alerts? }` | Come `GET` |
| `POST /api/admin/mail/test` | `{ to? }` | `{ ok, to }`, oppure `502 { error: "smtp_failed", message }` |
| `POST /api/admin/mail/retry` | | `{ requeued, sent, failed }`: le e-mail non riuscite vengono rimesse in coda, poi la coda viene elaborata |

Campi dell'evento: `name`, `description`, `eventDate` (`YYYY-MM-DD`), `accentColor`
(`#rrggbb`), `accessCode` (stringa per impostarlo, `null` per rimuoverlo), `uploadsOpen`,
`uploadsCloseAt` (epoch ms o `null`), `moderation` (`post`|`pre`),
`captureMode` (`camera`|`picker`|`both`), `askGuestName`, `maxPhotosPerGuest`,
`defaultLocale` (`en`|`fr`|`it`|`es`|`null`), `collectGuestEmails`,
`notifyAdminSummary`, `emailGuestsGallery`, `galleryLinkDays` (0–3650),
`galleryLinkDownload`, `galleryMailIncludesPassword`, `galleryLinkFavorites`, `guestbookEnabled`, `guestbookVoice`, `guestbookInGallery`, `challenges` (lista di `{ id?, label }` o di stringhe; gli id vengono mantenuti, ai nuovi ne viene assegnato uno), `wallStyle` (oggetto, vedi `src/lib/wall.ts`), `frame` (`none`\|`print`\|`border`\|`stamp`), `captureFilters`, `qrStyle` (oggetto, vedi
`src/lib/qr/style.ts`).

## Health {#health}

`GET /api/health` restituisce `200 {"status":"ok"}`, oppure `503` quando il
database non è leggibile.
