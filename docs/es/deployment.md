# Despliegue {#deployment}

## Requisitos {#requirements}

- Docker 20.10+ (o Node.js 22.12+ para ejecutarlo sin Docker)
- Unos 256 MB de RAM. El procesamiento de imágenes llega a ~150 MB por envío en curso.
- Espacio en disco para las fotos: unos 3 MB por foto (original más dos vistas previas)
- Un nombre de dominio con HTTPS (lo exigen las cámaras de los móviles)

Las imágenes se publican para `linux/amd64` y `linux/arm64` en
[GHCR](https://github.com/achedon12/guestroll/pkgs/container/guestroll) (`ghcr.io/achedon12/guestroll`)
y [Docker Hub](https://hub.docker.com/r/achedon12/guestroll) (`achedon12/guestroll`), con las mismas etiquetas.

| Etiqueta | Significado |
|---|---|
| `latest` | La versión más reciente |
| `1`, `1.2` | La versión más reciente de esa rama mayor / menor |
| `1.2.3` | Una versión exacta. Fíjala en producción. |

## Docker Compose {#docker-compose}

```yaml
services:
  guestroll:
    image: ghcr.io/achedon12/guestroll:1
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000" # only reachable through the reverse proxy
    environment:
      PUBLIC_URL: https://photos.example.com
      ADMIN_PASSWORD: ${GUESTROLL_ADMIN_PASSWORD}
      TRUST_PROXY: "true"
    volumes:
      - ./data:/data
```

Con un bind mount (`./data`), define `PUID` y `PGID` con el propietario de esa carpeta
(`id -u`, `id -g`): al arrancar, el contenedor le cede la carpeta a ese usuario, luego
abandona root y ejecuta el servidor como él. Arráncalo con `--user` para saltarte ese paso
por completo y gestionar tú los permisos.

El [`docker-compose.yml`](../../docker-compose.yml) del repositorio lo lee todo
de `.env`, incluido el puerto publicado (`HOST_PORT`), la interfaz en la que escucha
(`HOST_BIND`), la ruta de los datos y la etiqueta de la imagen:

```bash
cp .env.example .env   # then edit it
docker compose up -d
```

## HTTPS y proxies inversos {#https-and-reverse-proxies}

Define siempre `TRUST_PROXY=true` detrás de un proxy, y **solo** entonces: hace que
Guestroll lea la IP del cliente de `X-Forwarded-For`, que cualquiera podría falsificar
sin un proxy delante.

Sube el límite de tamaño del cuerpo de las peticiones del proxy por encima de `MAX_UPLOAD_MB` (25 MB por defecto).

### Caddy {#caddy}

```caddy
photos.example.com {
	request_body {
		max_size 30MB
	}
	reverse_proxy guestroll:3000
}
```

### Traefik (etiquetas) {#traefik-labels}

```yaml
    labels:
      - traefik.enable=true
      - traefik.http.routers.guestroll.rule=Host(`photos.example.com`)
      - traefik.http.routers.guestroll.entrypoints=websecure
      - traefik.http.routers.guestroll.tls.certresolver=letsencrypt
      - traefik.http.services.guestroll.loadbalancer.server.port=3000
```

### nginx {#nginx}

```nginx
server {
    listen 443 ssl http2;
    server_name photos.example.com;
    # ssl_certificate / ssl_certificate_key …

    client_max_body_size 30m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # Stream ZIP downloads instead of buffering them on disk.
        proxy_buffering off;
    }
}
```

## Sin Docker {#without-docker}

```bash
git clone https://github.com/achedon12/guestroll && cd guestroll
npm ci
npm run build
cp -r .next/static .next/standalone/.next/ && cp -r drizzle .next/standalone/
cd .next/standalone
DATA_DIR=/var/lib/guestroll ADMIN_PASSWORD=… PUBLIC_URL=… node server.js
```

Ejecútalo con systemd u otro supervisor, como un usuario sin privilegios que sea propietario de `DATA_DIR`.

## Una demo pública {#a-public-demo}

`DEMO_MODE=true` convierte una instancia en una demo que cualquiera puede probar:
`docker compose -f docker-compose.demo.yml up -d`.

- En el primer arranque crea tres eventos (una boda con retos, un
  libro de visitas, favoritas, marcos y un muro en mosaico; un cumpleaños con moderación;
  una conferencia) con fotos, mensajes y un enlace a la galería generados.
- Una cuenta de propietario compartida, `demo` / `guestroll-demo`, aparece en la página
  de inicio de sesión y en un banner en cada página, junto con la contraseña del enlace a la galería.
- Todo se restablece según `DEMO_RESET_CRON` (cada noche a las 4:00 UTC): los eventos,
  fotos y cuentas de los visitantes desaparecen y los datos de ejemplo se vuelven a crear.
- Nada sale de la instancia: los correos y webhooks se quedan en cola, la comprobación de
  actualizaciones está desactivada, y los ajustes de correo, webhooks, copias, actualizaciones, contraseña, dos pasos y
  cuentas responden `403`. `ADMIN_PASSWORD` sigue siendo la cuenta `admin` propia
  del operador.

## Copias de seguridad {#backups}

La forma más sencilla: **Admin → Ajustes → Datos → Descargar una
copia** (propietarios). Un único ZIP con la base de datos (una instantánea en caliente, coherente
aunque los invitados sigan enviando fotos), todas las fotos, logos y notas de voz sea cual sea
el driver de almacenamiento, y el secreto de sesión generado. **Restaurar**, en la misma página,
sustituye toda la instancia por una copia; también es la forma de pasar las fotos del
disco a un bucket S3 (haz una copia, define `STORAGE_DRIVER=s3`, reinicia, restaura).
Las restauraciones se envían como un único archivo: sube el límite de cuerpo de tu proxy inverso
(`client_max_body_size` en nginx) por encima del tamaño de la copia.

Para automatizarlo con un script, el mismo ZIP sale de `GET /api/admin/backup?download=1` con
la sesión de un propietario. O copia tú mismo la carpeta de datos; todo está en
`/data`:

```
/data
├── guestroll.db          # events, photo metadata, stats, accounts, settings
├── guestroll.db-wal      # SQLite write-ahead log, part of the database
├── .session-secret       # only if SESSION_SECRET isn't set
└── uploads/<event-id>/   # photos, logo, messages/ (empty with STORAGE_DRIVER=s3)
```

Para una copia coherente mientras la app funciona, copia la base de datos con el
backup en caliente de SQLite y después los archivos:

```bash
docker exec guestroll node -e "require('better-sqlite3')('/data/guestroll.db').backup('/data/backup.db').then(()=>console.log('ok'))"
tar czf guestroll-$(date +%F).tgz -C /var/lib/docker/volumes/guestroll-data/_data backup.db uploads
```

Copiar la carpeta con el contenedor parado funciona igual de bien.

## Actualizaciones {#upgrades}

Guestroll busca versiones nuevas en GitHub cada 12 horas. Cuando sale una, los
propietarios reciben un correo (y los webhooks suscritos a *Hay una versión nueva
disponible*), y **Admin → Ajustes → Sistema** muestra sus notas de versión.

### Desde el admin, en un clic {#from-the-admin-in-one-click}

Como en Matomo: **Actualizar a X.Y.Z** hace una copia de seguridad completa y luego sustituye el
contenedor en marcha por el mismo con la imagen nueva (se conservan volúmenes, puertos,
redes, variables y política de reinicio), espera a su comprobación de salud y
vuelve a poner el contenedor anterior si el nuevo no arranca sano.
Las migraciones de base de datos se ejecutan solas al arrancar; el historial de actualizaciones lista
las que aplicó cada actualización.

Necesita el pequeño contenedor **updater** junto a Guestroll, porque un
contenedor no puede sustituirse a sí mismo:

```bash
# .env
UPDATER_URL=http://updater:9900
UPDATER_TOKEN=$(openssl rand -hex 32)   # paste the value

docker compose --profile updater up -d
```

El updater tiene el socket de Docker, lo que da root en el host. No publica
ningún puerto, solo responde con el token, solo sustituye el contenedor de Guestroll
y solo descarga versiones nuevas de la propia imagen de ese contenedor. No lo actives
si prefieres no ejecutar nada con el socket: las actualizaciones seguirán siendo un
comando.

### Desde el servidor {#from-the-server}

```bash
docker compose pull && docker compose up -d
```

En ambos casos, lee primero la lista **Upgrading** de las notas de versión. Cada versión se
prueba arrancándola sobre los datos de la anterior (consulta
[Desarrollo](development.md#upgrades)).

## Comprobación de salud {#health-check}

`GET /api/health` devuelve `200 {"status":"ok"}` cuando la base de datos se puede leer,
y `503` en caso contrario. La imagen lo declara como su `HEALTHCHECK` de Docker.
