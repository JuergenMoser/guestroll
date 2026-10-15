# Guida all'admin

Accedi su `/admin` con il tuo account: `admin` e la password di
`ADMIN_PASSWORD` su una nuova installazione, oppure quella che ti ha dato un
proprietario. L'admin funziona su telefono, ma è più comodo su un portatile.

## Dashboard {#dashboard}

I totali di tutti gli eventi: foto, ospiti che hanno inviato almeno una foto,
visite, download, spazio occupato e foto in attesa di approvazione. Sotto: i
caricamenti al giorno negli ultimi 30 giorni, i cinque fotografi più attivi e
gli ultimi eventi.

## Eventi {#events}

**Nuovo evento** chiede un nome e nient'altro; ogni altra impostazione ha un
valore predefinito che puoi cambiare dopo. Ogni evento ha le sue schede: Foto,
Libro degli ospiti (una volta attivato), Statistiche, QR e condivisione e
Impostazioni.

### Foto {#photos}

Il provino a contatto di tutto ciò che hanno inviato gli ospiti, dal più recente.

- Filtra per **Tutte**, **In attesa**, **Visibili**, **Nascoste** o **Preferite**,
  e per sfida quando l'evento ne ha.
- Tocca le foto per selezionarle, poi **Approva**, **Nascondi**, **Preferita**,
  **Togli dalle preferite** o **Elimina** dalla barra in basso. Le foto nascoste
  spariscono anche per l'ospite che le ha scattate ed escono dalla parete live;
  le foto eliminate vengono rimosse dal disco.
- **Scarica ZIP** recupera ogni foto visibile alla risoluzione piena, con nomi
  come `0001-camille-1a2b3c4d.jpg` così da restare nell'ordine di scatto.
  L'archivio viene trasmesso in streaming, quindi anche un album di diversi
  gigabyte inizia a scaricarsi subito.
- **Importa foto** aggiunge file dal tuo computer, di solito quelli del
  fotografo: inviati uno alla volta in qualità piena (nessuna compressione nel
  browser), pubblicati subito, fuori dalle quote ospite e dagli orari di
  chiusura, e attribuiti al nome che indichi.
- Le **Preferite** sono le tue scelte, segnate con una stella. Con il filtro
  Preferite, **Scarica le preferite** recupera uno ZIP «best of», e un link alla
  galleria può mostrare solo le preferite. Gli ospiti non vedono mai quali foto
  hai scelto.

### Libro degli ospiti {#guestbook}

Attivalo in **Impostazioni → Libro degli ospiti**: gli ospiti trovano allora
una scheda sotto le loro foto per lasciare qualche parola, un messaggio vocale
fino a 2 minuti registrato nel browser, o entrambi. I messaggi seguono la
moderazione dell'evento, come le foto; un ospite vede e può eliminare solo i
propri.

La scheda **Libro degli ospiti** li elenca, con un lettore per ogni messaggio
vocale. Seleziona per approvare, nascondere o eliminare; **Scarica il libro
degli ospiti** recupera uno ZIP con `guestbook.txt` (tutti i messaggi, dal più
vecchio) e i messaggi vocali, numerati in corrispondenza. *Mostra i messaggi
dietro i link alla galleria* aggiunge quelli approvati sotto le foto di ogni
link alla galleria dell'evento (disattivato di default: sono stati scritti per
te). Il riepilogo di fine evento li conta.

### Statistiche {#stats}

Caricamenti per ora durante l'evento (una festa dura una notte, quindi l'ora è
l'unità utile), visite, download, codici di accesso sbagliati, fotografi più
attivi e foto per sfida.

### QR e condivisione {#qr-sharing}

- **Link per gli ospiti**: l'indirizzo dietro il codice QR, da incollare in un messaggio.
- **Design del codice QR**: preset, colori, forme dei punti e degli angoli,
  margine, un logo al centro e una didascalia. L'anteprima è esattamente il
  file che scarichi, in PNG (da 512 a 4096 px) o SVG. Ricordati di **Salva**
  prima di scaricare.
