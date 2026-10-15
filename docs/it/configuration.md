# Configurazione

Guestroll si configura solo con variabili d'ambiente. Ogni variabile è
facoltativa: un'istanza vuota parte con valori predefiniti sicuri. Un modello
completo si trova in [`.env.example`](../../.env.example).

I valori non validi fermano il server all'avvio con un messaggio che nomina la
variabile, invece di farlo girare con un ripiego silenzioso.

## Docker e rete {#docker-and-network}

Queste variabili le legge il container o `docker-compose.yml`, non l'app stessa.

| Variabile | Predefinito | Descrizione |
|---|---|---|
| `PORT` | `3000` | Porta su cui il server ascolta dentro il container (o sulla macchina senza Docker). Il controllo di salute la segue. |
| `HOSTNAME` | `0.0.0.0` | Interfaccia su cui il server si mette in ascolto dentro il container. |
| `HOST_PORT` | `3000` | Solo Compose: porta pubblicata sull'host. |
| `HOST_BIND` | `0.0.0.0` | Solo Compose: interfaccia dell'host su cui pubblicare. `127.0.0.1` rende Guestroll raggiungibile solo attraverso un reverse proxy locale. |
| `DATA_PATH` | `guestroll-data` | Solo Compose: volume con nome o percorso dell'host montato su `/data`. |
| `PUID` / `PGID` | `1001` | Utente e gruppo proprietari della cartella dei dati e che eseguono il server. Allineali al tuo utente dell'host per i bind mount. |
| `TZ` | `UTC` | Fuso orario delle statistiche (raggruppamenti orari e giornalieri), ad es. `Europe/Paris`. |
| `GUESTROLL_IMAGE` | `ghcr.io/achedon12/guestroll:latest` | Solo Compose: immagine da eseguire. Fissa una versione in produzione. |
| `CONTAINER_NAME` | `guestroll` | Solo Compose: ti permette di far girare più istanze una accanto all'altra. |

## Istanza {#instance}

| Variabile | Predefinito | Descrizione |
|---|---|---|
| `APP_NAME` | `Guestroll` | Mostrato nei titoli delle pagine, nell'intestazione dell'admin e nelle card social. |
| `PUBLIC_URL` | *(host della richiesta)* | Origine pubblica codificata nei codici QR e nelle card social, ad es. `https://photos.example.com`. Impostala: dietro un proxy, l'host della richiesta può essere un nome interno. |
| `DATA_DIR` | `./data` (`/data` in Docker) | Dove stanno il database SQLite e le foto. |

## Lingue {#languages}

Guestroll parla inglese (`en`), francese (`fr`), italiano (`it`) e spagnolo (`es`).
Ogni visitatore riceve, in quest'ordine:

1. la lingua che ha scelto con il menu delle lingue (conservata nel suo browser);
2. la lingua dell'album, se gli organizzatori l'hanno impostata nelle impostazioni dell'evento;
3. la lingua del suo browser, se supportata e se `DETECT_BROWSER_LOCALE` è attivo;
4. `DEFAULT_LOCALE`.

| Variabile | Predefinito | Descrizione |
|---|---|---|
| `DEFAULT_LOCALE` | `en` | Lingua usata quando non si applica nulla di più specifico. |
| `DETECT_BROWSER_LOCALE` | `true` | `false` salta il passo 3: chi non ha scelto riceve la lingua dell'album o `DEFAULT_LOCALE`. |

## Sicurezza {#security}

| Variabile | Predefinito | Descrizione |
|---|---|---|
| `ADMIN_USERNAME` | `admin` | Nome utente dell'account proprietario creato al primo avvio. |
| `ADMIN_PASSWORD` | *(generata)* | Password di quell'account proprietario. Se impostata, prevale a ogni avvio (e l'account resta proprietario): è la via per rientrare se tutte le altre password sono andate perse. Se vuota, al primo avvio viene generata una password, stampata una sola volta nei log; cambiala in **Admin → Impostazioni**. Gli altri account si creano dall'admin. |
| `SESSION_SECRET` | *(generato)* | Chiave che firma e cifra i cookie, 32+ caratteri. Se vuota, ne viene generata una e salvata in `DATA_DIR/.session-secret`. Cambiarla disconnette tutti. |
| `TRUST_PROXY` | `false` | Legge l'IP del client da `X-Forwarded-For` e l'host da `X-Forwarded-Host`. Attivala **solo** dietro un reverse proxy che controlli, altrimenti i limiti di frequenza si possono aggirare con un header falsificato. |
| `SECURE_COOKIES` | `true` in produzione | I cookie viaggiano solo in HTTPS. Impostala a `false` solo per fare test in HTTP semplice su una rete locale. |
| `WEBHOOK_ALLOW_PRIVATE` | `false` | Permette ai webhook di raggiungere indirizzi privati, di loopback e link-local (un ntfy o un Home Assistant self-hosted sulla tua rete). Se disattivata, un webhook verso un indirizzo simile fallisce con un messaggio che lo dice: il webhook di un proprietario non può sondare la rete del server stesso né i metadati del cloud. |

