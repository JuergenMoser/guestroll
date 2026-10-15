# Architettura

Un'app Next.js, un processo, un file SQLite, una cartella di foto.

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

## Flusso di una richiesta: un ospite scatta una foto {#request-flow-a-guest-takes-a-photo}

1. Il codice QR apre `/e/<slug>`. Il componente server cerca l'evento; se il
   browser non si è ancora unito, mostra `AutoJoin` (nessun codice) o
   `UnlockScreen` (codice). Unirsi scrive l'id dell'evento nel cookie cifrato
   `gr_guest`.
2. La pagina ospite mostra il componente di scatto scelto per l'evento
   (`components/capture/registry.ts`) dentro `CaptureHost`.
3. Il componente di scatto chiama `onFiles(files)`. `useUploadQueue` comprime
   ogni file nel browser, poi lo carica mostrando l'avanzamento, uno alla
   volta, ritentando in caso di errori di rete e aspettando quando è offline.
4. `POST /api/e/<slug>/photos` verifica l'origine, l'adesione all'evento, lo
   stato dei caricamenti e la quota (`lib/policy.ts`), prende un lock per
   ospite, legge il body con un limite di dimensione, identifica e ricodifica
   l'immagine (`lib/images/process.ts`) in tre varianti, le scrive sotto
   `DATA_DIR/uploads/<event>/` e inserisce la riga.
5. La foto torna indietro come `PhotoDto`: id e dimensioni, mai un percorso.
   Le miniature si caricano da `/api/media/<id>?v=thumb`, che ricontrolla l'accesso.

## Struttura del codice {#code-layout}

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

Due regole mantengono il tutto manutenibile:

- **Le regole di accesso stanno solo in `lib/policy.ts`.** Le route lo
  interrogano; non ricostruiscono mai una regola in linea. Il filtro SQL in
  `listPhotos` rispecchia `canViewPhoto` ed è l'unica eccezione, commentata
  come tale.
- **Il codice del browser non importa mai moduli server.** Tutto ciò che è
  condiviso con i componenti client vive in moduli senza import Node
  (`lib/constants.ts`, `lib/qr/render.ts`, `lib/i18n/messages.ts`). I moduli
  solo server importano `server-only`, così un errore fa fallire la build.

## Updater {#updater}

`updater/` è un programma Node separato e senza dipendenze, distribuito nella
stessa immagine (profilo `docker-compose` `updater`). `docker.mjs` parla con
la Docker Engine API attraverso il socket, `update.mjs` sostituisce un
container con lo stesso container su una nuova immagine (mantenendo le sue
impostazioni, non i valori predefiniti della vecchia immagine) e torna
indietro quando il controllo di salute fallisce, `server.mjs` riceve le
richieste dell'app autenticate con il token. Il lato app è `src/lib/updates.ts`
(controlli su GitHub, cronologia degli aggiornamenti) e `src/lib/updater.ts`
(il client).

## Dati {#data}

| Tabella | Contiene |
|---|---|
| `events` | Impostazioni, hash del codice di accesso, stile del QR (JSON), versione del logo |
| `photos` | Una riga per foto: evento, id dell'ospite, nome facoltativo, dimensione, stato, numero di download |
| `activity` | Registro in sola aggiunta alla base di ogni statistica (visita, caricamento, download, codice errato…) |
| `accounts` | Account admin: nome utente, hash della password, ruolo (`owner` / `organizer`), versione di sessione |
| `account_events` | Quali eventi gestisce ogni organizzatore |
| `settings` | Chiave/valore: SMTP (password cifrata), scelte degli avvisi, e-mail dell'istanza |
| `share_links` | Link alla galleria: token, hash della password, scadenza, interruttore dei download, visite, revoca |
| `guest_contacts` | E-mail degli ospiti con opt-in, una per ospite ed evento, eliminate con l'evento |
| `messages` | Libro degli ospiti: testo, contenitore e dimensione del messaggio vocale, stato. Il file audio è `<event-id>/messages/<id>.<ext>` nell'archiviazione |
| `webhook_deliveries` | Coda dei webhook: l'avviso in JSON, formattato per il servizio all'invio, ritentato come le e-mail |
| `outbox` | Coda delle e-mail: messaggio renderizzato, stato, tentativi, prossimo tentativo, chiave di deduplicazione |

Gli ospiti non hanno una tabella: un ospite è un id casuale nel suo cookie. Il
suo nome viene copiato su ogni foto che invia.

File: `<event-id>/<photo-id>.{original.jpg,display.webp,thumb.webp}` e
`<event-id>/logo.png`, in `DATA_DIR/uploads` o in un bucket S3. Entrambi i
driver implementano `StorageDriver` (`src/lib/storage/driver.ts`) e superano lo
stesso test di contratto (`tests/integration/storage.test.ts`); quello S3 firma
semplici chiamate `fetch` (aws4fetch) invece di includere l'SDK di AWS.

## Scelte da conoscere {#choices-worth-knowing}

- **Il lavoro pesante sui media avviene nel browser.** Cornici e filtri vengono
  disegnati sul telefono dell'ospite prima del caricamento, e il video
  presentazione viene codificato dal browser dell'admin (WebCodecs, mux con
  mediabunny). L'immagine non include mai ffmpeg, né il suo peso né le sue CVE.

- **Le e-mail passano da una coda in SQLite**, svuotata da uno scheduler nel
  processo (`src/lib/scheduler.ts`, avviato da `instrumentation.ts`). Un
  guasto SMTP non fa mai fallire una richiesta, e ogni e-mail ha una chiave di
  deduplicazione, così un job ritentato non può inviarla due volte. La
  chiusura di un evento viene acquisita in modo atomico su `ended_at`.

- **SQLite in modalità WAL** regge senza fatica la raffica di caricamenti di un
  matrimonio e rende i backup una copia di file. Il rovescio della medaglia: un
  solo processo, nessuno scaling orizzontale. È anche il motivo per cui il
  limitatore di frequenza è in memoria.
- **Ricodificare ogni caricamento** costa CPU ma rimuove i metadati GPS e
  qualsiasi payload nascosto nel file.
- **Un caricamento alla volta per ospite**, imposto da entrambi i lati,
  mantiene le quote esatte e i telefoni reattivi.
- **Il renderer QR è puro** e condiviso dall'anteprima live e dall'export
  server, quindi il file scaricato corrisponde all'anteprima.
