# Desarrollo {#development}

## Ejecutar en local {#run-locally}

```bash
git clone https://github.com/achedon12/guestroll && cd guestroll
nvm use            # Node 22, see .nvmrc
npm ci
echo "ADMIN_PASSWORD=dev-password-123" > .env.local
npm run dev        # http://localhost:3000
```

Rellénalo con eventos y fotos de demostración (a través de la API pública, en otra
terminal):

```bash
BASE_URL=http://localhost:3000 ADMIN_PASSWORD=dev-password-123 npm run seed:demo
```

Para probar la cámara en un móvil de verdad, la página tiene que ser HTTPS. Lo más rápido es
un túnel (`cloudflared tunnel --url http://localhost:3000`) o
`next dev --experimental-https` en tu red local.

## Comprobaciones {#checks}

```bash
npm run lint
npm run typecheck      # generates Next's route types first
npm test               # unit + integration (Vitest)
npm run test:coverage  # the same, with a coverage report in coverage/
npm run build
npm run test:e2e       # functional tests on the production build (Playwright)
```

`npm run test:e2e` arranca el build de producción en el puerto 3210 con una carpeta de datos
temporal, así que nunca toca tus datos. En local usa el Chrome que tengas
instalado; en CI, el Chromium instalado por `npx playwright install`.

### Tres capas de pruebas {#three-layers-of-tests}

| Capa | Dónde | Contra qué se ejecuta |
|---|---|---|
| Unitarias | `tests/unit/` | Módulos puros: política de acceso, validación, limitador de peticiones, renderizado de QR… |
| Integración | `tests/integration/` | SQLite real en una carpeta temporal, imágenes reales pasadas por sharp, ZIP reales, códigos QR descodificados por ZXing |
| Funcionales | `tests/e2e/api/` | La API HTTP de un build de producción en marcha: escenarios de invitado y de admin, seguridad, cuotas |
| Navegador | `tests/e2e/browser/` | Recorridos reales: un invitado en un móvil, un administrador en un ordenador |

Archivos de pruebas unitarias:

| Archivo | Qué garantiza |
|---|---|
| `policy.test.ts` | Cada regla de acceso: quién ve qué foto, y en qué tamaño |
| `routeGuards.test.ts` | Cada página y ruta del admin comprueba la sesión; cada modificación de invitado comprueba el origen |
| `qrScan.test.ts` | Cada ajuste predefinido y forma de QR se renderiza y se descodifica con ZXing |
| `qr.test.ts` | Análisis del estilo, escapado, hueco para el logo |
| `request.test.ts` | Reglas de IP del cliente y de origen, el límite del cuerpo en streaming |
| `rateLimit.test.ts`, `validation.test.ts`, `ids.test.ts`, `negotiate.test.ts`, `translate.test.ts` | El resto de módulos puros |

## Ramas e integración continua {#branches-and-ci}

`develop` es la rama por defecto, donde llegan las pull requests; `main` es
producción. Cada cambio en cualquiera de las dos ramas ejecuta:

| Workflow | Qué hace |
|---|---|
| Quality | Lint, tipos, build de producción |
| Tests | Vitest con cobertura, luego Playwright sobre un build de producción |
| Security | CodeQL (código y workflows) y `npm audit` sobre las dependencias de producción, más una ejecución semanal |
| Docker image | Construye la imagen, la ejecuta con un puerto y un usuario personalizados, envía una foto de principio a fin y luego **actualiza**: la última versión publicada llena una carpeta de datos y la imagen nueva debe arrancar sobre ella con todos los eventos y fotos intactos |
| Workflows | actionlint y zizmor sobre `.github/` |

**Publish to production** (manual) hace avanzar `main` hasta `develop` una vez que
Quality y Tests han pasado ahí; **Align develop** lleva de vuelta a `develop` todo lo que llega a
`main`. Etiquetar `main` con `vX.Y.Z` lanza **Release**: la
imagen multiarquitectura en GHCR (y en Docker Hub cuando sus secretos están definidos) y una release
de GitHub con notas generadas. **Docs** construye el sitio web y la wiki a partir de
`docs/` (ver más abajo) cuando `develop` los modifica y cuando se etiqueta una versión.

## Actualizaciones {#upgrades}

`tests/integration/upgrade.test.ts` reconstruye la base de datos de cada versión a partir de
las migraciones que incluía, la llena como lo hacía esa versión y la abre con
el código actual. Cuando una versión añade migraciones, añádela a `SHIPPED_MIGRATIONS`.
Nunca edites una migración ya publicada: las instancias ya la aplicaron.

## Publicar una versión {#releasing}

1. Mueve las entradas **Unreleased** de `CHANGELOG.md` bajo un nuevo
   encabezado `## [X.Y.Z] - date`, con una lista **Upgrading** cuando algo
   requiera la atención del administrador, y actualiza los enlaces de comparación del final.
2. Sube `version` en `package.json`, haz push a `develop` y espera a las comprobaciones.
3. Ejecuta **Publish to production** y luego etiqueta `main` con `vX.Y.Z`.

Las notas de versión son esa sección del changelog (la release falla sin
ella), y la página de actualizaciones del admin se la muestra a todos los que usan una
versión anterior.

## Sitio web de la documentación {#documentation-website}

`docs/` es a la vez la documentación que se lee en GitHub y la fuente del sitio web
(VitePress) y de la wiki. Escribe el Markdown ahí y en ningún otro sitio: el workflow **Docs**
regenera la wiki, y lo que se edite en ella se pierde.

```bash
cd docs
npm install
npm run dev        # http://localhost:5173/guestroll/
```

`.github/scripts/build-docs.py` construye la documentación de cada versión (la última en la
raíz, `develop` bajo `/next/` cuando difiere, las anteriores bajo `/vX.Y.Z/`),
con la configuración y el tema actuales para que todas compartan el selector de versión.
`.github/scripts/build-wiki.py` hace lo mismo para la wiki, con una página por
versión bajo `vX.Y.Z-Page`. Los enlaces a archivos fuera de `docs/` (como
`../SECURITY.md`) apuntan a GitHub en el sitio web.

Mantenimiento: Dependabot (agrupado, con una semana de espera), issues inactivas, un mensaje
de bienvenida en las primeras pull requests, una etiqueta «merge conflict», y las pull requests que vuelven
a borrador cuando se piden cambios.

## Cambios en la base de datos {#database-changes}

Edita `src/lib/db/schema.ts` y luego:

```bash
npm run db:generate -- --name short_description
```

Haz commit de la carpeta generada en `drizzle/`. Las migraciones se ejecutan automáticamente al
arrancar. Nunca edites una migración que ya se haya publicado.

## Convenciones {#conventions}

- TypeScript estricto, ESM, el alias `@/` para `src/`.
- Las reglas de acceso van en `lib/policy.ts` con una prueba. Las rutas se mantienen ligeras.
- El texto de la UI va en `lib/i18n/messages.ts`, en los cuatro idiomas.
- Los colores, solo a través de los tokens de `globals.css` (`bg-surface`,
  `text-ink-muted`…), para que ambos temas sigan funcionando.
- Los comentarios explican el *porqué*, no el *qué*.
- Los commits siguen [Conventional Commits](https://www.conventionalcommits.org).

La dirección visual se describe en [design-prompt.md](design-prompt.md):
léela antes de cambiar la interfaz.