## Caricamenti {#uploads}

| Variabile | Predefinito | Descrizione |
|---|---|---|
| `MAX_UPLOAD_MB` | `25` | Foto più grande accettata. I telefoni ridimensionano prima di inviare, quindi la maggior parte dei caricamenti pesa 1–4 MB. Alza il limite del body del tuo reverse proxy sopra questo valore. |
| `MAX_IMAGE_MEGAPIXELS` | `80` | Le immagini oltre questo valore vengono rifiutate prima della decodifica, il che protegge la memoria dalle «bombe di decompressione». |
| `DEFAULT_CAPTURE_MODE` | `camera` | Modalità di scatto preselezionata per i nuovi eventi: `camera`, `picker` o `both`. |

## Limiti di frequenza {#rate-limits}

Al minuto. I limiti di caricamento valgono per ospite, quelli di accesso per IP del client.

| Variabile | Predefinito | Descrizione |
|---|---|---|
| `RATE_LIMIT_UPLOADS_PER_MINUTE` | `30` | Foto che un ospite può inviare al minuto. |
| `RATE_LIMIT_LOGIN_PER_MINUTE` | `5` | Tentativi di accesso all'admin per IP. |
| `RATE_LIMIT_UNLOCK_PER_MINUTE` | `10` | Tentativi di codice di accesso per ospite; il triplo di questo valore è il tetto di codici sbagliati su un evento, sommando tutti gli ospiti. |

## Archiviazione {#storage}

Foto, loghi e messaggi vocali finiscono di default in una cartella sotto
`DATA_DIR`. Imposta `STORAGE_DRIVER=s3` per tenerli invece in un qualsiasi
bucket compatibile S3 (AWS S3, Backblaze B2, Cloudflare R2, Wasabi, Garage,
RustFS, SeaweedFS…). Il database SQLite resta sempre in `DATA_DIR`, quindi
conserva il volume in ogni caso.

| Variabile | Predefinito | Descrizione |
|---|---|---|
| `STORAGE_DRIVER` | `local` | `local` o `s3`. |
| `S3_ENDPOINT` | *(nessuno)* | ad es. `https://s3.eu-west-3.amazonaws.com`, `https://<account>.r2.cloudflarestorage.com`, `http://garage:3900`. |
| `S3_REGION` | `us-east-1` | Regione usata per firmare le richieste. La maggior parte dei server self-hosted accetta il valore predefinito. |
| `S3_BUCKET` | *(nessuno)* | Il bucket deve esistere. Tienilo **privato**: Guestroll serve ogni file da sé, dopo aver verificato l'accesso. |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | *(nessuno)* | Credenziali autorizzate a leggere, scrivere, elencare ed eliminare nel bucket. |
| `S3_PREFIX` | *(nessuno)* | Cartella dentro il bucket, per condividere un bucket tra più istanze. |
| `S3_FORCE_PATH_STYLE` | `true` | `true` invia `endpoint/bucket/key`; `false` invia `bucket.endpoint/key` (stile virtual-hosted di AWS). |

All'avvio Guestroll scrive, rilegge ed elimina un piccolo file di prova, e
registra `[storage] S3 bucket NOT usable` con il motivo se qualcosa va storto.
I file non vengono mai serviti direttamente dal bucket, quindi le foto restano
private anche con un bucket su un endpoint pubblico. Per spostare le foto
esistenti in un bucket, fai un backup (Admin → Impostazioni → Dati), cambia il
driver, poi ripristinalo.

## Backup pianificati {#scheduled-backups}

I proprietari li impostano in **Admin → Impostazioni → Dati**; queste variabili
li impostano invece dall'ambiente (l'admin li mostra allora in sola lettura).
Ogni backup è lo stesso ZIP di uno manuale: database, ogni foto, logo e
messaggio vocale, e il segreto di sessione generato.

