# Arquitectura {#architecture}

Una app Next.js, un proceso, un archivo SQLite, una carpeta de fotos.

```
                    ┌────────────────────── Guestroll (Node.js) ───────────────────────┐
 phone ──QR code──▶ │ /e/[slug]          guest page (server component + client app)   │
                    │ /api/e/[slug]/*    join, unlock, name, upload, own photos       │
                    │ /api/media/[id]    the only way a photo leaves the server       │
 laptop ──────────▶ │ /admin/*           admin pages                                  │
                    │ /api/admin/*       events, moderation, QR, archives, stats      │
                    │                                                                  │
                    │ lib/policy.ts ◀── every access decision, pure and tested        │
                    │ lib/*        ──▶ SQLite (Drizzle)   ──▶ DATA_DIR/guestroll.db   │
                    │              ──▶ files               ──▶ DATA_DIR/uploads/       │
                    └──────────────────────────────────────────────────────────────────┘
```

## Flujo de una petición: un invitado hace una foto {#request-flow-a-guest-takes-a-photo}

1. El código QR abre `/e/<slug>`. El componente de servidor busca el evento; si
   el navegador aún no se ha unido, renderiza `AutoJoin` (sin código) o
   `UnlockScreen` (con código). Unirse escribe el id del evento en la cookie cifrada
   `gr_guest`.
2. La página del invitado renderiza el componente de captura elegido para el evento
   (`components/capture/registry.ts`) dentro de `CaptureHost`.
3. El componente de captura llama a `onFiles(files)`. `useUploadQueue` comprime
   cada archivo en el navegador y luego lo envía mostrando el progreso, de uno en uno,
   reintentando ante errores de red y esperando mientras no hay conexión.
4. `POST /api/e/<slug>/photos` comprueba el origen, la unión al evento, el estado de los envíos
   y la cuota (`lib/policy.ts`), toma un bloqueo por invitado, lee el cuerpo con un
   límite de tamaño, identifica y recodifica la imagen (`lib/images/process.ts`) en
   tres variantes, las escribe en `DATA_DIR/uploads/<event>/` e inserta
   la fila.
5. La foto vuelve como un `PhotoDto`: ids y dimensiones, nunca una ruta.
   Las miniaturas se cargan desde `/api/media/<id>?v=thumb`, que vuelve a comprobar el acceso.

## Organización del código {#code-layout}

```
src/
├── app/                      routes (Next.js App Router)
│   ├── e/[slug]/             guest page and its social card
│   ├── admin/                login, (panel)/ pages, poster, live wall
│   └── api/                  route handlers, thin: validate, ask policy, call lib
├── components/
│   ├── ui/                   design-system primitives (Button, Field, SegmentedControl…)
│   ├── capture/              swappable capture components and their contract
│   ├── upload/               CaptureHost, upload queue, exposure counter, prints tray
│   ├── guest/                guest page pieces
│   └── admin/                admin pieces (event-form/, moderation/, qr/…)
└── lib/
    ├── policy.ts             all access rules, no I/O
    ├── validation.ts         request body parsing, no I/O
    ├── db/                   Drizzle schema and client (migrations in /drizzle)
    ├── auth/                 admin password, sessions, page guard
    ├── security/             rate limiter, request helpers, ids
    ├── images/               upload and logo processing (sharp)
    ├── storage/              file paths and I/O
    ├── qr/                   style parsing, the SVG renderer, server export
    ├── i18n/                 messages (en, fr, it, es), locale resolution
    └── events.ts, photos.ts, stats.ts, archive.ts   data access
```

Dos reglas mantienen esto mantenible:

- **Las reglas de acceso viven solo en `lib/policy.ts`.** Las rutas le preguntan; nunca
  vuelven a deducir una regla por su cuenta. El filtro SQL de `listPhotos` refleja
  `canViewPhoto` y es la única excepción, comentada como tal.
- **El código del navegador nunca importa módulos de servidor.** Todo lo que se comparte con los
  componentes de cliente vive en módulos sin imports de Node (`lib/constants.ts`,
  `lib/qr/render.ts`, `lib/i18n/messages.ts`). Los módulos solo de servidor importan
  `server-only` para que un error haga fallar el build.

