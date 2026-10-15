# Customization

Most things are configurable from the admin: colors, logo, QR code design,
capture mode, language. This page is about changing the code itself.

## Filters and frames

Filters and frames are applied by the upload queue (`components/upload/applyEffects.ts`),
not by the capture component: a custom capture component gets them for free.
The pixel math is in `src/lib/effects.ts`; add a filter there and to `FILTERS`,
then give it a name in the translations.

## Replace the capture component

The capture component is the part of the guest page that decides **how** guests
take or pick photos: by default, a big shutter button that opens the camera.
It is deliberately separate from the upload: a capture component hands files to
`onFiles()`, and the host component around it compresses, queues, uploads,
retries and shows progress. Whatever you build, uploads keep working.

### The contract

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

The component renders inside the camera body, on the event's color. Use the
`text-accent-ink` and `border-accent-ink` classes for anything drawn on it:
they are computed to stay readable on any color the hosts pick.

### Example: a "photo booth" countdown

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

`useFileInput` and `ShutterButton` are exported for exactly this. Browsers only
open the camera from a user gesture, so a countdown that calls `camera.open()`
from a timer works on Android but is blocked by iOS Safari: in production,
open the camera first and count down on screen instead.

### Wire it in

The registry maps each capture mode to a component. Point a mode at yours:

```ts
// src/components/capture/registry.ts
export const captureComponents: Record<CaptureMode, ComponentType<CaptureProps>> = {
  camera: CountdownCapture, // every event in "camera only" mode now uses it
  picker: PickerCapture,
  both: CameraAndPickerCapture,
};
```

To offer it **next to** the built-in ones instead, add a mode:

1. add it to `CAPTURE_MODES` in `src/lib/constants.ts`;
2. add it to the `captureMode` enum in `src/lib/db/schema.ts` and run `npm run db:generate`;
3. map it in the registry;
4. add its label under `admin.form.captureModes` in each language of `src/lib/i18n/messages.ts`.

Then build your own image: `docker build -t my-guestroll .`

## Colors, logo and QR codes

From the admin, per event: accent color, logo (shown on the guest page, in the
QR code and on the social card), QR code colors, shapes and caption.

The interface colors are tokens in `src/app/globals.css` (`--color-canvas`,
`--color-ink`, …), defined once for the light theme and once for the dark one.
Components only use the token names, so changing a value restyles everything.

## Translations

All text lives in `src/lib/i18n/messages.ts`: English is the reference, and the
other languages must provide every key (`tests/translate.test.ts` fails
otherwise). To add a language:

1. add its code to `LOCALES` in `src/lib/constants.ts`, and its name to
   `LOCALE_NAMES` in `src/lib/i18n/locale.ts`;
2. add a dictionary in `messages.ts` and register it in `messages`;
3. add it to the `defaultLocale` enum in `src/lib/db/schema.ts` and run `npm run db:generate`.

Pull requests with new languages are very welcome.
