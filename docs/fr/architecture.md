# Architecture

Une application Next.js, un processus, un fichier SQLite, un dossier de photos.

```
                    ┌────────────────────── Guestroll (Node.js) ───────────────────────┐
 phone ──QR code──▶ │ /e/[slug]          guest page (server component + client app)   │
                    │ /api/e/[slug]/*    join, unlock, name, upload, own photos       │
                    │ /api/media/[id]    the only way a photo leaves the server       │
 laptop ──────────▶ │ /admin/*           admin pages                                  │
                    │ /api/admin/*       events, moderation, QR, archives, stats      │
                    │                                                                  │
                    │ lib/policy.ts ◀── every access decision, pure and tested        │
                    │ lib/*        ──▶ SQLite (Drizzle)   ──▶ DATA_DIR/guestroll.db   │
                    │              ──▶ files               ──▶ DATA_DIR/uploads/       │
                    └──────────────────────────────────────────────────────────────────┘
```

## Parcours d'une requête : un invité prend une photo {#request-flow-a-guest-takes-a-photo}

1. Le QR code ouvre `/e/<slug>`. Le composant serveur cherche l'évènement ; si
   le navigateur ne l'a pas encore rejoint, il affiche `AutoJoin` (sans code) ou
   `UnlockScreen` (avec code). Rejoindre inscrit l'identifiant de l'évènement dans le cookie chiffré
   `gr_guest`.
2. La page invité affiche le composant de capture choisi pour l'évènement
   (`components/capture/registry.ts`) à l'intérieur de `CaptureHost`.
3. Le composant de capture appelle `onFiles(files)`. `useUploadQueue` compresse
   chaque fichier dans le navigateur, puis l'envoie avec sa progression, un à la fois,
   en réessayant sur les erreurs réseau et en attendant pendant les coupures.
4. `POST /api/e/<slug>/photos` vérifie l'origine, l'adhésion, l'état des envois
   et le quota (`lib/policy.ts`), prend un verrou par invité, lit le corps avec un
   plafond de taille, identifie et réencode l'image (`lib/images/process.ts`) en
   trois variantes, les écrit sous `DATA_DIR/uploads/<event>/` et insère
   la ligne.
5. La photo revient sous forme de `PhotoDto` : identifiants et dimensions, jamais un chemin.
   Les miniatures se chargent depuis `/api/media/<id>?v=thumb`, qui revérifie l'accès.

## Organisation du code {#code-layout}

```
src/
├── app/                      routes (Next.js App Router)
│   ├── e/[slug]/             guest page and its social card
│   ├── admin/                login, (panel)/ pages, poster, live wall
│   └── api/                  route handlers, thin: validate, ask policy, call lib
├── components/
│   ├── ui/                   design-system primitives (Button, Field, SegmentedControl…)
│   ├── capture/              swappable capture components and their contract
│   ├── upload/               CaptureHost, upload queue, exposure counter, prints tray
│   ├── guest/                guest page pieces
│   └── admin/                admin pieces (event-form/, moderation/, qr/…)
└── lib/
    ├── policy.ts             all access rules, no I/O
    ├── validation.ts         request body parsing, no I/O
    ├── db/                   Drizzle schema and client (migrations in /drizzle)
    ├── auth/                 admin password, sessions, page guard
    ├── security/             rate limiter, request helpers, ids
    ├── images/               upload and logo processing (sharp)
    ├── storage/              file paths and I/O
    ├── qr/                   style parsing, the SVG renderer, server export
    ├── i18n/                 messages (en, fr, it, es), locale resolution
    └── events.ts, photos.ts, stats.ts, archive.ts   data access
```

Deux règles gardent l'ensemble maintenable :

- **Les règles d'accès vivent uniquement dans `lib/policy.ts`.** Les routes l'interrogent ; elles ne
  redéduisent jamais une règle sur place. Le filtre SQL de `listPhotos` reproduit
  `canViewPhoto` et constitue la seule exception, commentée comme telle.
- **Le code navigateur n'importe jamais de module serveur.** Tout ce qui est partagé avec des composants
  client vit dans des modules sans import Node (`lib/constants.ts`,
  `lib/qr/render.ts`, `lib/i18n/messages.ts`). Les modules réservés au serveur importent
  `server-only`, si bien qu'une erreur fait échouer le build.

