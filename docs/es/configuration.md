# Configuración {#configuration}

Guestroll se configura solo con variables de entorno. Todas las variables son
opcionales: una instancia vacía arranca con valores por defecto seguros. Tienes una plantilla completa en
[`.env.example`](../../.env.example).

Un valor no válido detiene el servidor al arrancar con un mensaje que nombra la variable,
en lugar de funcionar con un valor de reserva silencioso.

## Docker y red {#docker-and-network}

Las lee el contenedor o `docker-compose.yml`, no la propia app.

| Variable | Por defecto | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto en el que escucha el servidor dentro del contenedor (o en la máquina sin Docker). La comprobación de salud lo sigue. |
| `HOSTNAME` | `0.0.0.0` | Interfaz en la que escucha el servidor dentro del contenedor. |
| `HOST_PORT` | `3000` | Solo Compose: puerto publicado en el host. |
| `HOST_BIND` | `0.0.0.0` | Solo Compose: interfaz del host en la que publicar. `127.0.0.1` deja Guestroll accesible solo a través de un proxy inverso local. |
| `DATA_PATH` | `guestroll-data` | Solo Compose: volumen con nombre o ruta del host montada en `/data`. |
| `PUID` / `PGID` | `1001` | Usuario y grupo propietarios de la carpeta de datos y que ejecutan el servidor. Haz que coincidan con tu usuario del host en los bind mounts. |
| `TZ` | `UTC` | Zona horaria de las estadísticas (agrupación por hora y por día), p. ej. `Europe/Paris`. |
| `GUESTROLL_IMAGE` | `ghcr.io/achedon12/guestroll:latest` | Solo Compose: imagen a ejecutar. Fija una versión en producción. |
| `CONTAINER_NAME` | `guestroll` | Solo Compose: permite ejecutar varias instancias en paralelo. |

## Instancia {#instance}

| Variable | Por defecto | Descripción |
|---|---|---|
| `APP_NAME` | `Guestroll` | Se muestra en los títulos de página, la cabecera del admin y las tarjetas para redes sociales. |
| `PUBLIC_URL` | *(host de la petición)* | Origen público codificado en los códigos QR y las tarjetas para redes sociales, p. ej. `https://photos.example.com`. Defínelo: detrás de un proxy, el host de la petición puede ser un nombre interno. |
| `DATA_DIR` | `./data` (`/data` en Docker) | Dónde se guardan la base de datos SQLite y las fotos. |

## Idiomas {#languages}

Guestroll habla inglés (`en`), francés (`fr`), italiano (`it`) y español (`es`).
Cada visitante recibe, en este orden:

1. el idioma que eligió en el menú de idioma (guardado en su navegador);
2. el idioma del álbum, si los anfitriones definieron uno en los ajustes del evento;
3. el idioma de su navegador, si está disponible y `DETECT_BROWSER_LOCALE` está activado;
4. `DEFAULT_LOCALE`.

| Variable | Por defecto | Descripción |
|---|---|---|
| `DEFAULT_LOCALE` | `en` | Idioma usado cuando no se aplica nada más específico. |
| `DETECT_BROWSER_LOCALE` | `true` | `false` se salta el paso 3: quien no haya elegido recibe el idioma del álbum o `DEFAULT_LOCALE`. |

## Seguridad {#security}

| Variable | Por defecto | Descripción |
|---|---|---|
| `ADMIN_USERNAME` | `admin` | Nombre de usuario de la cuenta de propietario creada en el primer arranque. |
| `ADMIN_PASSWORD` | *(generada)* | Contraseña de esa cuenta de propietario. Si está definida, se impone en cada arranque (y la cuenta sigue siendo propietaria): es la forma de volver a entrar si se pierden todas las demás contraseñas. Si está vacía, se genera una contraseña en el primer arranque y se muestra una sola vez en los logs; cámbiala en **Admin → Ajustes**. Las demás cuentas se crean desde el admin. |
| `SESSION_SECRET` | *(generado)* | Clave que firma y cifra las cookies, 32 caracteres o más. Si está vacía, se genera una y se guarda en `DATA_DIR/.session-secret`. Cambiarla cierra la sesión de todo el mundo. |
| `TRUST_PROXY` | `false` | Lee la IP del cliente de `X-Forwarded-For` y el host de `X-Forwarded-Host`. Actívalo **solo** detrás de un proxy inverso que controles, o los límites de peticiones se podrán esquivar con una cabecera falsificada. |
| `SECURE_COOKIES` | `true` en producción | Las cookies solo viajan por HTTPS. Ponlo en `false` solo para probar por HTTP sin cifrar en una red local. |
| `WEBHOOK_ALLOW_PRIVATE` | `false` | Permite que los webhooks lleguen a direcciones privadas, de loopback y link-local (un ntfy o un Home Assistant autoalojados en tu red). Desactivado, un webhook a una de esas direcciones falla con un mensaje que lo indica: el webhook de un propietario no puede sondear la red del propio servidor ni los metadatos de la nube. |

