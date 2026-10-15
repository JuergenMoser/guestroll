# API HTTP {#http-api}

Las rutas que usa la interfaz. Son estables dentro de una versión mayor, pero
existen para la UI, no como API pública de integración.

Todas las peticiones que modifican algo necesitan una cabecera `Origin` del mismo origen (los navegadores la envían).
Los errores son JSON: `{ "error": "<code>", "details"?: { field: message } }`.

| Código | Estado | Significado |
|---|---|---|
| `bad_request` | 400 | Entrada no válida, consulta `details` |
| `unauthorized` | 401 | Sin sesión de admin, o contraseña incorrecta |
| `invalid_code` | 401 | Código de acceso al evento incorrecto |
| `forbidden` | 403 | Petición entre sitios, o el invitado no se ha unido al evento |
| `uploads_closed` | 403 | Los envíos están desactivados o ha pasado su hora de cierre |
| `quota_reached` | 403 | El invitado alcanzó el límite por invitado |
| `not_found` | 404 | No existe, o existe pero no es tuyo |
| `too_large` | 413 | Cuerpo por encima de `MAX_UPLOAD_MB` |
| `invalid_image` | 415 | No es una imagen compatible |
| `rate_limited` | 429 | Más despacio; consulta `Retry-After` |

## Rutas de invitado {#guest-routes}

Autenticadas por la cookie `gr_guest`.

| Ruta | Cuerpo | Respuesta |
|---|---|---|
| `POST /api/e/:slug/join` | ninguno | `{ ok }`. Solo eventos sin código de acceso. |
| `POST /api/e/:slug/unlock` | `{ code }` | `{ ok }` |
| `POST /api/e/:slug/guest` | `{ name }` | `{ name }`. Se guarda en la cookie. |
| `POST /api/e/:slug/photos` | multipart, campo `photo`, `challenge` opcional (un id de reto) | `201 { photo: PhotoDto }`; un reto desconocido se ignora |
| `DELETE /api/e/:slug/photos/:id` | | `{ ok }`: la foto del propio invitado, archivos incluidos; `404` en otro caso |
| `GET /api/e/:slug/photos?before=<ms>` | | `{ photos: PhotoDto[], nextCursor }`, solo las fotos del propio invitado |
| `GET /api/e/:slug/logo?v=<n>` | | El logo del evento (PNG), público con el slug |
| `GET /api/media/:id?v=thumb\|display\|original[&download=1]` | | La imagen, si quien la mira tiene permiso para verla |

| `POST /api/e/:slug/contact` | `{ email }` | `{ email }`. Solo en eventos que recogen correos. |
| `DELETE /api/e/:slug/contact` | | `{ ok }`, la dirección se elimina |

| `GET /api/e/:slug/messages` | | `{ messages: MessageDto[] }`, los del propio invitado |
| `POST /api/e/:slug/messages` | multipart: `text` y/o `audio`, `seconds` | `201 { message }` |
| `DELETE /api/e/:slug/messages/:id` | | `{ ok }`, solo los del propio invitado |
| `GET /api/messages/:id/audio[?download=1]` | | La nota de voz, si quien la pide tiene permiso para escucharla |

### Rutas de enlaces a la galería {#gallery-link-routes}

Autenticadas por la cookie `gr_share`, que define `unlock`.

| Ruta | Cuerpo | Respuesta |
|---|---|---|
| `POST /api/g/:token/unlock` | `{ password }` | `{ ok }`, o `invalid_code` |
| `GET /api/g/:token/photos?challenge=&before=<ms>` | | `{ photos, nextCursor }`, solo fotos visibles; `403` hasta desbloquear |
| `GET /api/g/:token/messages?before=` | | `{ messages, nextCursor }`, cuando los anfitriones comparten el libro de visitas |
| `GET /api/g/:token/archive` | | ZIP transmitido al momento, si el enlace permite descargas |

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

## Rutas de administración {#admin-routes}

