# API HTTP

Les routes qu'utilise l'interface. Elles sont stables au sein d'une version majeure, mais elles
existent pour l'interface, pas comme API d'intégration publique.

Toutes les requêtes qui modifient des données exigent un en-tête `Origin` de même origine (les navigateurs l'envoient).
Les erreurs sont en JSON : `{ "error": "<code>", "details"?: { field: message } }`.

| Code | Statut | Signification |
|---|---|---|
| `bad_request` | 400 | Saisie invalide, voir `details` |
| `unauthorized` | 401 | Pas connecté en admin, ou mauvais mot de passe |
| `invalid_code` | 401 | Mauvais code d'accès à l'évènement |
| `forbidden` | 403 | Requête intersite, ou l'invité n'a pas rejoint l'évènement |
| `uploads_closed` | 403 | Les envois sont désactivés ou leur heure de fermeture est passée |
| `quota_reached` | 403 | L'invité a atteint la limite par invité |
| `not_found` | 404 | N'existe pas, ou existe mais n'est pas à vous |
| `too_large` | 413 | Corps au-delà de `MAX_UPLOAD_MB` |
| `invalid_image` | 415 | Pas une image prise en charge |
| `rate_limited` | 429 | Ralentissez ; voir `Retry-After` |

## Routes invités {#guest-routes}

Authentifiées par le cookie `gr_guest`.

| Route | Corps | Réponse |
|---|---|---|
| `POST /api/e/:slug/join` | aucun | `{ ok }`. Évènements sans code d'accès uniquement. |
| `POST /api/e/:slug/unlock` | `{ code }` | `{ ok }` |
| `POST /api/e/:slug/guest` | `{ name }` | `{ name }`. Stocké dans le cookie. |
| `POST /api/e/:slug/photos` | multipart, champ `photo`, `challenge` facultatif (un identifiant de défi) | `201 { photo: PhotoDto }` ; un défi inconnu est ignoré |
| `DELETE /api/e/:slug/photos/:id` | | `{ ok }` : la photo de l'invité lui-même, fichiers compris ; `404` sinon |
| `GET /api/e/:slug/photos?before=<ms>` | | `{ photos: PhotoDto[], nextCursor }`, uniquement les photos de l'invité lui-même |
| `GET /api/e/:slug/logo?v=<n>` | | Le logo de l'évènement (PNG), public avec le slug |
| `GET /api/media/:id?v=thumb\|display\|original[&download=1]` | | L'image, si celui qui la consulte a le droit de la voir |

| `POST /api/e/:slug/contact` | `{ email }` | `{ email }`. Uniquement sur les évènements qui recueillent les e-mails. |
| `DELETE /api/e/:slug/contact` | | `{ ok }`, l'adresse est supprimée |

| `GET /api/e/:slug/messages` | | `{ messages: MessageDto[] }`, ceux de l'invité lui-même |
| `POST /api/e/:slug/messages` | multipart : `text` et/ou `audio`, `seconds` | `201 { message }` |
| `DELETE /api/e/:slug/messages/:id` | | `{ ok }`, uniquement ceux de l'invité lui-même |
| `GET /api/messages/:id/audio[?download=1]` | | Le message vocal, si celui qui le demande a le droit de l'écouter |

### Routes des liens de galerie {#gallery-link-routes}

Authentifiées par le cookie `gr_share`, posé par `unlock`.

| Route | Corps | Réponse |
|---|---|---|
| `POST /api/g/:token/unlock` | `{ password }` | `{ ok }`, ou `invalid_code` |
| `GET /api/g/:token/photos?challenge=&before=<ms>` | | `{ photos, nextCursor }`, photos visibles uniquement ; `403` tant que le lien n'est pas déverrouillé |
| `GET /api/g/:token/messages?before=` | | `{ messages, nextCursor }`, quand les organisateurs partagent le livre d'or |
| `GET /api/g/:token/archive` | | ZIP diffusé en continu, si le lien autorise les téléchargements |

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

## Routes d'admin {#admin-routes}

Authentifiées par le cookie `gr_admin`. Les routes sous `/api/admin/events/:id`
répondent `404` pour les évènements hors du périmètre d'un organisateur ; la création et la
suppression d'évènements, les comptes et les réglages e-mail sont réservés aux propriétaires (`403` sinon).

| Route | Corps | Réponse |
|---|---|---|
| `POST /api/admin/login` | `{ username, password }` | `{ ok }`. Sans `username`, le premier propriétaire (`ADMIN_USERNAME`). |
| `POST /api/admin/login/code` | `{ code }` (code d'authentification ou de secours) | `{ ok }` ; requis quand la connexion a répondu `{ codeRequired: true }` |
| `GET /api/admin/me/two-factor` | | `{ enabled, recoveryCodesLeft }` |
| `POST /api/admin/me/two-factor` | `{ action: "start" }`, `{ action: "confirm", code }`, `{ action: "recovery", code }` | `{ secret, uri, qr }` / `{ enabled, recoveryCodes }` / `{ recoveryCodes }` |
| `DELETE /api/admin/me/two-factor` | `{ password, code }` | `{ enabled: false }` |
| `POST /api/admin/logout` | | `{ ok }` |
| `POST /api/admin/password` | `{ current, next }` | `{ ok }`, pour le compte connecté |
| `GET /api/admin/me` / `PATCH` | `{ name?, email? }` | `{ account }` |
| `GET /api/admin/accounts` | | Propriétaires : `{ accounts }` |
| `POST /api/admin/accounts` | `{ username, role, name?, email?, eventIds?, password? }` | `201 { account, password }` ; `password` est celui généré, sinon `null` |
| `PATCH /api/admin/accounts/:id` | mêmes champs, ou `{ resetPassword: true }`, `{ resetTwoFactor: true }` | `{ account, password }` |
| `DELETE /api/admin/accounts/:id` | | `{ ok }` |
| `GET /api/admin/events` | `?page`, `perPage` (1–100, 20 par défaut), `q` (le nom contient) facultatifs | sans `page` ni `q` : `{ events: EventSummary[] }`, tous les évènements ; avec : `{ events, total, page, pageCount }` |
| `POST /api/admin/events` | champs d'évènement, `name` requis | `201 { event }` |
| `GET /api/admin/events/:id` | | `{ event }` |
| `PATCH /api/admin/events/:id` | n'importe quels champs d'évènement | `{ event }` |
| `DELETE /api/admin/events/:id` | | `{ ok }`, photos supprimées du disque |
| `POST /api/admin/events/:id/rotate` | | `{ event }` avec un nouveau slug |
| `POST /api/admin/events/:id/logo` | multipart, champ `logo` | `{ event }` |
| `DELETE /api/admin/events/:id/logo` | | `{ event }` |
| `GET /api/admin/events/:id/qr?format=svg\|png&size=512..4096&download=1` | | Le QR code stylisé |
| `GET /api/admin/events/:id/photos?status=&favorites=1&challenge=&before=` | | `{ photos, nextCursor }` |
| `POST /api/admin/events/:id/photos` | `{ action: "approve"\|"hide"\|"favorite"\|"unfavorite"\|"delete", ids }` | `{ changed }` |
| `POST /api/admin/events/:id/photos/import` | multipart : `photo`, `credit` facultatif | `201 { photo }`, visible immédiatement |
| `POST /api/admin/events/:id/duplicate` | `{ name? }` | Propriétaires : `201 { event }`, réglages sans les photos |
| `GET /api/admin/events/:id/archive[?all=1\|?favorites=1]` | | ZIP diffusé en continu ; `all=1` inclut les photos en attente et masquées, `favorites=1` donne les favorites visibles |
| `GET /api/admin/webhooks` | | Propriétaires : `{ webhooks, deliveries }` |
| `POST /api/admin/webhooks` | `{ name, type: "ntfy"\|"discord"\|"slack"\|"json", url, kinds, secret?, enabled? }` | `201 { webhook }` |
| `PATCH /api/admin/webhooks/:id` / `DELETE` | mêmes champs ; une `url` vide garde l'actuelle | `{ webhook }` / `{ ok }` |
| `POST /api/admin/webhooks/:id/test` | | `{ ok }`, ou `502 { error: "webhook_failed", message }` |
| `GET /api/admin/backup[?download=1]` | | Propriétaires : `{ files, bytes, storage, retentionDays }`, ou le ZIP de sauvegarde |
| `POST /api/admin/backup/restore` | le ZIP comme corps | `{ ok, manifest }` ; `400 { details: { file } }` en cas de refus |
| `PUT /api/admin/backup/retention` | `{ days }` : 0, ou de 14 à 3650 | `{ retentionDays }` |
| `GET /api/admin/updates` | | Propriétaires : `{ current, latest, available, checkEnabled, history, updater }` |
| `POST /api/admin/updates/check` | | `{ available }`, ou `502` quand GitHub est injoignable |
| `POST /api/admin/updates/apply` | `{ version, skipBackup? }` (la version disponible uniquement) | `202 { job, backup }` ; `409/502` si la sauvegarde ou l'updater échoue |
| `GET /api/admin/stats[?eventId=]` | | Totaux, séries temporelles, meilleurs invités |
| `GET /api/admin/events/:id/messages?status=&before=` | | `{ messages, nextCursor }` |
| `POST /api/admin/events/:id/messages` | `{ action: "approve"\|"hide"\|"delete", ids }` | `{ changed }` |
| `GET /api/admin/events/:id/messages/archive` | | ZIP : `guestbook.txt` et les messages vocaux |
| `GET /api/admin/events/:id/shares` | | `{ shares }` |
| `POST /api/admin/events/:id/shares` | `{ password?, label?, allowDownload?, favoritesOnly?, expiresInDays? }` | `201 { share, password }` ; `password` est celui généré, sinon `null` |
| `DELETE /api/admin/events/:id/shares/:shareId` | | `{ ok }`, révoqué |
| `POST /api/admin/events/:id/end` | | `{ event, result }` ; `400` si déjà terminé |
| `GET /api/admin/mail` | | Réglages SMTP (jamais le mot de passe), alertes, file d'attente |
| `PUT /api/admin/mail` | `{ smtp?, adminEmail?, alerts? }` | Comme `GET` |
| `POST /api/admin/mail/test` | `{ to? }` | `{ ok, to }`, ou `502 { error: "smtp_failed", message }` |
| `POST /api/admin/mail/retry` | | `{ requeued, sent, failed }` : les e-mails en échec sont remis en file, puis la file est traitée |

Champs d'un évènement : `name`, `description`, `eventDate` (`YYYY-MM-DD`), `accentColor`
(`#rrggbb`), `accessCode` (chaîne pour le définir, `null` pour le retirer), `uploadsOpen`,
`uploadsCloseAt` (epoch en ms ou `null`), `moderation` (`post`|`pre`),
`captureMode` (`camera`|`picker`|`both`), `askGuestName`, `maxPhotosPerGuest`,
`defaultLocale` (`en`|`fr`|`it`|`es`|`null`), `collectGuestEmails`,
`notifyAdminSummary`, `emailGuestsGallery`, `galleryLinkDays` (0–3650),
`galleryLinkDownload`, `galleryMailIncludesPassword`, `galleryLinkFavorites`, `guestbookEnabled`, `guestbookVoice`, `guestbookInGallery`, `challenges` (liste de `{ id?, label }` ou de chaînes ; les identifiants sont conservés, les nouveaux attribués), `wallStyle` (objet, voir `src/lib/wall.ts`), `frame` (`none`\|`print`\|`border`\|`stamp`), `captureFilters`, `qrStyle` (objet, voir
`src/lib/qr/style.ts`).

## Santé {#health}

`GET /api/health` renvoie `200 {"status":"ok"}`, ou `503` quand la base de données
ne peut pas être lue.