## Updater {#updater}

`updater/` es un programa Node aparte, sin dependencias, distribuido en la misma
imagen (perfil `updater` de `docker-compose`). `docker.mjs` habla con la API de Docker
Engine a través del socket, `update.mjs` sustituye un contenedor por el mismo
con una imagen nueva (conservando sus propios ajustes, no los valores por defecto de su antigua imagen)
y vuelve atrás cuando falla la comprobación de salud, `server.mjs` atiende las peticiones
de la app autenticadas con token. La parte de la app es `src/lib/updates.ts` (comprobaciones en
GitHub, historial de actualizaciones) y `src/lib/updater.ts` (el cliente).

## Datos {#data}

| Tabla | Contiene |
|---|---|
| `events` | Ajustes, hash del código de acceso, estilo del QR (JSON), versión del logo |
| `photos` | Una fila por foto: evento, id de invitado, nombre opcional, tamaño, estado, número de descargas |
| `activity` | Registro de solo inserción detrás de cada estadística (visita, envío, descarga, código fallido…) |
| `accounts` | Cuentas de administración: nombre de usuario, hash de la contraseña, rol (`owner` / `organizer`), versión de sesión |
| `account_events` | Qué eventos gestiona cada organizador |
| `settings` | Clave/valor: SMTP (contraseña sellada), alertas elegidas, correo de la instancia |
| `share_links` | Enlaces a la galería: token, hash de la contraseña, caducidad, interruptor de descargas, visitas, revocación |
| `guest_contacts` | Correos de invitados voluntarios, uno por invitado y evento, eliminados con el evento |
| `messages` | Libro de visitas: texto, contenedor y tamaño de la nota de voz, estado. El archivo de audio es `<event-id>/messages/<id>.<ext>` en el almacenamiento |
| `webhook_deliveries` | Cola de webhooks: el aviso en JSON, formateado para el servicio al enviarse, reintentado como los correos |
| `outbox` | Cola de correo: mensaje renderizado, estado, intentos, próximo reintento, clave de deduplicación |

Los invitados no tienen tabla: un invitado es un id aleatorio en su cookie. Su nombre se
copia en cada foto que envía.

Archivos: `<event-id>/<photo-id>.{original.jpg,display.webp,thumb.webp}` y
`<event-id>/logo.png`, en `DATA_DIR/uploads` o en un bucket S3. Ambos drivers
implementan `StorageDriver` (`src/lib/storage/driver.ts`) y pasan la misma
prueba de contrato (`tests/integration/storage.test.ts`); el de S3 firma llamadas
`fetch` simples (aws4fetch) en lugar de incluir el SDK de AWS.

## Decisiones que conviene conocer {#choices-worth-knowing}

- **El trabajo pesado con medios se hace en el navegador.** Los marcos y filtros se dibujan en
  el móvil del invitado antes del envío, y el vídeo de diapositivas lo codifica el
  navegador del administrador (WebCodecs, multiplexado por mediabunny). La imagen nunca incluye
  ffmpeg, ni su tamaño ni sus CVE.

- **El correo pasa por una cola en SQLite**, vaciada por un planificador dentro del proceso
  (`src/lib/scheduler.ts`, arrancado desde `instrumentation.ts`). Una caída del SMTP
  nunca hace fallar una petición, y cada correo tiene una clave de deduplicación para que una tarea reintentada
  no pueda enviarlo dos veces. Terminar un evento se reserva de forma atómica sobre `ended_at`.

- **SQLite en modo WAL** aguanta sin problemas la ráfaga de envíos de una boda y
  convierte las copias en una copia de archivo. La contrapartida: un proceso, sin escalado horizontal.
  Por eso también el limitador de peticiones está en memoria.
- **Recodificar cada envío** cuesta CPU pero elimina los metadatos GPS y cualquier
  carga oculta en el archivo.
- **Un envío a la vez por invitado**, impuesto en ambos lados, mantiene las cuotas
  exactas y los móviles ágiles.
- **El renderizador de QR es puro** y lo comparten la vista previa en directo y la
  exportación del servidor, así que el archivo descargado coincide con la vista previa.
