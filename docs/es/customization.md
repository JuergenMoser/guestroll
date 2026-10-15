# Personalización {#customization}

Casi todo se configura desde el admin: colores, logo, diseño del código QR,
modo de captura, idioma. Esta página trata de modificar el propio código.

## Filtros y marcos {#filters-and-frames}

Los filtros y marcos los aplica la cola de envío (`components/upload/applyEffects.ts`),
no el componente de captura: un componente de captura propio los obtiene sin hacer nada.
Los cálculos de píxeles están en `src/lib/effects.ts`; añade ahí un filtro y en `FILTERS`,
y luego dale un nombre en las traducciones.

## Sustituir el componente de captura {#replace-the-capture-component}

El componente de captura es la parte de la página del invitado que decide **cómo** los invitados
hacen o eligen las fotos: por defecto, un gran botón de obturador que abre la cámara.
Está separado del envío a propósito: un componente de captura entrega archivos a
`onFiles()`, y el componente anfitrión que lo rodea comprime, pone en cola, envía,
reintenta y muestra el progreso. Construyas lo que construyas, los envíos siguen funcionando.

### El contrato {#the-contract}

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

El componente se dibuja dentro del cuerpo de la cámara, sobre el color del evento. Usa las
clases `text-accent-ink` y `border-accent-ink` para todo lo que dibujes encima:
se calculan para seguir siendo legibles sobre cualquier color que elijan los anfitriones.

### Ejemplo: una cuenta atrás de «fotomatón» {#example-a-photo-booth-countdown}

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

`useFileInput` y `ShutterButton` se exportan justo para esto. Los navegadores solo
abren la cámara tras un gesto del usuario, así que una cuenta atrás que llama a `camera.open()`
desde un temporizador funciona en Android pero Safari en iOS la bloquea: en producción,
abre primero la cámara y haz la cuenta atrás en pantalla.

### Conéctalo {#wire-it-in}

El registro asocia cada modo de captura a un componente. Apunta un modo al tuyo:

```ts
// src/components/capture/registry.ts
export const captureComponents: Record<CaptureMode, ComponentType<CaptureProps>> = {
  camera: CountdownCapture, // every event in "camera only" mode now uses it
  picker: PickerCapture,
  both: CameraAndPickerCapture,
};
```

Para ofrecerlo **junto a** los integrados, añade un modo:

1. añádelo a `CAPTURE_MODES` en `src/lib/constants.ts`;
2. añádelo al enum `captureMode` en `src/lib/db/schema.ts` y ejecuta `npm run db:generate`;
3. asócialo en el registro;
4. añade su etiqueta en `admin.form.captureModes` en cada idioma de `src/lib/i18n/messages.ts`.

Después construye tu propia imagen: `docker build -t my-guestroll .`

## Colores, logo y códigos QR {#colors-logo-and-qr-codes}

Desde el admin, por evento: color de acento, logo (visible en la página del invitado, en el
código QR y en la tarjeta para redes sociales), colores, formas y pie de texto del código QR.

Los colores de la interfaz son tokens en `src/app/globals.css` (`--color-canvas`,
`--color-ink`, …), definidos una vez para el tema claro y otra para el oscuro.
Los componentes solo usan los nombres de los tokens, así que cambiar un valor cambia el estilo de todo.

## Traducciones {#translations}

Todo el texto está en `src/lib/i18n/messages.ts`: el inglés es la referencia, y los
demás idiomas deben incluir todas las claves (`tests/translate.test.ts` falla
si no). Para añadir un idioma:

1. añade su código a `LOCALES` en `src/lib/constants.ts`, y su nombre a
   `LOCALE_NAMES` en `src/lib/i18n/locale.ts`;
2. añade un diccionario en `messages.ts` y regístralo en `messages`;
3. añádelo al enum `defaultLocale` en `src/lib/db/schema.ts` y ejecuta `npm run db:generate`.

Las pull requests con idiomas nuevos son más que bienvenidas.