Autenticadas por la cookie `gr_admin`. Las rutas bajo `/api/admin/events/:id`
responden `404` para los eventos fuera del alcance de un organizador; la creación y
eliminación de eventos, las cuentas y los ajustes de correo son para los propietarios (`403` en otro caso).

| Ruta | Cuerpo | Respuesta |
|---|---|---|
| `POST /api/admin/login` | `{ username, password }` | `{ ok }`. Sin `username`, el primer propietario (`ADMIN_USERNAME`). |
| `POST /api/admin/login/code` | `{ code }` (código de autenticación o de recuperación) | `{ ok }`; obligatorio cuando el login respondió `{ codeRequired: true }` |
| `GET /api/admin/me/two-factor` | | `{ enabled, recoveryCodesLeft }` |
| `POST /api/admin/me/two-factor` | `{ action: "start" }`, `{ action: "confirm", code }`, `{ action: "recovery", code }` | `{ secret, uri, qr }` / `{ enabled, recoveryCodes }` / `{ recoveryCodes }` |
| `DELETE /api/admin/me/two-factor` | `{ password, code }` | `{ enabled: false }` |
| `POST /api/admin/logout` | | `{ ok }` |
| `POST /api/admin/password` | `{ current, next }` | `{ ok }`, para la cuenta con sesión iniciada |
| `GET /api/admin/me` / `PATCH` | `{ name?, email? }` | `{ account }` |
| `GET /api/admin/accounts` | | Propietarios: `{ accounts }` |
| `POST /api/admin/accounts` | `{ username, role, name?, email?, eventIds?, password? }` | `201 { account, password }`; `password` es la generada, si no `null` |
| `PATCH /api/admin/accounts/:id` | los mismos campos, o `{ resetPassword: true }`, `{ resetTwoFactor: true }` | `{ account, password }` |
| `DELETE /api/admin/accounts/:id` | | `{ ok }` |
| `GET /api/admin/events` | opcionales `?page`, `perPage` (1–100, 20 por defecto), `q` (el nombre contiene) | sin `page` ni `q`: `{ events: EventSummary[] }`, todos los eventos; con ellos: `{ events, total, page, pageCount }` |
| `POST /api/admin/events` | campos del evento, `name` obligatorio | `201 { event }` |
| `GET /api/admin/events/:id` | | `{ event }` |
| `PATCH /api/admin/events/:id` | cualquier campo del evento | `{ event }` |
| `DELETE /api/admin/events/:id` | | `{ ok }`, fotos eliminadas del disco |
| `POST /api/admin/events/:id/rotate` | | `{ event }` con un slug nuevo |
| `POST /api/admin/events/:id/logo` | multipart, campo `logo` | `{ event }` |
| `DELETE /api/admin/events/:id/logo` | | `{ event }` |
| `GET /api/admin/events/:id/qr?format=svg\|png&size=512..4096&download=1` | | El código QR con su estilo |
| `GET /api/admin/events/:id/photos?status=&favorites=1&challenge=&before=` | | `{ photos, nextCursor }` |
| `POST /api/admin/events/:id/photos` | `{ action: "approve"\|"hide"\|"favorite"\|"unfavorite"\|"delete", ids }` | `{ changed }` |
| `POST /api/admin/events/:id/photos/import` | multipart: `photo`, `credit` opcional | `201 { photo }`, visible al momento |
| `POST /api/admin/events/:id/duplicate` | `{ name? }` | Propietarios: `201 { event }`, los ajustes sin las fotos |
| `GET /api/admin/events/:id/archive[?all=1\|?favorites=1]` | | ZIP transmitido al momento; `all=1` incluye las pendientes y ocultas, `favorites=1` son las favoritas visibles |
| `GET /api/admin/webhooks` | | Propietarios: `{ webhooks, deliveries }` |
| `POST /api/admin/webhooks` | `{ name, type: "ntfy"\|"discord"\|"slack"\|"json", url, kinds, secret?, enabled? }` | `201 { webhook }` |
| `PATCH /api/admin/webhooks/:id` / `DELETE` | los mismos campos; una `url` vacía la conserva | `{ webhook }` / `{ ok }` |
| `POST /api/admin/webhooks/:id/test` | | `{ ok }`, o `502 { error: "webhook_failed", message }` |
| `GET /api/admin/backup[?download=1]` | | Propietarios: `{ files, bytes, storage, retentionDays }`, o el ZIP de la copia |
| `POST /api/admin/backup/restore` | el ZIP como cuerpo | `{ ok, manifest }`; `400 { details: { file } }` si se rechaza |
| `PUT /api/admin/backup/retention` | `{ days }`: 0, o de 14 a 3650 | `{ retentionDays }` |
| `GET /api/admin/updates` | | Propietarios: `{ current, latest, available, checkEnabled, history, updater }` |
| `POST /api/admin/updates/check` | | `{ available }`, o `502` cuando no se puede contactar con GitHub |
| `POST /api/admin/updates/apply` | `{ version, skipBackup? }` (solo la versión disponible) | `202 { job, backup }`; `409/502` si falla la copia o el updater |
| `GET /api/admin/stats[?eventId=]` | | Totales, series temporales, invitados más activos |
| `GET /api/admin/events/:id/messages?status=&before=` | | `{ messages, nextCursor }` |
| `POST /api/admin/events/:id/messages` | `{ action: "approve"\|"hide"\|"delete", ids }` | `{ changed }` |
| `GET /api/admin/events/:id/messages/archive` | | ZIP: `guestbook.txt` y las notas de voz |
| `GET /api/admin/events/:id/shares` | | `{ shares }` |
| `POST /api/admin/events/:id/shares` | `{ password?, label?, allowDownload?, favoritesOnly?, expiresInDays? }` | `201 { share, password }`; `password` es la generada, si no `null` |
| `DELETE /api/admin/events/:id/shares/:shareId` | | `{ ok }`, revocado |
| `POST /api/admin/events/:id/end` | | `{ event, result }`; `400` si ya terminó |
| `GET /api/admin/mail` | | Ajustes SMTP (nunca la contraseña), alertas, cola |
| `PUT /api/admin/mail` | `{ smtp?, adminEmail?, alerts? }` | Igual que `GET` |
| `POST /api/admin/mail/test` | `{ to? }` | `{ ok, to }`, o `502 { error: "smtp_failed", message }` |
| `POST /api/admin/mail/retry` | | `{ requeued, sent, failed }`: los correos fallidos vuelven a la cola y luego se procesa la cola |