## Envíos {#uploads}

| Variable | Por defecto | Descripción |
|---|---|---|
| `MAX_UPLOAD_MB` | `25` | Foto más pesada aceptada. Los móviles redimensionan antes de enviar, así que la mayoría de los envíos pesan de 1 a 4 MB. Sube el límite de cuerpo de tu proxy inverso por encima de este valor. |
| `MAX_IMAGE_MEGAPIXELS` | `80` | Las imágenes por encima de este valor se rechazan antes de descodificarlas, lo que protege la memoria de las «bombas de descompresión». |
| `DEFAULT_CAPTURE_MODE` | `camera` | Modo de captura preseleccionado para los eventos nuevos: `camera`, `picker` o `both`. |

## Límites de peticiones {#rate-limits}

Por minuto. Los límites de envío se aplican por invitado, los de inicio de sesión por IP de cliente.

| Variable | Por defecto | Descripción |
|---|---|---|
| `RATE_LIMIT_UPLOADS_PER_MINUTE` | `30` | Fotos que un invitado puede enviar por minuto. |
| `RATE_LIMIT_LOGIN_PER_MINUTE` | `5` | Intentos de inicio de sesión en el admin por IP. |
| `RATE_LIMIT_UNLOCK_PER_MINUTE` | `10` | Intentos de código de acceso por invitado; el triple de este valor es el máximo de códigos incorrectos en un evento, sumando todos los invitados. |

## Almacenamiento {#storage}

Las fotos, los logos y los mensajes de voz van por defecto a una carpeta dentro de `DATA_DIR`.
Define `STORAGE_DRIVER=s3` para guardarlos en cualquier bucket compatible con S3 (AWS
S3, Backblaze B2, Cloudflare R2, Wasabi, Garage, RustFS, SeaweedFS…). La
base de datos SQLite siempre se queda en `DATA_DIR`, así que conserva el volumen en ambos casos.

| Variable | Por defecto | Descripción |
|---|---|---|
| `STORAGE_DRIVER` | `local` | `local` o `s3`. |
| `S3_ENDPOINT` | *(ninguno)* | p. ej. `https://s3.eu-west-3.amazonaws.com`, `https://<account>.r2.cloudflarestorage.com`, `http://garage:3900`. |
| `S3_REGION` | `us-east-1` | Región usada para firmar las peticiones. La mayoría de los servidores autoalojados aceptan el valor por defecto. |
| `S3_BUCKET` | *(ninguno)* | El bucket debe existir. Mantenlo **privado**: Guestroll sirve él mismo cada archivo, después de comprobar el acceso. |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | *(ninguno)* | Credenciales con permiso para leer, escribir, listar y eliminar en el bucket. |
| `S3_PREFIX` | *(ninguno)* | Carpeta dentro del bucket, para compartir un bucket entre instancias. |
| `S3_FORCE_PATH_STYLE` | `true` | `true` envía `endpoint/bucket/key`; `false` envía `bucket.endpoint/key` (estilo virtual-hosted de AWS). |

Al arrancar, Guestroll escribe, vuelve a leer y elimina un pequeño archivo de prueba, y
registra `[storage] S3 bucket NOT usable` con el motivo si eso falla. Los archivos
nunca se sirven directamente desde el bucket, así que las fotos siguen siendo privadas incluso con un
bucket en un endpoint público. Para pasar las fotos existentes a un bucket, haz una copia
(Admin → Ajustes → Datos), cambia el driver y restáurala.

## Copias programadas {#scheduled-backups}

Los propietarios las configuran en **Admin → Ajustes → Datos**; estas variables
las definen desde el entorno (el admin las muestra entonces en solo lectura).
Cada copia es el mismo ZIP que una manual: base de datos, todas las fotos, logos y
notas de voz, y el secreto de sesión generado.

