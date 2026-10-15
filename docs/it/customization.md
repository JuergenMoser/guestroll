# Personalizzazione

Quasi tutto si configura dall'admin: colori, logo, design del codice QR,
modalità di scatto, lingua. Questa pagina riguarda la modifica del codice stesso.

## Filtri e cornici {#filters-and-frames}

Filtri e cornici vengono applicati dalla coda di caricamento (`components/upload/applyEffects.ts`),
non dal componente di scatto: un componente di scatto personalizzato li ottiene gratis.
I calcoli sui pixel stanno in `src/lib/effects.ts`; aggiungi lì un filtro e in `FILTERS`,
poi dagli un nome nelle traduzioni.

## Sostituire il componente di scatto {#replace-the-capture-component}

Il componente di scatto è la parte della pagina ospite che decide **come** gli
ospiti scattano o scelgono le foto: di default, un grande pulsante di scatto che
apre la fotocamera. È volutamente separato dal caricamento: un componente di
scatto passa i file a `onFiles()`, e il componente host che lo circonda
comprime, mette in coda, carica, ritenta e mostra l'avanzamento. Qualunque cosa
tu costruisca, i caricamenti continuano a funzionare.

### Il contratto {#the-contract}

```ts
// src/components/capture/types.ts
export interface CaptureProps {
  /** Queue files for upload. Call it as many times as you like. */
  onFiles: (files: File[]) => void;
  /** True while uploads are closed or the guest reached their quota. */
  disabled: boolean;
  /** Photos this guest may still send, or null when unlimited. */
  remaining: number | null;
  event: PublicEvent;
}
```

Il componente viene disegnato dentro il corpo della fotocamera, sul colore
dell'evento. Usa le classi `text-accent-ink` e `border-accent-ink` per tutto ciò
che disegni sopra: sono calcolate per restare leggibili su qualsiasi colore
scelgano gli organizzatori.

### Esempio: un conto alla rovescia da «cabina fotografica» {#example-a-photo-booth-countdown}

```tsx
// src/components/capture/CountdownCapture.tsx
"use client";

import { useState } from "react";
import { useFileInput } from "./useFileInput";
import { ShutterButton } from "./ShutterButton";
import type { CaptureProps } from "./types";

export function CountdownCapture({ onFiles, disabled }: CaptureProps) {
  const camera = useFileInput(onFiles, { camera: true, multiple: false });
  const [count, setCount] = useState<number | null>(null);

  function start() {
    let n = 3;
    setCount(n);
    const timer = setInterval(() => {
      n -= 1;
      if (n > 0) return setCount(n);
      clearInterval(timer);
      setCount(null);
      camera.open();
    }, 1000);
  }

  return (
    <div className="flex flex-col items-center gap-3 text-accent-ink">
      {camera.input}
      <ShutterButton onClick={start} disabled={disabled || count !== null} label="Start the countdown" />
      <span className="text-base font-semibold">{count ?? "Smile!"}</span>
    </div>
  );
}
```

`useFileInput` e `ShutterButton` sono esportati proprio per questo. I browser
aprono la fotocamera solo in seguito a un gesto dell'utente, quindi un conto
alla rovescia che chiama `camera.open()` da un timer funziona su Android ma
viene bloccato da Safari su iOS: in produzione, apri prima la fotocamera e fai
il conto alla rovescia sullo schermo.

### Collegarlo {#wire-it-in}

Il registro associa ogni modalità di scatto a un componente. Punta una modalità sul tuo:

```ts
// src/components/capture/registry.ts
export const captureComponents: Record<CaptureMode, ComponentType<CaptureProps>> = {
  camera: CountdownCapture, // every event in "camera only" mode now uses it
  picker: PickerCapture,
  both: CameraAndPickerCapture,
};
```

Per offrirlo invece **accanto** a quelli integrati, aggiungi una modalità:

1. aggiungila a `CAPTURE_MODES` in `src/lib/constants.ts`;
2. aggiungila all'enum `captureMode` in `src/lib/db/schema.ts` ed esegui `npm run db:generate`;
3. associala nel registro;
4. aggiungi la sua etichetta sotto `admin.form.captureModes` in ogni lingua di `src/lib/i18n/messages.ts`.

Poi costruisci la tua immagine: `docker build -t my-guestroll .`

## Colori, logo e codici QR {#colors-logo-and-qr-codes}

Dall'admin, per evento: colore principale, logo (mostrato nella pagina ospite,
nel codice QR e nella card social), colori, forme e didascalia del codice QR.

I colori dell'interfaccia sono token in `src/app/globals.css` (`--color-canvas`,
`--color-ink`, …), definiti una volta per il tema chiaro e una volta per quello
scuro. I componenti usano solo i nomi dei token, quindi cambiare un valore
aggiorna lo stile di tutto.

## Traduzioni {#translations}

Tutti i testi stanno in `src/lib/i18n/messages.ts`: l'inglese è il riferimento,
e le altre lingue devono fornire ogni chiave (altrimenti `tests/translate.test.ts`
fallisce). Per aggiungere una lingua:

1. aggiungi il suo codice a `LOCALES` in `src/lib/constants.ts`, e il suo nome a
   `LOCALE_NAMES` in `src/lib/i18n/locale.ts`;
2. aggiungi un dizionario in `messages.ts` e registralo in `messages`;
3. aggiungila all'enum `defaultLocale` in `src/lib/db/schema.ts` ed esegui `npm run db:generate`.

Le pull request con nuove lingue sono più che benvenute.
