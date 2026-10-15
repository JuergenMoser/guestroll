# Prompt di design

Il brief usato per progettare l'interfaccia di Guestroll, scritto come un prompt
così da poterlo consegnare a un designer, o a un assistente IA, quando la UI
evolve. Esiste perché la prima versione somigliava a ogni app generata: sfondo
quasi nero, un solo accento acceso, un titolo con grazie, minuscole etichette
monospaziate in maiuscolo sopra ogni titolo, punti centrali tra i metadati,
card arrotondate tutte uguali. Niente diceva «foto di una festa».

Incolla tutto ciò che sta sotto la linea.

---

Stai riprogettando l'interfaccia di **Guestroll**, un'app web self-hosted per
eventi. Gli ospiti di un matrimonio o di un compleanno scansionano un codice QR
sul loro tavolo, si apre la fotocamera del telefono e ogni foto che scattano
finisce nell'album privato degli organizzatori. Gli organizzatori gestiscono
gli eventi, moderano le foto, stampano i codici QR e proiettano una
presentazione live da un'area di amministrazione.

## Chi la usa, e dove {#who-uses-it-and-where}

- **Ospiti**: su un telefono, in piedi, con un drink in mano, in una sala buia
  e rumorosa, spesso un po' brilli, mai disposti a leggere istruzioni. Passano
  una volta, per una ventina di secondi a foto. Ogni esitazione è una foto persa.
- **Organizzatori**: su un portatile, la settimana prima dell'evento
  (preparazione) e il giorno dopo (selezione, download). Calmi, attenti, hanno
  bisogno di fidarsi dello strumento a cui affidano i loro ricordi.

## Radica lo stile nel soggetto {#ground-the-look-in-the-subject}

Prendi il linguaggio visivo dal mondo della fotografia alle feste, non dalle
dashboard SaaS:

- la **macchina fotografica usa e getta** che passa tra i tavoli: un corpo
  colorato e massiccio, un grande pulsante di scatto, una finestrella che conta
  le pose rimaste;
- la **stampa del laboratorio fotografico**: bordo bianco, una data impressa in
  un angolo, stampe che si accumulano in una busta;
- il **provino a contatto** su cui gli organizzatori scelgono le preferite.

Usali come struttura, non come decorazione: il contapose *è* la quota di
caricamento, il bordo bianco *è* il modo in cui si mostra una foto inviata, il
provino a contatto *è* la griglia di moderazione. Non aggiungere texture
scheumorfiche, finta grana della pellicola o lucidità plastica.

## Vincoli {#constraints}

- Interfaccia chiara su una carta fredda e neutra. Niente crema (famiglia
  #F4F1EA), niente sfondo di pagina quasi nero (la parete live, mostrata su un
  proiettore, è l'unico schermo nero).
- Ogni evento ha il proprio colore principale, scelto dagli organizzatori. Il
  design deve funzionare con qualsiasi colore: giallo, blu navy, rosa pallido.
  Calcola un testo leggibile sopra di esso invece di dare per scontato il bianco.
- Due caratteri al massimo, entrambi con personalità, nessuno dei soliti
  predefiniti (Inter, Geist, Roboto, un serif da titolo ad alto contrasto). Un
  grottesco arrotondato e un po' stravagante si addice al soggetto: deve
  sembrare una festa, non una banca.
- Maiuscola solo a inizio frase, ovunque. Niente etichette in maiuscolo
  spaziato, niente etichette monospaziate, niente testo «eyebrow» sopra i
  titoli a meno che non porti un'informazione che il titolo non dà.
- Niente punti centrali a unire i metadati, niente frecce aggiunte ai
  pulsanti, niente emoji come illustrazione, niente gradienti, niente macchie
  di colore sfocate, niente effetti vetro.
- Card solo dove il contenuto è un oggetto separabile (un evento, una foto). Le
  impostazioni sono un modulo, non una pila di card. I raggi seguono la
  gerarchia: grandi per il corpo della fotocamera, piccoli per i campi, zero
  per le foto (le stampe hanno angoli vivi).
- Un solo elemento memorabile, tutto il resto discreto: il corpo della
  fotocamera della pagina ospite, con il suo pulsante di scatto e il contapose.
- Animazioni solo in risposta a un'azione: la pressione dello scatto, una
  stampa che scivola nella striscia una volta inviata. Nessuna animazione di
  ingresso al caricamento.

## Pagina ospite, dall'alto in basso {#guest-page-top-to-bottom}

1. Il nome dell'evento, grande, composto come l'etichetta stampata su una
   macchina usa e getta. La sua data nel carattere piccolo della data impressa
   su una stampa.
2. Il corpo della fotocamera nel colore dell'evento: pulsante di scatto, e il
   contapose che mostra quante foto restano (o quante ne sono state inviate
   quando non c'è limite).
3. Sotto, le stampe dell'ospite, dalla più recente, bordi bianchi, angoli
   vivi, un segno di attesa quando la moderazione è attiva. Una riga che dice
   che solo gli organizzatori e l'ospite possono vederle.

Gli stati di errore e vuoti danno una direzione in una frase («Caricamenti
chiusi a mezzanotte. Grazie per le foto.»), mai una scusa.

## Admin {#admin}

Discreta e densa, come il bancone ordini di un laboratorio: tabelle chiare,
numeri allineati, etichette accanto ai campi, azione principale nel colore
dell'evento solo quando c'è un evento nel contesto. La scheda delle foto si
legge come un provino a contatto: griglia fitta, selezione con un contorno
spesso e un conteggio, azioni in blocco in una barra che compare alla selezione.

## Testi {#copy}

Verbi semplici, le parole dell'utente: «Scatta una foto», «Scarica tutte le
foto», «Chiudi i caricamenti». Un pulsante mantiene il suo nome lungo tutto il
flusso («Salva il design» → «Design salvato»). Traduci il senso, non le
parole, in francese, italiano e spagnolo.

## Soglia di qualità {#quality-floor}

Responsive da 320 px, pulsante di scatto raggiungibile con il pollice, focus da
tastiera visibile, `prefers-reduced-motion` rispettato, contrasto del testo
4.5:1 anche sul colore dell'evento, aree di tocco di 44 px nella pagina ospite.
