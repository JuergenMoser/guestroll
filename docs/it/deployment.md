# Deployment

## Requisiti {#requirements}

- Docker 20.10+ (oppure Node.js 22.12+ per farlo girare senza Docker)
- Circa 256 MB di RAM. L'elaborazione delle immagini arriva a ~150 MB per ogni caricamento in corso.
- Spazio su disco per le foto: circa 3 MB per foto (originale più due anteprime)
- Un nome di dominio con HTTPS (richiesto dalle fotocamere dei telefoni)

Le immagini sono pubblicate per `linux/amd64` e `linux/arm64` su
[GHCR](https://github.com/achedon12/guestroll/pkgs/container/guestroll) (`ghcr.io/achedon12/guestroll`)
e [Docker Hub](https://hub.docker.com/r/achedon12/guestroll) (`achedon12/guestroll`), con gli stessi tag.

| Tag | Significato |
|---|---|
| `latest` | L'ultima release |
| `1`, `1.2` | L'ultima release di quella linea major / minor |
| `1.2.3` | Una release precisa. Fissa questa in produzione. |

## Docker Compose {#docker-compose}

```yaml
services:
  guestroll:
    image: ghcr.io/achedon12/guestroll:1
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000" # only reachable through the reverse proxy
    environment:
      PUBLIC_URL: https://photos.example.com
      ADMIN_PASSWORD: ${GUESTROLL_ADMIN_PASSWORD}
      TRUST_PROXY: "true"
    volumes:
      - ./data:/data
```

Con un bind mount (`./data`), imposta `PUID` e `PGID` sul proprietario di quella
cartella (`id -u`, `id -g`): all'avvio il container assegna la cartella a
quell'utente, poi abbandona root ed esegue il server con quell'utente. Avvialo
con `--user` per saltare del tutto questo passaggio e gestire tu i permessi.

Il [`docker-compose.yml`](../../docker-compose.yml) del repository legge tutto
da `.env`, compresi la porta pubblicata (`HOST_PORT`), l'interfaccia su cui si
mette in ascolto (`HOST_BIND`), il percorso dei dati e il tag dell'immagine:

```bash
cp .env.example .env   # then edit it
docker compose up -d
```

## HTTPS e reverse proxy {#https-and-reverse-proxies}

Dietro un proxy imposta sempre `TRUST_PROXY=true`, e **solo** in quel caso: fa
sì che Guestroll legga l'IP del client da `X-Forwarded-For`, che chiunque
potrebbe falsificare senza un proxy davanti.

Alza il limite di dimensione del body del proxy sopra `MAX_UPLOAD_MB` (25 MB di default).

### Caddy {#caddy}

```caddy
photos.example.com {
	request_body {
		max_size 30MB
	}
	reverse_proxy guestroll:3000
}
```

### Traefik (label) {#traefik-labels}

```yaml
    labels:
      - traefik.enable=true
      - traefik.http.routers.guestroll.rule=Host(`photos.example.com`)
      - traefik.http.routers.guestroll.entrypoints=websecure
      - traefik.http.routers.guestroll.tls.certresolver=letsencrypt
      - traefik.http.services.guestroll.loadbalancer.server.port=3000
```

### nginx {#nginx}

```nginx
server {
    listen 443 ssl http2;
    server_name photos.example.com;
    # ssl_certificate / ssl_certificate_key …

    client_max_body_size 30m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # Stream ZIP downloads instead of buffering them on disk.
        proxy_buffering off;
    }
}
```

## Senza Docker {#without-docker}

```bash
git clone https://github.com/achedon12/guestroll && cd guestroll
npm ci
npm run build
cp -r .next/static .next/standalone/.next/ && cp -r drizzle .next/standalone/
cd .next/standalone
DATA_DIR=/var/lib/guestroll ADMIN_PASSWORD=… PUBLIC_URL=… node server.js
```

Fallo girare sotto systemd o un altro supervisore, con un utente non privilegiato proprietario di `DATA_DIR`.

## Una demo pubblica {#a-public-demo}

`DEMO_MODE=true` trasforma un'istanza in una demo che chiunque può provare:
`docker compose -f docker-compose.demo.yml up -d`.

- Al primo avvio crea tre eventi (un matrimonio con sfide, libro degli ospiti,
  preferite, cornici e una parete a mosaico; un compleanno con moderazione; una
  conferenza) con foto, messaggi e un link alla galleria generati.
- Un account proprietario condiviso, `demo` / `guestroll-demo`, è mostrato
  nella pagina di accesso e in un banner su ogni pagina, insieme alla password
  del link alla galleria.
- Tutto viene azzerato secondo `DEMO_RESET_CRON` (ogni notte alle 4:00 UTC):
  eventi, foto e account dei visitatori spariscono, e i contenuti iniziali
  vengono ricreati.
- Nulla esce dall'istanza: e-mail e webhook restano in coda, il controllo degli
  aggiornamenti è disattivato, e le impostazioni di e-mail, webhook, backup,
  aggiornamenti, password, verifica in due passaggi e account rispondono `403`.
  `ADMIN_PASSWORD` resta l'account `admin` personale dell'operatore.

## Backup {#backups}

Il modo più semplice: **Admin → Impostazioni → Dati → Scarica un backup**
(proprietari). Un unico ZIP con il database (uno snapshot a caldo, coerente
anche mentre gli ospiti continuano a caricare), ogni foto, logo e messaggio
vocale qualunque sia il driver di archiviazione, e il segreto di sessione
generato. **Ripristina**, nella stessa pagina, sostituisce l'intera istanza con
un backup; è anche il modo per spostare le foto dal disco a un bucket S3 (fai
il backup, imposta `STORAGE_DRIVER=s3`, riavvia, ripristina). I ripristini
vengono inviati come un unico caricamento: alza il limite del body del tuo
reverse proxy (`client_max_body_size` in nginx) sopra la dimensione del backup.

Per automatizzarlo con uno script, lo stesso ZIP arriva da
`GET /api/admin/backup?download=1` con la sessione di un proprietario. Oppure
copia tu la cartella dei dati; tutto sta in `/data`:

```
/data
├── guestroll.db          # events, photo metadata, stats, accounts, settings
├── guestroll.db-wal      # SQLite write-ahead log, part of the database
├── .session-secret       # only if SESSION_SECRET isn't set
└── uploads/<event-id>/   # photos, logo, messages/ (empty with STORAGE_DRIVER=s3)
```

Per una copia coerente mentre l'app gira, fai il backup del database con il
backup a caldo di SQLite, poi dei file:

```bash
docker exec guestroll node -e "require('better-sqlite3')('/data/guestroll.db').backup('/data/backup.db').then(()=>console.log('ok'))"
tar czf guestroll-$(date +%F).tgz -C /var/lib/docker/volumes/guestroll-data/_data backup.db uploads
```

Copiare la cartella a container fermo funziona altrettanto bene.

## Aggiornamenti {#upgrades}

Guestroll controlla su GitHub la presenza di nuove release ogni 12 ore. Quando
ne esce una, i proprietari ricevono un'e-mail (così come i webhook iscritti a
*È disponibile una nuova versione*), e **Admin → Impostazioni → Sistema** ne
mostra le note di rilascio.

### Dall'admin, con un clic {#from-the-admin-in-one-click}

Come in Matomo: **Aggiorna a X.Y.Z** fa un backup completo, poi sostituisce il
container in esecuzione con lo stesso container sulla nuova immagine (volumi,
porte, reti, variabili e policy di riavvio mantenuti), attende il suo controllo
di salute e rimette il container precedente se il nuovo non risulta sano. Le
migrazioni del database girano da sole all'avvio; la cronologia degli
aggiornamenti elenca quelle applicate da ciascun aggiornamento.

Serve il piccolo container **updater** accanto a Guestroll, perché un
container non può sostituire sé stesso:

```bash
# .env
UPDATER_URL=http://updater:9900
UPDATER_TOKEN=$(openssl rand -hex 32)   # paste the value

docker compose --profile updater up -d
```

L'updater ha accesso al socket Docker, il che equivale a root sull'host. Non
pubblica nessuna porta, risponde solo con il token, sostituisce soltanto il
container di Guestroll e scarica solo nuove versioni dell'immagine di quel
container. Lascialo spento se preferisci non far girare nulla con il socket:
gli aggiornamenti restano allora un comando.

### Dal server {#from-the-server}

```bash
docker compose pull && docker compose up -d
```

In entrambi i casi, leggi prima la lista **Upgrading** delle note di rilascio.
Ogni release viene testata avviandola sui dati della precedente (vedi
[Sviluppo](development.md#upgrades)).

## Controllo di salute {#health-check}

`GET /api/health` restituisce `200 {"status":"ok"}` quando il database è
leggibile, `503` altrimenti. L'immagine lo dichiara come suo `HEALTHCHECK` Docker.
