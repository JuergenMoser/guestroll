# Sviluppo

## Avviarlo in locale {#run-locally}

```bash
git clone https://github.com/achedon12/guestroll && cd guestroll
nvm use            # Node 22, see .nvmrc
npm ci
echo "ADMIN_PASSWORD=dev-password-123" > .env.local
npm run dev        # http://localhost:3000
```

Riempilo con eventi e foto di prova (attraverso l'API pubblica, in un altro
terminale):

```bash
BASE_URL=http://localhost:3000 ADMIN_PASSWORD=dev-password-123 npm run seed:demo
```

Per provare la fotocamera su un vero telefono, la pagina deve essere in HTTPS.
Il modo più rapido è un tunnel (`cloudflared tunnel --url http://localhost:3000`)
oppure `next dev --experimental-https` sulla tua LAN.

## Controlli {#checks}

```bash
npm run lint
npm run typecheck      # generates Next's route types first
npm test               # unit + integration (Vitest)
npm run test:coverage  # the same, with a coverage report in coverage/
npm run build
npm run test:e2e       # functional tests on the production build (Playwright)
```

`npm run test:e2e` avvia la build di produzione sulla porta 3210 con una
cartella dati temporanea, quindi non tocca mai i tuoi dati. In locale usa il
Chrome che hai installato; in CI, il Chromium installato da `npx playwright install`.

### Tre livelli di test {#three-layers-of-tests}

| Livello | Dove | Contro cosa gira |
|---|---|---|
| Unità | `tests/unit/` | Moduli puri: policy di accesso, validazione, limitatore di frequenza, rendering dei QR… |
| Integrazione | `tests/integration/` | SQLite reale in una cartella temporanea, immagini reali elaborate da sharp, ZIP reali, codici QR decodificati da ZXing |
| Funzionale | `tests/e2e/api/` | L'API HTTP di una build di produzione in esecuzione: scenari ospite e admin, sicurezza, quote |
| Browser | `tests/e2e/browser/` | Percorsi reali: un ospite su un telefono, un admin su un desktop |

File di livello unitario:

| File | Cosa blocca |
|---|---|
| `policy.test.ts` | Ogni regola di accesso: chi vede quale foto, in quale dimensione |
| `routeGuards.test.ts` | Ogni pagina e route admin verifica la sessione; ogni modifica lato ospite verifica l'origine |
| `qrScan.test.ts` | Ogni preset e forma di QR viene renderizzato e decodificato con ZXing |
| `qr.test.ts` | Parsing dello stile, escape, scavo per il logo |
| `request.test.ts` | Regole su IP del client e origine, il limite del body in streaming |
| `rateLimit.test.ts`, `validation.test.ts`, `ids.test.ts`, `negotiate.test.ts`, `translate.test.ts` | Il resto dei moduli puri |

## Branch e CI {#branches-and-ci}

`develop` è il branch predefinito, dove arrivano le pull request; `main` è la
produzione. Ogni modifica su uno dei due branch esegue:

| Workflow | Cosa fa |
|---|---|
| Quality | Lint, tipi, build di produzione |
| Tests | Vitest con copertura, poi Playwright su una build di produzione |
| Security | CodeQL (codice e workflow) e `npm audit` sulle dipendenze di produzione, più un'esecuzione settimanale |
| Docker image | Costruisce l'immagine, la avvia su una porta e un utente personalizzati, carica una foto da capo a fondo, poi **aggiorna**: l'ultima release riempie una cartella dati e la nuova immagine deve avviarsi su di essa con ogni evento e foto intatti |
| Workflows | actionlint e zizmor su `.github/` |

**Publish to production** (manuale) fa avanzare `main` fino a `develop` in
fast-forward una volta che Quality e Tests sono passati lì; **Align develop**
riporta su `develop` tutto ciò che arriva su `main`. Taggare `main` con
`vX.Y.Z` esegue **Release**: l'immagine multi-arch su GHCR (e su Docker Hub
quando i suoi segreti sono impostati) e una release GitHub con note generate.
**Docs** costruisce il sito e la wiki da `docs/` (vedi sotto) quando `develop`
li modifica e quando viene taggata una release.

## Aggiornamenti {#upgrades}

`tests/integration/upgrade.test.ts` ricostruisce il database di ogni release
dalle migrazioni che conteneva, lo riempie come faceva quella versione e lo
apre con il codice di oggi. Quando una release aggiunge migrazioni, aggiungila
a `SHIPPED_MIGRATIONS`. Non modificare mai una migrazione una volta rilasciata:
le istanze l'hanno già applicata.

## Rilasciare una versione {#releasing}

1. Sposta le voci **Unreleased** di `CHANGELOG.md` sotto un nuovo titolo
   `## [X.Y.Z] - date`, con una lista **Upgrading** quando qualcosa richiede
   l'attenzione dell'admin, e aggiorna i link di confronto in fondo.
2. Incrementa `version` in `package.json`, fai push su `develop`, attendi i controlli.
3. Esegui **Publish to production**, poi tagga `main` con `vX.Y.Z`.

Le note di rilascio sono quella sezione del changelog (la release fallisce
senza), e la pagina degli aggiornamenti dell'admin la mostra a chiunque usi una
versione precedente.

## Sito della documentazione {#documentation-website}

`docs/` è sia la documentazione letta su GitHub sia la sorgente del sito
(VitePress) e della wiki. Scrivi il Markdown lì, da nessun'altra parte: la wiki
viene rigenerata dal workflow **Docs**, e le modifiche fatte direttamente su di
essa vanno perse.

```bash
cd docs
npm install
npm run dev        # http://localhost:5173/guestroll/
```

`.github/scripts/build-docs.py` costruisce la documentazione di ogni release
(l'ultima alla radice, `develop` sotto `/next/` quando differisce, le più
vecchie sotto `/vX.Y.Z/`), con la configurazione e il tema di oggi, così da
condividere tutte il selettore di versione. `.github/scripts/build-wiki.py` fa
lo stesso per la wiki, con una pagina per release sotto `vX.Y.Z-Page`. I link a
file fuori da `docs/` (come `../SECURITY.md`) puntano a GitHub sul sito.

Manutenzione: Dependabot (raggruppato, attesa di una settimana), issue
inattive, un messaggio di benvenuto alla prima pull request, un'etichetta
«merge conflict», e pull request rimandate in bozza quando vengono richieste
modifiche.

## Modifiche al database {#database-changes}

Modifica `src/lib/db/schema.ts`, poi:

```bash
npm run db:generate -- --name short_description
```

Committa la cartella generata sotto `drizzle/`. Le migrazioni girano
automaticamente all'avvio. Non modificare mai una migrazione già rilasciata.

## Convenzioni {#conventions}

- TypeScript strict, ESM, l'alias `@/` per `src/`.
- Le regole di accesso vanno in `lib/policy.ts`, con un test. Le route restano snelle.
- I testi della UI vanno in `lib/i18n/messages.ts`, in tutte e quattro le lingue.
- Colori solo tramite i token di `globals.css` (`bg-surface`,
  `text-ink-muted`…), così entrambi i temi continuano a funzionare.
- I commenti spiegano il *perché*, non il *cosa*.
- I commit seguono [Conventional Commits](https://www.conventionalcommits.org).

La direzione visiva è descritta in [design-prompt.md](design-prompt.md):
leggila prima di modificare l'interfaccia.