| Variable | Por defecto | Descripción |
|---|---|---|
| `BACKUP_CRON` | *(ninguno)* | Activa las copias programadas, p. ej. `0 3 * * *` (cada noche a las 3:00, en `TZ`). Cinco campos. |
| `BACKUP_KEEP` | `7` | Cuántas copias conservar; las más antiguas se eliminan tras cada copia nueva. |
| `BACKUP_DIR` | `DATA_DIR/backups` | Dónde se guardan. Monta otro disco aquí: una copia en el mismo disco que las fotos no sobrevive a ese disco. |
| `BACKUP_S3_ENDPOINT`, `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY`, `BACKUP_S3_REGION`, `BACKUP_S3_PREFIX`, `BACKUP_S3_FORCE_PATH_STYLE` | *(ninguno)* | Envíalas a un bucket compatible con S3 en lugar de a una carpeta (con `BACKUP_S3_BUCKET` definido). Usa un bucket distinto al de las fotos. Los archivos grandes se suben en partes de 16 MB. |

Una copia fallida envía un correo a los propietarios y a la dirección de la instancia, y avisa a los
webhooks suscritos a *Ha fallado una copia programada*.

## Demo {#demo}

| Variable | Por defecto | Descripción |
|---|---|---|
| `DEMO_MODE` | `false` | Una demo pública: contenido de ejemplo, la cuenta `demo`, restablecimiento cada noche, nada se envía al exterior. Consulta [Despliegue](deployment.md#a-public-demo). |
| `DEMO_RESET_CRON` | `0 4 * * *` | Cuándo vuelve la demo a sus datos de ejemplo, en `TZ`. |

## Actualizaciones {#updates}

| Variable | Por defecto | Descripción |
|---|---|---|
| `UPDATE_CHECK` | `true` | Consulta a GitHub cada 12 horas la última versión y avisa a los propietarios de las nuevas. `false` no hace ninguna llamada saliente. |
| `UPDATER_URL` | *(ninguno)* | Dónde responde el contenedor updater, `http://updater:9900` con el archivo compose incluido. Activa las actualizaciones en un clic. |
| `UPDATER_TOKEN` | *(ninguno)* | Un secreto aleatorio largo compartido por la app y el updater (24 caracteres o más). |

El propio updater lee `UPDATER_TOKEN`, `UPDATER_CONTAINER` (el contenedor que
sustituye, `guestroll` por defecto) y `UPDATER_PORT` (`9900`). Consulta
[Despliegue](deployment.md#upgrades).

## Correo {#email}

Opcional. Sin SMTP, todo lo demás funciona y nunca se envía ningún correo.
El SMTP también se puede configurar en **Admin → Ajustes → Notificaciones**, donde la contraseña se
guarda cifrada (AES-256-GCM, clave derivada de `SESSION_SECRET`). Cuando
`SMTP_HOST` está definido, el entorno se impone y el formulario del admin queda en solo lectura.

| Variable | Por defecto | Descripción |
|---|---|---|
| `SMTP_HOST` | *(ninguno)* | Servidor SMTP, p. ej. `smtp.fastmail.com`. Definirlo activa el correo. |
| `SMTP_PORT` | `587` | `587` (STARTTLS) o `465` (TLS). |
| `SMTP_SECURE` | `false` | `true` para TLS implícito en el puerto 465. |
| `SMTP_USER` / `SMTP_PASSWORD` | *(ninguno)* | Credenciales, cuando el servidor las pide. |
| `SMTP_FROM` | `SMTP_USER` | Remitente, p. ej. `Guestroll <photos@example.com>`. |
| `SMTP_ALLOW_PLAIN` | `false` | Con un usuario definido, el inicio de sesión solo se envía una vez cifrada la conexión (TLS implícito o STARTTLS), así nadie en el camino puede quitar STARTTLS y leerlo. `true` para un relay sin TLS en la misma máquina o en una red de confianza. |
| `ADMIN_EMAIL` | *(ninguno)* | Adónde van las alertas y los resúmenes de eventos. Se puede definir en el admin si está vacío. |
| `SCHEDULER_INTERVAL_SECONDS` | `60` | Cada cuánto el proceso en segundo plano envía el correo en cola, cierra los eventos programados y comprueba las alertas. `0` lo desactiva. |

Los correos esperan en una cola en la base de datos y se reintentan tras 1, 5, 15 minutos,
1 y 6 horas; luego se marcan como fallidos (Admin → Ajustes los muestra, con un botón
para reintentar). Define `PUBLIC_URL`: los enlaces de los correos se construyen a partir de ella, ya que una
tarea en segundo plano no tiene ninguna petición de la que leer el host.