Campos del evento: `name`, `description`, `eventDate` (`YYYY-MM-DD`), `accentColor`
(`#rrggbb`), `accessCode` (cadena para definirlo, `null` para quitarlo), `uploadsOpen`,
`uploadsCloseAt` (epoch ms o `null`), `moderation` (`post`|`pre`),
`captureMode` (`camera`|`picker`|`both`), `askGuestName`, `maxPhotosPerGuest`,
`defaultLocale` (`en`|`fr`|`it`|`es`|`null`), `collectGuestEmails`,
`notifyAdminSummary`, `emailGuestsGallery`, `galleryLinkDays` (0–3650),
`galleryLinkDownload`, `galleryMailIncludesPassword`, `galleryLinkFavorites`, `guestbookEnabled`, `guestbookVoice`, `guestbookInGallery`, `challenges` (lista de `{ id?, label }` o cadenas; los ids se conservan, los nuevos se asignan), `wallStyle` (objeto, consulta `src/lib/wall.ts`), `frame` (`none`\|`print`\|`border`\|`stamp`), `captureFilters`, `qrStyle` (objeto, consulta
`src/lib/qr/style.ts`).

## Salud {#health}

`GET /api/health` devuelve `200 {"status":"ok"}`, o `503` cuando la base de datos
no se puede leer.
