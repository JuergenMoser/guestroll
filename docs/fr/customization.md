# Personnalisation

La plupart des choses se règlent depuis l'admin : couleurs, logo, design du QR code,
mode de capture, langue. Cette page parle de modifier le code lui-même.

## Filtres et cadres {#filters-and-frames}

Les filtres et les cadres sont appliqués par la file d'envoi (`components/upload/applyEffects.ts`),
pas par le composant de capture : un composant de capture personnalisé en profite sans rien faire.
Les calculs sur les pixels sont dans `src/lib/effects.ts` ; ajoutez-y un filtre ainsi que dans `FILTERS`,
puis donnez-lui un nom dans les traductions.

## Remplacer le composant de capture {#replace-the-capture-component}

Le composant de capture est la partie de la page invité qui décide **comment** les invités
prennent ou choisissent leurs photos : par défaut, un grand bouton déclencheur qui ouvre l'appareil photo.
Il est volontairement séparé de l'envoi : un composant de capture passe des fichiers à
`onFiles()`, et le composant hôte qui l'entoure compresse, met en file, envoie,
relance et affiche la progression. Quoi que vous construisiez, les envois continuent de fonctionner.

### Le contrat {#the-contract}

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

Le composant s'affiche dans le corps de l'appareil photo, sur la couleur de l'évènement. Utilisez les
classes `text-accent-ink` et `border-accent-ink` pour tout ce qui est dessiné dessus :
elles sont calculées pour rester lisibles sur n'importe quelle couleur choisie par les organisateurs.

### Exemple : un compte à rebours façon « photomaton » {#example-a-photo-booth-countdown}

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

`useFileInput` et `ShutterButton` sont exportés précisément pour cela. Les navigateurs n'ouvrent
l'appareil photo qu'à la suite d'un geste de l'utilisateur : un compte à rebours qui appelle `camera.open()`
depuis un minuteur fonctionne sur Android mais est bloqué par Safari sur iOS. En production,
ouvrez d'abord l'appareil photo et affichez le compte à rebours à l'écran.

### Le brancher {#wire-it-in}

Le registre associe chaque mode de capture à un composant. Faites pointer un mode vers le vôtre :

```ts
// src/components/capture/registry.ts
export const captureComponents: Record<CaptureMode, ComponentType<CaptureProps>> = {
  camera: CountdownCapture, // every event in "camera only" mode now uses it
  picker: PickerCapture,
  both: CameraAndPickerCapture,
};
```

Pour le proposer **à côté** des composants intégrés, ajoutez plutôt un mode :

1. ajoutez-le à `CAPTURE_MODES` dans `src/lib/constants.ts` ;
2. ajoutez-le à l'enum `captureMode` dans `src/lib/db/schema.ts` et lancez `npm run db:generate` ;
3. associez-le dans le registre ;
4. ajoutez son libellé sous `admin.form.captureModes` dans chaque langue de `src/lib/i18n/messages.ts`.

Construisez ensuite votre propre image : `docker build -t my-guestroll .`

## Couleurs, logo et QR codes {#colors-logo-and-qr-codes}

Depuis l'admin, par évènement : couleur d'accent, logo (affiché sur la page invité, dans le
QR code et sur la carte de partage social), couleurs, formes et légende du QR code.

Les couleurs de l'interface sont des tokens dans `src/app/globals.css` (`--color-canvas`,
`--color-ink`, …), définis une fois pour le thème clair et une fois pour le thème sombre.
Les composants n'utilisent que les noms de tokens : changer une valeur modifie tout le style.

## Traductions {#translations}

Tout le texte se trouve dans `src/lib/i18n/messages.ts` : l'anglais est la référence, et les
autres langues doivent fournir toutes les clés (sinon `tests/translate.test.ts`
échoue). Pour ajouter une langue :

1. ajoutez son code à `LOCALES` dans `src/lib/constants.ts`, et son nom à
   `LOCALE_NAMES` dans `src/lib/i18n/locale.ts` ;
2. ajoutez un dictionnaire dans `messages.ts` et enregistrez-le dans `messages` ;
3. ajoutez-la à l'enum `defaultLocale` dans `src/lib/db/schema.ts` et lancez `npm run db:generate`.

Les pull requests qui ajoutent des langues sont les bienvenues.