- **Locandina da stampare**: un cartoncino A4 con il nome dell'evento, la data e il codice QR.
- **Video presentazione**: un MP4 delle foto visibili (o delle preferite)
  nell'ordine di scatto, con un cartello iniziale, zoom lenti e dissolvenze,
  16:9 o 9:16 per le storie, da 2 a 8 secondi per foto, fino a 300 foto, e la
  tua musica se aggiungi un file (tagliata e sfumata alla fine). Viene creato
  nel tuo browser (WebCodecs, qualsiasi Chrome, Edge, Safari o Firefox
  recente), quindi il server non ha bisogno di un encoder video: tieni la
  scheda aperta finché la barra di avanzamento scorre. Le foto con proporzioni
  molto diverse da quelle del video vengono mostrate intere su uno sfondo
  sfocato invece di essere ritagliate.
- **Parete live**: una presentazione a schermo intero per un proiettore o una
  TV. Le nuove foto saltano la coda e compaiono entro cinque secondi; nel
  frattempo scorrono le più recenti. Vengono mostrate solo le foto visibili,
  quindi con *Approva ogni foto prima di mostrarla* nulla arriva sullo schermo
  finché non la approvi. Le sue impostazioni:

  | Impostazione | Cosa fa |
  |---|---|
  | Disposizione | **Una stampa** alla volta, un **mosaico** (la più recente grande, quattro intorno) o una **griglia** da quindici |
  | Secondi per passo | Da 3 a 30 |
  | Mostra chi ha scattato ogni foto / la sfida | Didascalie sotto ogni foto |
  | Mostra il codice QR in un angolo | Così la sala continua a unirsi |
  | Solo le preferite | Solo le foto a cui hai messo la stella |
  | Mostra i messaggi del libro degli ospiti | I messaggi di testo approvati: tra una foto e l'altra in *Una stampa*, lungo il bordo inferiore altrimenti |

  Una parete aperta recepisce le modifiche alle impostazioni entro 20 secondi,
  senza ricaricare.
- **Genera un nuovo link**: cambia l'indirizzo. Il vecchio codice QR smette
  subito di funzionare, per tutti. Usalo se il codice è trapelato.

### Impostazioni {#settings}

| Sezione | Impostazione | Cosa fa |
|---|---|---|
| Evento | Nome, messaggio di benvenuto, data, colore principale | Ciò che gli ospiti vedono in cima alla loro pagina. Il colore tinge la fotocamera e i pulsanti; il testo sopra si adatta da solo. |
| Accesso | Codice di accesso | Facoltativo, 6+ caratteri. Gli ospiti lo digitano una volta. Lascialo vuoto perché basti il codice QR per entrare. |
| Caricamenti | Accetta caricamenti | Disattiva i caricamenti in qualsiasi momento; gli ospiti conservano le proprie foto. |
| | Chiudi i caricamenti automaticamente il | Per esempio la mattina dopo. |
| | Modalità di acquisizione | Solo fotocamera (il valore predefinito), solo galleria, o entrambe. |
| | Foto per ospite | 0 per nessun limite. Gli ospiti vedono un contatore delle foto rimaste. |
| | Moderazione | Pubblica subito e nascondi dopo, oppure approva ogni foto prima. |
| Ospiti | Lingua dell'album | Automatica (il telefono di ogni ospite) o una lingua fissa. Gli ospiti possono comunque cambiarla. |
| | Chiedi il nome agli ospiti | Mostrato accanto alle loro foto nell'admin e sulla parete live. |
| Aspetto | Cornice | **Stampa istantanea** (bordo bianco, nome dell'evento e data sotto, logo), **Colore dell'evento** (un bordo nel colore principale con il nome) o **Timbro logo** in un angolo. Disegnata sul telefono prima dell'invio. |
| | Lascia scegliere un filtro agli ospiti | Bianco e nero, caldo, vintage o vivace, scelto sopra il pulsante di scatto. Cornici e filtri fanno parte della foto inviata: l'originale non viene conservato. I telefoni che non riescono a decodificare un formato nel browser (raro) la inviano senza modifiche. |
| Sfide | Elenco degli spunti | Fino a 30 idee di foto («La pista da ballo», «Gli sposi con uno sconosciuto»). Gli ospiti ne scelgono una sopra il pulsante di scatto e vedono quelle che hanno già fatto. Rinominare una sfida ne conserva le foto; eliminarla le conserva comunque, senza etichetta nel filtro. |

| Dopo l'evento | Permetti agli ospiti di lasciare l'e-mail per ricevere l'album | Aggiunge una scheda nella pagina ospite. Facoltativo (opt-in); gli indirizzi vengono eliminati con l'evento. |
| | Inviami un riepilogo alla chiusura dei caricamenti | Foto, fotografi, visite, ciò che è ancora in attesa. |
| | Invia agli ospiti un link alla galleria alla chiusura dei caricamenti | Un unico link protetto da password per l'evento, inviato una volta a ogni indirizzo. |
| | Validità del link (giorni) | 0 per un link che non scade mai. |
| | Gli ospiti possono scaricare le foto dal link | Disattivato: il link mostra le foto ma non gli originali né lo ZIP. |
| | Invia solo le preferite | Il link mostra le foto a cui hai messo la stella invece dell'intero album. Mettile prima della fine dell'evento. |
| | Inserisci la password nell'e-mail | Disattivato: gli ospiti ricevono solo il link, e la password arriva a te (e-mail di riepilogo e scheda *Termina l'evento*) perché tu possa trasmetterla. Un'e-mail inoltrata allora non basta. |

