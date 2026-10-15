# Per iniziare

Questa guida ti porta da zero a un codice QR stampato in una decina di minuti.

## 1. Avvia Guestroll {#_1-run-guestroll}

Ti serve una macchina con Docker: un VPS, un server di casa, un NAS o un Raspberry Pi 4/5.

```bash
docker run -d --name guestroll \
  --restart unless-stopped \
  -p 3000:3000 \
  -v guestroll-data:/data \
  -e ADMIN_PASSWORD='choose-a-long-password' \
  -e PUBLIC_URL='https://photos.example.com' \
  ghcr.io/achedon12/guestroll:latest
```

- `-v guestroll-data:/data` conserva il database e le foto quando il container viene ricreato. **Non saltarlo.**
- `PUBLIC_URL` è l'indirizzo codificato nei codici QR. Usa l'indirizzo HTTPS pubblico che raggiungeranno gli ospiti.
- Accedi su `/admin` come `admin`. Senza `ADMIN_PASSWORD`, viene generata una password casuale, stampata una sola volta: `docker logs guestroll`.
- Ti serve aiuto? Crea degli account per i tuoi aiutanti in **Admin → Impostazioni → Team**: un *organizzatore* vede solo gli eventi che gli assegni.

Gli altri modi per avviarlo (Compose, Node.js senza Docker) sono in [Deployment](deployment.md).

## 2. Mettilo dietro HTTPS {#_2-put-it-behind-https}

I telefoni si rifiutano di aprire la fotocamera da una pagina `http://`. Prima
dell'evento, l'istanza deve essere raggiungibile in HTTPS. La via più rapida è
Caddy, che ottiene un certificato da solo:

```caddy
photos.example.com {
	reverse_proxy localhost:3000
}
```

Poi imposta `TRUST_PROXY=true`, così i limiti di frequenza vedono il vero IP del client.
[Deployment](deployment.md#https-and-reverse-proxies) copre anche Traefik e nginx.

## 3. Crea un evento {#_3-create-an-event}

1. Apri `https://photos.example.com/admin` e accedi.
2. **Nuovo evento**: dagli un nome. Tutto il resto ha un valore predefinito sensato e si può cambiare dopo.
3. Arrivi sulla scheda **QR e condivisione**.

Conviene decidere subito:

| Impostazione | Consigliato per una festa privata |
|---|---|
| Codice di accesso | Impostane uno se il codice QR rischia di finire sui social |
| Lingua dell'album | *Automatica* segue il telefono di ogni ospite. Scegline una se tutti gli ospiti parlano la stessa lingua |
| Moderazione | *Pubblica subito* tra amici, *Approva ogni foto* se proietterai la parete live |
| Chiudi i caricamenti automaticamente il | La mattina dopo |

## 4. Stampa il codice QR {#_4-print-the-qr-code}

In **QR e condivisione**, l'editor ti permette di colorare il codice, arrotondarne
punti e angoli, mettere il tuo logo al centro e aggiungere una didascalia. L'anteprima
è esattamente il file che scaricherai. Resta su punti scuri su sfondo chiaro: molti
scanner Android non leggono il contrario, e l'editor ti avvisa se ci provi.

**Locandina da stampare** ti dà un cartoncino A4 con il nome dell'evento e il codice
QR: stampalo dal browser. Per una tipografia, scarica l'**SVG**. Resta nitido a
qualsiasi dimensione.

Provalo: scansiona il codice con il tuo telefono, scatta una foto e controlla che
compaia nella scheda **Foto**.

## 5. Il giorno dell'evento {#_5-on-the-day}

- [ ] Prova con il telefono dalla rete del locale o in 4G, non dal Wi-Fi di casa
- [ ] La parete live aperta sul portatile collegato al proiettore (**QR e condivisione → Apri la parete live**)
- [ ] Un cartoncino QR per tavolo, più uno vicino all'ingresso
- [ ] Spazio sul server: conta circa 3 MB per foto

## 6. Dopo l'evento {#_6-after-the-event}

- **Foto → Scarica ZIP** recupera tutto alla risoluzione piena.
- Chiudi i caricamenti (**Impostazioni → Accetta caricamenti**) se non l'hai programmato.
- In Guestroll gli ospiti non vedono mai le foto degli altri. Per condividere
  l'album, invia lo ZIP, o le foto che hai scelto, sul canale che preferisci.
