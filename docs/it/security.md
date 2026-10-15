# Sicurezza

Guestroll custodisce le foto di altre persone, spesso di bambini, durante
eventi privati. Questa pagina elenca cosa protegge, da chi e come. Se trovi una
falla, segnalala in privato (vedi [SECURITY.md](../../SECURITY.md)).

## Cosa è protetto {#what-is-protected}

| Risorsa | Chi può accedervi |
|---|---|
| Le foto di un ospite | Quell'ospite (dal browser con cui le ha scattate) e gli admin |
| Le foto di tutti gli altri | Solo gli admin. Mai un altro ospite. |
| Impostazioni dell'evento, statistiche, codici QR | Solo gli admin |
| La pagina dell'evento stessa | Chiunque abbia il codice QR, più il codice di accesso se ne è impostato uno |

Non esiste una galleria pubblica né un modo per un ospite di scaricare le foto
degli altri, qualunque siano le impostazioni: è una scelta di progetto, non
un'opzione.

## Come le foto restano private {#how-photos-stay-private}

- **Nessun file pubblico.** Le foto sono salvate fuori dalla web root
  (`DATA_DIR/uploads`) ed escono dal server solo tramite `/api/media/<id>`, che
  verifica l'accesso a **ogni** richiesta. Un URL copiato è inutile in un altro
  browser: le risposte sono identiche (`404`) per «non esiste» e «non è tua».
- **Unirsi è un cookie, non un link.** Aprire la pagina di un evento scrive
  l'evento in un cookie ospite cifrato. Le richieste di media lo richiedono,
  quindi l'URL di una foto incollato in una chat non si apre da nessun'altra parte.
- **Identificatori impossibili da indovinare.** Gli id delle foto sono UUID
  casuali, gli slug degli eventi contengono ~40 bit di casualità. Gli slug non
  sono il confine di sicurezza (lo è il cookie), ma impediscono di enumerare
  gli eventi.
- **Cache privata.** Le risposte dei media sono `Cache-Control: private`, gli
  originali `no-store`, quindi nessun proxy condiviso o CDN ne conserva una copia.
- **Link rigenerabili.** «Genera un nuovo link» cambia lo slug: il vecchio
  codice QR smette subito di funzionare, ad esempio dopo che è trapelato sui social.
- **Codice di accesso facoltativo** per evento, con hash bcrypt.
- **Gli ospiti possono riprendersi le loro foto**, in qualsiasi momento, anche
  dopo l'evento: eliminarne una rimuove i suoi file dall'album, dai link alla
  galleria e dalla parete. Può farlo solo il browser che l'ha inviata (stesso
  cookie ospite).

## Link alla galleria {#gallery-links}

- Un link è un token casuale di 32 caratteri **più** una password (bcrypt). Il
  token da solo mostra un modulo per la password, nient'altro; i link
  sconosciuti, scaduti e revocati rispondono tutti `404`.
- Lo sblocco scrive il link in un cookie cifrato separato (`gr_share`).
  L'accesso viene ricontrollato a ogni richiesta, quindi revocare un link o
  farlo scadere lo blocca subito, anche per i browser che l'avevano già aperto.
- I link vedono solo le foto visibili, o le preferite visibili per un link
  «solo preferite». Gli originali e lo ZIP richiedono l'interruttore
  *download* del link, e lo ZIP di un link contiene ciò che quel link mostra.
  Un link non permette mai di caricare. Quali foto sono preferite non viene mai
  inviato agli ospiti né ai link.
- Password sbagliate: 10 tentativi al minuto per IP e link, e un tetto per
  link su tutti gli IP.
- Le password generate (`xxxx-xxxx-xxxx-xxxx`, ~82 bit) sono mostrate una sola
  volta e mai salvate in chiaro.

## Aggiornamenti {#updates}

- Il controllo degli aggiornamenti è un'unica `GET` anonima all'API di GitHub
  ogni 12 ore (`UPDATE_CHECK=false` lo disattiva). Non viene inviato nulla
  sull'istanza.