## Updater {#updater}

`updater/` est un programme Node séparé, sans dépendance, livré dans la même
image (profil `docker-compose` `updater`). `docker.mjs` parle à l'API Docker
Engine par le socket, `update.mjs` remplace un conteneur par le même
sur une nouvelle image (en gardant ses propres réglages, pas les valeurs par défaut de son ancienne image)
et revient en arrière quand le contrôle de santé échoue, `server.mjs` reçoit les requêtes de l'application
authentifiées par jeton. Côté application, il y a `src/lib/updates.ts` (vérifications auprès de GitHub,
historique des mises à jour) et `src/lib/updater.ts` (le client).

## Données {#data}

| Table | Contient |
|---|---|
| `events` | Réglages, empreinte du code d'accès, style du QR code (JSON), version du logo |
| `photos` | Une ligne par photo : évènement, identifiant d'invité, nom facultatif, taille, statut, nombre de téléchargements |
| `activity` | Journal en ajout seul derrière chaque statistique (vue, envoi, téléchargement, code erroné…) |
| `accounts` | Comptes d'admin : identifiant, empreinte du mot de passe, rôle (`owner` / `organizer`), version de session |
| `account_events` | Les évènements que gère chaque organisateur |
| `settings` | Clé/valeur : SMTP (mot de passe scellé), choix des alertes, e-mail de l'instance |
| `share_links` | Liens de galerie : jeton, empreinte du mot de passe, expiration, option de téléchargement, vues, révocation |
| `guest_contacts` | E-mails des invités volontaires, un par invité et par évènement, supprimés avec l'évènement |
| `messages` | Livre d'or : texte, conteneur et taille du message vocal, statut. Le fichier audio est `<event-id>/messages/<id>.<ext>` dans le stockage |
| `webhook_deliveries` | File des webhooks : la notification en JSON, mise en forme pour le service à l'envoi, relancée comme les e-mails |
| `outbox` | File des e-mails : message rendu, état, tentatives, prochaine relance, clé de dédoublonnage |

Les invités n'ont pas de table : un invité est un identifiant aléatoire dans son cookie. Son nom est
copié sur chaque photo qu'il envoie.

Fichiers : `<event-id>/<photo-id>.{original.jpg,display.webp,thumb.webp}` et
`<event-id>/logo.png`, dans `DATA_DIR/uploads` ou dans un bucket S3. Les deux pilotes
implémentent `StorageDriver` (`src/lib/storage/driver.ts`) et passent le même
test de contrat (`tests/integration/storage.test.ts`) ; celui pour S3 signe de simples
appels `fetch` (aws4fetch) au lieu d'embarquer le SDK AWS.

## Des choix à connaître {#choices-worth-knowing}

- **Le gros du travail sur les médias se fait dans le navigateur.** Les cadres et filtres sont dessinés sur
  le téléphone de l'invité avant l'envoi, et le diaporama vidéo est encodé par le
  navigateur de l'admin (WebCodecs, multiplexé par mediabunny). L'image n'embarque jamais
  ffmpeg, ni son poids, ni ses CVE.

- **L'e-mail passe par une file dans SQLite**, vidée par un planificateur intégré au processus
  (`src/lib/scheduler.ts`, démarré depuis `instrumentation.ts`). Une panne SMTP
  ne fait jamais échouer une requête, et chaque e-mail a une clé de dédoublonnage pour qu'une tâche relancée
  ne puisse pas l'envoyer deux fois. La fin d'un évènement est revendiquée de façon atomique sur `ended_at`.

- **SQLite en mode WAL** absorbe sans peine la rafale d'envois d'un mariage et
  réduit les sauvegardes à une copie de fichier. Le revers : un seul processus, pas de passage à l'échelle horizontal.
  C'est aussi pourquoi le limiteur de débit est en mémoire.
- **Réencoder chaque envoi** coûte du CPU mais retire les métadonnées GPS et toute
  charge cachée dans le fichier.
- **Un seul envoi à la fois par invité**, imposé des deux côtés, garde les quotas
  exacts et les téléphones réactifs.
- **Le moteur de rendu du QR code est pur** et partagé par l'aperçu en direct et l'export
  serveur : le fichier téléchargé correspond à l'aperçu.