### Link alla galleria {#gallery-links}

In **QR e condivisione**, *Link alla galleria* crea link privati verso le foto
visibili dell'evento: per i familiari che non c'erano, o per gli ospiti dopo
la festa. Ogni link ha la sua password (la tua, o una generata e mostrata **una
sola volta**), una scadenza facoltativa, un interruttore per i download,
l'intero album o solo le preferite, e un contatore di visite. **Revoca** lo
blocca subito, anche per chi l'ha già aperto. Un link alla galleria non
permette mai a nessuno di caricare, e non mostra mai le foto in attesa o nascoste.

### Termina l'evento {#end-the-event}

I caricamenti si chiudono da soli all'orario di chiusura previsto; le e-mail di
fine evento partono entro un minuto. **Termina l'evento ora** lo fa subito.
Viene eseguito una sola volta per evento: terminarlo di nuovo non fa nulla.

**Duplica questo evento** (proprietari): un nuovo evento con le stesse
impostazioni, colori, design del codice QR, logo, sfide e organizzatori,
pronto per l'anno prossimo. Non vengono copiati foto, messaggi né link, e ha
il suo codice QR: quello vecchio continua a puntare al vecchio evento.

**Zona pericolosa**: eliminare un evento rimuove tutte le foto dal disco.
Digita il nome dell'evento per confermare.

## Impostazioni {#settings-1}

Le impostazioni sono divise in cinque aree, elencate a sinistra (una fila di
schede su telefono). Un'area che richiede la tua attenzione lo segnala
nell'elenco: verifica in due passaggi disattivata, nessun backup automatico,
nessun server e-mail, un aggiornamento in attesa. Gli organizzatori vedono solo
**Il tuo account**.

### Il tuo account {#your-account}

- **Profilo**: il nome visualizzato e l'indirizzo dove arrivano i riepiloghi e
  gli avvisi dei *tuoi* eventi.
- **Password**: cambiarla chiude le tue altre sessioni. Non disponibile per
  l'account definito da `ADMIN_PASSWORD`: cambia la variabile e riavvia.
- **Verifica in due passaggi**: scansiona il codice QR con un'app di
  autenticazione, digita il codice e conserva i dieci codici di recupero
  mostrati una sola volta. Da quel momento ogni accesso chiede un codice dopo
  la password. Hai perso il telefono? Accedi con un codice di recupero, oppure
  chiedi a un proprietario di reimpostarla da **Team**.
- **Lingua e tema** per il tuo browser.

### Team (proprietari) {#team-owners}

Aggiungi persone e scegli il loro ruolo.

| Ruolo | Può |
|---|---|
| Proprietario | Tutto: ogni evento, creare ed eliminare eventi, account, e-mail, avvisi |
| Organizzatore | Solo gli eventi che gli sono assegnati: foto e moderazione, impostazioni, codice QR, link alla galleria, parete live, chiusura dell'evento. Non eliminarlo. |