- L'updater facoltativo ha accesso al socket Docker, che equivale a root
  sull'host. Non pubblica nessuna porta, richiede un token di 24+ caratteri
  confrontato a tempo costante, accetta solo una versione `x.y.z`, sostituisce
  soltanto `UPDATER_CONTAINER` e scarica solo il repository dell'immagine di
  quel container alla versione richiesta. L'app gli chiede solo la versione
  annunciata da GitHub, dopo un backup.
- Una nuova versione che non supera il controllo di salute viene sostituita
  automaticamente dal container precedente.

## Backup {#backups}

- Solo i proprietari scaricano o ripristinano i backup. Un backup contiene
  tutto, compresi gli hash delle password e il segreto di sessione generato:
  conservalo come il server stesso.
- Un ripristino verifica l'intero archivio prima di cambiare qualsiasi cosa: il
  manifest, un vero file SQLite e nomi di file nelle forme che l'app scrive (i
  percorsi che risalgono con `../` vengono rifiutati). Un archivio che non
  supera questi controlli lascia l'istanza intatta.

## Webhook {#webhooks}

- Solo i proprietari li gestiscono. URL e segreti di firma sono cifrati a
  riposo (l'URL di un webhook Discord o Slack è una credenziale) e mai
  rimandati al browser, che vede solo un indizio mascherato.
- Le richieste sono semplici `POST` con un timeout di 10 secondi e senza
  seguire i redirect. Vanno solo verso indirizzi pubblici: un URL il cui host è
  o si risolve in un indirizzo privato, di loopback o link-local (il server
  stesso, la rete locale, i metadati del cloud, l'updater) fallisce con un
  messaggio che lo dice, comunque sia scritto l'indirizzo (IPv4 dentro IPv6
  compreso). Il controllo avviene sulla risoluzione DNS della connessione
  stessa, sull'indirizzo a cui poi si connette, quindi un nome non può
  rispondere diversamente nel frattempo. Per raggiungere un Home Assistant o un
  ntfy sulla tua rete, imposta `WEBHOOK_ALLOW_PRIVATE=true`.
- Gli avvisi contengono nomi di eventi, conteggi e link all'admin, mai foto,
  e-mail degli ospiti o audio dei messaggi.

## Libro degli ospiti {#guestbook}

- I messaggi sono privati come le foto: un ospite legge e ascolta solo i
  propri, gli admin dell'evento tutti, i link alla galleria solo quelli
  approvati e solo se gli organizzatori condividono il libro degli ospiti. I
  messaggi vocali escono dal server tramite `/api/messages/<id>/audio`,
  verificato a ogni richiesta.
- I messaggi vocali sono identificati dai loro byte (Ogg/Opus, WebM, MP4/AAC,
  MP3) e salvati così come sono stati registrati: ricodificarli richiederebbe
  ffmpeg nell'immagine. Vengono serviti solo con un tipo audio, `no-store`,
  sotto una CSP di sandbox. Le registrazioni del browser non contengono la
  posizione.
- 3 MB per messaggio vocale, 500 caratteri per testo, 20 messaggi per ospite ed
  evento, 10 al minuto (vedi *Abusi* per i limiti che valgono senza cookie). Il
  microfono viene richiesto solo quando un ospite tocca *Registra un messaggio
  vocale*.

## E-mail {#email}

- Gli indirizzi degli ospiti sono **facoltativi** (opt-in), proposti solo
  negli eventi i cui organizzatori li hanno chiesti, usati solo per l'album di
  quell'evento ed eliminati con l'evento. Un ospite può rimuovere il proprio
  dalla pagina.
- La password SMTP impostata nell'admin è cifrata a riposo e mai rimandata al
  browser. Resta valida solo per il server e l'account per cui è stata
  digitata: cambiare l'uno o l'altro la richiede di nuovo, così un altro
  proprietario non può dirottarla verso un server suo.
- Con un utente impostato, le credenziali passano solo su una connessione
  cifrata (TLS implicito, o STARTTLS reso obbligatorio), quindi non si possono
  leggere rimuovendo STARTTLS lungo il percorso. `SMTP_ALLOW_PLAIN=true` per un
  relay senza TLS su una rete fidata.
- Ogni valore in un'e-mail è sottoposto a escape HTML; ogni e-mail ha una
  gemella in testo semplice.
- Scegliere di lasciare la password fuori dalle e-mail agli ospiti significa
  che un'e-mail inoltrata non apre l'album.

## Caricamenti {#uploads}

- I file sono identificati dai loro byte, mai dal nome o dal `Content-Type`;
  sono accettati solo JPEG, PNG, WebP, HEIC/HEIF, AVIF e GIF.
- Ogni immagine viene **ricodificata**: i metadati EXIF (posizione GPS, numeri
  di serie del dispositivo) vengono rimossi, e tutto ciò che è accodato dopo i
  dati dell'immagine viene scartato.
- La dimensione è limitata mentre il body arriva, quindi le richieste chunked
  senza `Content-Length` non possono esaurire la memoria. Le immagini oltre
  `MAX_IMAGE_MEGAPIXELS` vengono rifiutate prima della decodifica, HEIC
  compreso: la sua dimensione viene letta dall'intestazione del file prima che
  il decoder allochi qualsiasi cosa.
- Un caricamento alla volta per ospite, quindi richieste parallele dello
  stesso ospite non possono aggirare la quota per ospite. Un ospite però è un
  cookie: uno script che lo scarta è ogni volta un nuovo ospite. A quel punto
  reggono i limiti per evento e per indirizzo qui sotto; un budget di memoria
  per i caricamenti in ricezione, contato in byte man mano che arrivano (una
  connessione che fa gocciolare il suo caricamento non costa quasi nulla, una
  raffica di connessioni veloci viene invitata a riprovare); al massimo 3
  immagini decodificate insieme con 12 in attesa; e un rifiuto quando il disco
  ha meno di 512 MB liberi. I telefoni degli ospiti ritentano da soli con un
  server occupato.

## Autenticazione {#authentication}

- Il primo account proprietario (`admin`, o `ADMIN_USERNAME`) prende la sua
  password da `ADMIN_PASSWORD`, oppure da una generata al primo avvio e
  stampata una sola volta. Non esiste una pagina di registrazione pubblica che
  uno sconosciuto potrebbe raggiungere per primo: gli altri account li crea un
  proprietario, con una password generata mostrata una sola volta.
- I **proprietari** gestiscono ogni evento, gli account, l'e-mail e le
  impostazioni dell'istanza. Gli **organizzatori** raggiungono solo gli eventi
  loro assegnati, e non possono eliminarli. Un evento fuori dal perimetro di un
  organizzatore risponde `404`, esattamente come uno inesistente, sia
  dall'API dell'admin sia da `/api/media`. L'istanza mantiene sempre almeno un
  proprietario.
- La **verifica in due passaggi** (TOTP, RFC 6238) si attiva per account dalle
  Impostazioni: dopo la password, un codice da un'app di autenticazione. Il
  segreto è cifrato a riposo, un codice non si può usare due volte, i codici
  sono limitati a 5 tentativi al minuto per account, e lo stato di accesso a
  metà scade dopo 5 minuti. Dieci codici di recupero monouso (salvati come
  hash) coprono la perdita del telefono; un proprietario può anche reimpostare
  la verifica di un altro account. Disattivarla richiede la password e un codice.
- Un nome utente sbagliato impiega lo stesso tempo a essere rifiutato di una
  password sbagliata (un confronto bcrypt avviene in ogni caso), quindi i nomi
  utente non si possono sondare misurando i tempi.
- Le sessioni sono cookie cifrati, `HttpOnly`, `SameSite=Lax`, `Secure` in
  produzione (iron-session), che contengono l'account e la sua versione di
  sessione. Cambiare o reimpostare una password disconnette quell'account
  ovunque; eliminare un account chiude subito le sue sessioni.
- Ogni pagina e route API dell'admin verifica da sé la sessione, e ogni route
  sotto un id di evento verifica che l'evento rientri nel perimetro dell'admin.
  `tests/unit/routeGuards.test.ts` fallisce se ne viene aggiunta una senza il
  controllo.

## Abusi {#abuse}

| Limite | Predefinito |
|---|---|
| Accesso all'admin | 5 password sbagliate al minuto per indirizzo e nome utente, 30 password sbagliate al minuto per indirizzo, 30 tentativi al minuto per indirizzo (dietro `TRUST_PROXY`) |
| Codice di accesso | 10 tentativi al minuto per ospite, 30 codici sbagliati al minuto per evento, tentativi in corso inclusi |
| Caricamenti | 30 al minuto per ospite, 300 per evento, 120 per indirizzo (dietro `TRUST_PROXY`), più la quota per ospite |
| Libro degli ospiti | 10 messaggi al minuto per ospite, 60 per evento, 30 per indirizzo (dietro `TRUST_PROXY`) |
| Password del link alla galleria | 10 tentativi al minuto per IP e link |
| E-mail di prova | 5 al minuto |

Codici e password sbagliati vengono contati prima di essere verificati, poi
restituiti quando risultano giusti: una raffica di tentativi paralleli conta
per intero. Un accesso riuscito azzera solo i limiti dell'account che ha
effettuato l'accesso. Non c'è un tetto per nome utente su tutti gli
indirizzi: chiunque potrebbe allora bloccare un account noto da qualsiasi parte.

Senza `TRUST_PROXY`, ogni client appare all'app con lo stesso indirizzo, quindi
i limiti per indirizzo sono condivisi da tutti; dietro un reverse proxy,
attivala.

Il tetto per evento sui codici sbagliati è un compromesso voluto: chi inonda
l'evento di codici sbagliati può far aspettare i veri ospiti fino a un minuto,
ma non può forzare un codice di 6+ caratteri (obbligatorio) in un tempo utile.

## Richieste cross-site {#cross-site-requests}

Ogni richiesta che modifica uno stato (admin e ospite) deve portare un header
`Origin` corrispondente, oltre ai cookie `SameSite`. L'app imposta
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, una
`Referrer-Policy` restrittiva e una `Permissions-Policy` che consente fotocamera
e microfono solo all'app stessa. Quando `PUBLIC_URL` è `https://`, le pagine
inviano anche `Strict-Transport-Security` (un anno, senza sottodomini).

Ogni pagina porta una **Content-Security-Policy** con un nonce nuovo
(`src/proxy.ts`): girano solo gli script che Next.js ha marcato con esso,
quindi il markup iniettato non può eseguire nulla, e la pagina può parlare solo
con la propria origine. Gli stili restano `unsafe-inline` (React scrive
attributi `style`; uno stile non può eseguire codice). Le immagini servite, i
messaggi vocali e i file SVG hanno una loro policy di sandbox. L'app non carica
nulla da terze parti: niente CDN, niente font o analytics da altrove.

## La tua parte {#your-part}

- Servilo in **HTTPS**. I telefoni ne hanno bisogno per la fotocamera, e i
  cookie sono `Secure` in produzione.
- Imposta `TRUST_PROXY=true` dietro il tuo reverse proxy, e **solo** in quel caso.
- Lascia che il proxy bufferizzi il body delle richieste prima di inoltrarlo
  (nginx lo fa di default, `proxy_request_buffering on`): un client che invia
  quasi tutto un caricamento e poi si blocca impegna allora il proxy, non la
  memoria di Guestroll. L'app interrompe da sola questi caricamenti dopo 2
  minuti, ma un client che si riconnette di continuo potrebbe tenere occupato
  il suo budget di caricamento.
- Fai il backup di `DATA_DIR` e tienilo privato: contiene ogni foto e il
  segreto di sessione.
- Fissa una versione dell'immagine e segui le release per le correzioni di sicurezza.