| Variabile | Predefinito | Descrizione |
|---|---|---|
| `BACKUP_CRON` | *(nessuno)* | Attiva i backup pianificati, ad es. `0 3 * * *` (ogni notte alle 3:00, in `TZ`). Cinque campi. |
| `BACKUP_KEEP` | `7` | Quanti backup conservare; i più vecchi vengono eliminati dopo ogni nuovo backup. |
| `BACKUP_DIR` | `DATA_DIR/backups` | Dove finiscono. Monta qui un altro disco: un backup sullo stesso disco delle foto non sopravvive a quel disco. |
| `BACKUP_S3_ENDPOINT`, `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY`, `BACKUP_S3_REGION`, `BACKUP_S3_PREFIX`, `BACKUP_S3_FORCE_PATH_STYLE` | *(nessuno)* | Li invia a un bucket compatibile S3 invece che a una cartella (con `BACKUP_S3_BUCKET` impostato). Usa un bucket diverso da quello delle foto. Gli archivi grandi vengono caricati in parti da 16 MB. |

Un backup non riuscito invia un'e-mail ai proprietari e all'indirizzo
dell'istanza, e notifica i webhook iscritti a *Un backup pianificato non è
riuscito*.

## Demo {#demo}

| Variabile | Predefinito | Descrizione |
|---|---|---|
| `DEMO_MODE` | `false` | Una demo pubblica: contenuti iniziali, l'account `demo`, azzeramento notturno, nulla inviato all'esterno. Vedi [Deployment](deployment.md#a-public-demo). |
| `DEMO_RESET_CRON` | `0 4 * * *` | Quando la demo torna ai contenuti iniziali, in `TZ`. |

## Aggiornamenti {#updates}

| Variabile | Predefinito | Descrizione |
|---|---|---|
| `UPDATE_CHECK` | `true` | Chiede a GitHub ogni 12 ore l'ultima release e avvisa i proprietari delle nuove. `false` non fa nessuna chiamata in uscita. |
| `UPDATER_URL` | *(nessuno)* | Dove risponde il container updater, `http://updater:9900` con il file compose incluso. Attiva gli aggiornamenti con un clic. |
| `UPDATER_TOKEN` | *(nessuno)* | Un segreto casuale lungo condiviso dall'app e dall'updater (24+ caratteri). |

L'updater stesso legge `UPDATER_TOKEN`, `UPDATER_CONTAINER` (il container da
sostituire, `guestroll` di default) e `UPDATER_PORT` (`9900`). Vedi
[Deployment](deployment.md#upgrades).

## E-mail {#email}

Facoltativa. Senza SMTP, tutto il resto funziona e non viene mai inviata
nessuna e-mail. L'SMTP si può impostare anche in **Admin → Impostazioni →
Notifiche**, dove la password viene salvata cifrata (AES-256-GCM, chiave
derivata da `SESSION_SECRET`). Quando `SMTP_HOST` è impostata, l'ambiente
prevale e il modulo dell'admin è in sola lettura.

| Variabile | Predefinito | Descrizione |
|---|---|---|
| `SMTP_HOST` | *(nessuno)* | Server SMTP, ad es. `smtp.fastmail.com`. Impostarla attiva l'e-mail. |
| `SMTP_PORT` | `587` | `587` (STARTTLS) o `465` (TLS). |
| `SMTP_SECURE` | `false` | `true` per TLS implicito sulla porta 465. |
| `SMTP_USER` / `SMTP_PASSWORD` | *(nessuno)* | Credenziali, quando il server le richiede. |
| `SMTP_FROM` | `SMTP_USER` | Mittente, ad es. `Guestroll <photos@example.com>`. |
| `SMTP_ALLOW_PLAIN` | `false` | Con un utente impostato, le credenziali vengono inviate solo dopo che la connessione è cifrata (TLS implicito o STARTTLS), così nessuno lungo il percorso può rimuovere STARTTLS e leggerle. `true` per un relay senza TLS sulla stessa macchina o su una rete fidata. |
| `ADMIN_EMAIL` | *(nessuno)* | Dove vanno gli avvisi e i riepiloghi degli eventi. Impostabile nell'admin se vuota. |
| `SCHEDULER_INTERVAL_SECONDS` | `60` | Ogni quanto il processo in background invia le e-mail in coda, chiude gli eventi programmati e controlla gli avvisi. `0` lo disattiva. |

Le e-mail attendono in una coda nel database e vengono ritentate dopo 1, 5, 15
minuti, 1 e 6 ore, poi segnate come non riuscite (Admin → Impostazioni le
mostra, con un pulsante per ritentare). Imposta `PUBLIC_URL`: i link nelle
e-mail vengono costruiti a partire da essa, perché un processo in background
non ha una richiesta da cui leggere l'host.