Un nuovo account riceve una password generata, mostrata una sola volta perché
tu la possa trasmettere. *Nuova password* ne genera un'altra e disconnette la
persona; *Elimina* le toglie subito l'accesso. L'ultimo proprietario non può
essere declassato né eliminato.

### Notifiche (proprietari) {#notifications-owners}

- **E-mail**: il server SMTP (o in sola lettura se definito da `SMTP_HOST`),
  dove vanno gli avvisi, e un pulsante **Invia un'e-mail di prova** che mostra
  la risposta del server.
- **Avvisi**, ciascuno attivabile: foto in attesa di approvazione (al massimo
  ogni 30 minuti, solo quando il numero cresce), il riepilogo di fine evento,
  più di 10 password admin sbagliate in 15 minuti (al massimo una volta
  all'ora), disco pieno al 90% (al massimo una volta al giorno).
- **E-mail recenti** con il loro stato. Quelle non riuscite si possono ritentare.
- **Webhook**: gli stessi avvisi sul tuo telefono o in una chat, qualunque
  siano le impostazioni e-mail. Fino a 10, ognuno con la sua scelta di avvisi
  (evento terminato, foto in attesa, nuovo messaggio nel libro degli ospiti,
  accessi falliti, spazio di archiviazione).

  | Servizio | URL | Cosa arriva |
  |---|---|---|
  | ntfy | un topic su ntfy.sh o sul tuo server | Una notifica push che apre la pagina dell'admin |
  | Discord | impostazioni del canale → Integrazioni → Webhook | Un embed (menzioni disattivate) |
  | Slack | un Incoming Webhook | Un messaggio con un link |
  | JSON | qualsiasi cosa: Home Assistant, n8n, il tuo script | `{ app, kind, title, message, url, event, data, sentAt }`, firmato con `X-Guestroll-Signature: sha256=<HMAC of the body>` quando imposti un segreto |

  **Prova** invia subito un avviso e mostra la risposta del servizio. Gli
  avvisi reali passano da una coda ritentata come le e-mail (1, 5, 15 minuti,
  1 e 6 ore); le ultime consegne sono elencate sotto i webhook.

### Dati (proprietari) {#data-owners}

- **Backup**: scarica un backup di tutto (vedi
  [Deployment](deployment.md#backups)).
- **Backup automatici**: ogni notte, ogni 6 ore, ogni settimana o con
  qualsiasi espressione cron, verso una cartella o un bucket S3 conservando gli
  N più recenti, ciascuno elencato con i pulsanti di download e ripristino.
  **Esegui ora** ne avvia uno subito.
- **Ripristina** un file di backup.
- **Elimina gli eventi terminati**: con un numero di giorni (14 o più), un
  evento viene eliminato quel tempo dopo la sua fine, foto e messaggi inclusi;
  i suoi organizzatori ricevono un'e-mail una settimana prima, e la data
  compare nella scheda *QR e condivisione* dell'evento. Gli eventi mai
  terminati (nessun orario di chiusura, mai chiusi a mano) vengono conservati.

### Sistema (proprietari) {#system-owners}

- **Aggiornamenti**: la versione in uso, la più recente con le sue note di
  rilascio, **Controlla ora** e, con il container updater, **Aggiorna a
  X.Y.Z**: un backup, la nuova immagine, un controllo di salute, il ritorno
  alla vecchia se qualcosa va storto. La cronologia elenca ogni aggiornamento e
  le migrazioni del database che ha applicato. Una riga sotto la navigazione
  avvisa i proprietari quando esce una versione.
- **Informazioni**: versione, lingua predefinita, archiviazione delle foto,
  foto più grande accettata, indirizzo pubblico e fuso orario dell'istanza.

Le e-mail di un evento (riepiloghi, foto in attesa di approvazione) vanno
all'indirizzo dell'istanza in **E-mail** e a ogni account che gestisce
l'evento e ha impostato un indirizzo. Gli avvisi dell'istanza (accessi falliti,
disco) vanno ai proprietari.
