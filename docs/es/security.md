# Seguridad {#security}

Guestroll guarda fotos de otras personas, a menudo de niños, en eventos privados.
Esta página enumera qué protege, frente a quién y cómo. Si encuentras un fallo,
avísanos en privado (consulta [SECURITY.md](../../SECURITY.md)).

## Qué se protege {#what-is-protected}

| Recurso | Quién puede acceder |
|---|---|
| Las fotos de un invitado | Ese invitado (desde el navegador con el que las hizo) y los administradores |
| Las fotos de los demás | Solo los administradores. Nunca otro invitado. |
| Ajustes, estadísticas y códigos QR del evento | Solo los administradores |
| La propia página del evento | Cualquiera con el código QR, más el código de acceso si hay uno |

No hay galería pública ni descarga por parte de los invitados de las fotos de los demás,
sean cuales sean los ajustes: es una decisión de diseño, no una opción.

## Cómo siguen privadas las fotos {#how-photos-stay-private}

- **Ningún archivo público.** Las fotos se guardan fuera de la raíz web
  (`DATA_DIR/uploads`) y solo salen del servidor por `/api/media/<id>`,
  que comprueba el acceso en **cada** petición. Una URL copiada no sirve de nada en otro
  navegador: las respuestas son idénticas (`404`) para «no existe» y «no es tuya».
- **Unirse es una cookie, no un enlace.** Abrir la página de un evento escribe el evento
  en una cookie de invitado cifrada. Las peticiones de medios la exigen, así que una URL de foto
  pegada en un chat no se abre en ningún otro sitio.
- **Identificadores imposibles de adivinar.** Los ids de las fotos son UUID aleatorios, los slugs de los eventos llevan
  ~40 bits de aleatoriedad. Los slugs no son la barrera de seguridad (lo es la cookie),
  pero impiden enumerar los eventos.
- **Caché privada.** Las respuestas de medios son `Cache-Control: private`, los originales
  `no-store`, así que ningún proxy compartido ni CDN guarda una copia.
- **Enlaces renovables.** «Generar un enlace nuevo» cambia el slug: el código QR anterior
  deja de funcionar al instante, por ejemplo si se filtró en redes sociales.
- **Código de acceso opcional** por evento, con hash bcrypt.
- **Los invitados pueden recuperar sus fotos**, en cualquier momento, incluso después del evento:
  eliminar una borra sus archivos, del álbum, de los enlaces a la galería y del
  muro. Solo puede hacerlo el navegador que la envió (misma cookie de invitado).

## Enlaces a la galería {#gallery-links}

- Un enlace es un token aleatorio de 32 caracteres **más** una contraseña (bcrypt). El
  token por sí solo muestra un formulario de contraseña, nada más; los enlaces desconocidos, caducados y revocados
  responden todos `404`.
- Desbloquear escribe el enlace en una cookie cifrada aparte (`gr_share`).
  El acceso se vuelve a comprobar en cada petición, así que revocar un enlace o dejar que caduque lo corta
  al instante, incluso para los navegadores que ya lo habían abierto.
- Los enlaces solo ven las fotos visibles, o las favoritas visibles en un
  enlace de solo favoritas. Los originales y el ZIP necesitan el interruptor de *descargas*
  del enlace, y el ZIP de un enlace contiene lo que ese enlace muestra. Un enlace nunca permite
  enviar fotos. Qué fotos son favoritas nunca se envía a los invitados ni a los enlaces.
- Contraseñas incorrectas: 10 intentos por minuto por IP y enlace, y un máximo por enlace
  sumando todas las IP.
- Las contraseñas generadas (`xxxx-xxxx-xxxx-xxxx`, ~82 bits) se muestran una sola vez y
  nunca se guardan en claro.

## Actualizaciones {#updates}

- La comprobación de actualizaciones es un `GET` anónimo a la API de GitHub cada 12 horas
  (`UPDATE_CHECK=false` la desactiva). No se envía nada sobre la instancia.
- El updater opcional tiene el socket de Docker, que es root en el host. No
  publica ningún puerto, exige un token de 24 caracteres o más comparado en tiempo constante,
  solo acepta una versión `x.y.z`, solo sustituye `UPDATER_CONTAINER`, y
  solo descarga el repositorio de la propia imagen de ese contenedor en la versión pedida.
  La app solo le pide la versión que anunció GitHub, después de una copia de seguridad.
- Una versión nueva que no supera su comprobación de salud se sustituye automáticamente por el
  contenedor anterior.

## Copias de seguridad {#backups}

- Solo los propietarios descargan o restauran copias. Una copia lo contiene todo,
  incluidos los hashes de las contraseñas y el secreto de sesión generado: guárdala como
  el propio servidor.
- Una restauración comprueba el archivo completo antes de cambiar nada: el manifiesto,
  un archivo SQLite real, y nombres de archivo con las formas que escribe la app (las rutas
  que suben con `../` se rechazan). Un archivo que no supera estas comprobaciones
  deja la instancia intacta.

## Webhooks {#webhooks}

- Solo los propietarios los gestionan. Las URL y los secretos de firma se guardan cifrados
  (la URL de un webhook de Discord o Slack es una credencial) y nunca se devuelven al
  navegador, que solo ve una pista enmascarada.
- Las peticiones son `POST` simples con un tiempo límite de 10 segundos y sin seguir
  redirecciones. Solo van a direcciones públicas: una URL cuyo host es o se resuelve
  a una dirección privada, de loopback o link-local (el propio servidor, la red
  local, los metadatos de la nube, el updater) falla con un mensaje que lo indica,
  se escriba como se escriba la dirección (IPv4 dentro de IPv6 incluido). La comprobación
  la hace la propia resolución DNS de la conexión, sobre la dirección a la que luego se conecta,
  así que un nombre no puede responder otra cosa entre medias. Para llegar a un Home Assistant o
  ntfy en tu propia red, define `WEBHOOK_ALLOW_PRIVATE=true`.
- Los avisos llevan nombres de eventos, recuentos y enlaces al admin, nunca fotos, correos
  de invitados ni audio de mensajes.

## Libro de visitas {#guestbook}

- Los mensajes son privados como las fotos: un invitado solo lee y escucha los suyos,
  los administradores del evento todos, los enlaces a la galería los aprobados y solo si
  los anfitriones comparten el libro de visitas. Las notas de voz salen del servidor por
  `/api/messages/<id>/audio`, comprobado en cada petición.
- Las notas de voz se identifican por sus bytes (Ogg/Opus, WebM, MP4/AAC, MP3)
  y se guardan tal como se grabaron: recodificarlas exigiría ffmpeg en la imagen. Solo
  se sirven con un tipo de audio, `no-store`, bajo una CSP de aislamiento. Las grabaciones
  del navegador no llevan ubicación.
- 3 MB por nota, 500 caracteres por texto, 20 mensajes por invitado y evento,
  10 por minuto (consulta *Abuso* para los límites que se mantienen sin cookie). El micrófono solo se pide cuando un invitado toca *Grabar*.

## Correo {#email}

- Las direcciones de los invitados son **voluntarias**: solo se piden en los eventos cuyos anfitriones las
  solicitaron, se usan solo para el álbum de ese evento y se eliminan con el evento. Un invitado
  puede quitar la suya desde la página.
- La contraseña SMTP definida en el admin se guarda cifrada y nunca se devuelve
  al navegador. Solo se conserva para el servidor y la cuenta con los que se escribió:
  cambiar cualquiera de los dos la vuelve a pedir, para que otro propietario no pueda redirigirla a un
  servidor suyo.
- Con un usuario definido, el inicio de sesión solo pasa por una conexión cifrada (TLS
  implícito, o STARTTLS obligatorio), así que no se puede leer quitando STARTTLS
  por el camino. `SMTP_ALLOW_PLAIN=true` para un relay sin TLS en una red
  de confianza.
- Cada valor de un correo se escapa en HTML; cada correo tiene un gemelo en texto plano.
- Elegir no incluir la contraseña en los correos a los invitados hace que un correo reenviado
  no abra el álbum.

## Envíos {#uploads}

- Los archivos se identifican por sus bytes, nunca por su nombre ni por `Content-Type`; solo
  se aceptan JPEG, PNG, WebP, HEIC/HEIF, AVIF y GIF.
- Cada imagen se **recodifica**: se eliminan los metadatos EXIF (posición GPS, números de serie
  del dispositivo), y se descarta todo lo que vaya añadido tras los datos de la imagen.
- El tamaño se limita mientras llega el cuerpo, así que las peticiones fragmentadas sin
  `Content-Length` no pueden agotar la memoria. Las imágenes por encima de `MAX_IMAGE_MEGAPIXELS`
  se rechazan antes de descodificarse, HEIC incluido: su tamaño se lee de la
  cabecera del archivo antes de que el descodificador reserve nada.
- Un envío a la vez por invitado, así que las peticiones en paralelo de un mismo invitado no pueden
  saltarse la cuota por invitado. Eso sí, un invitado es una cookie: un script que la
  descarta es un invitado nuevo cada vez. Lo que se mantiene entonces son los límites por evento y por
  dirección de abajo; un presupuesto de memoria para los envíos en curso, contado en bytes
  según llegan (una conexión que envía con cuentagotas no cuesta casi nada,
  una ráfaga de envíos rápidos recibe la orden de reintentar); como mucho 3 imágenes descodificadas a la vez
  con 12 en espera; y un rechazo cuando al disco le quedan menos de 512 MB libres.
  Los móviles de los invitados reintentan solos cuando el servidor está ocupado.

## Autenticación {#authentication}

- La primera cuenta de propietario (`admin`, o `ADMIN_USERNAME`) recibe su contraseña
  de `ADMIN_PASSWORD`, o una generada en el primer arranque y mostrada una sola vez.
  No hay página de registro pública a la que un desconocido pueda llegar primero: las demás
  cuentas las crea un propietario, con una contraseña generada que se muestra una sola vez.
- Los **propietarios** gestionan todos los eventos, las cuentas, el correo y los ajustes de la instancia.
  Los **organizadores** solo acceden a los eventos que tienen asignados, y no pueden eliminarlos.
  Un evento fuera del alcance de un organizador responde `404`, exactamente como uno
  inexistente, tanto en la API del admin como en `/api/media`. La instancia siempre conserva
  al menos un propietario.
- La **verificación en dos pasos** (TOTP, RFC 6238) se puede activar por cuenta
  desde Ajustes: después de la contraseña, un código de una app de autenticación. El
  secreto se guarda cifrado, un código no se puede usar dos veces, los códigos se limitan a
  5 intentos por minuto y cuenta, y el estado de sesión a medio iniciar caduca a los 5
  minutos. Diez códigos de recuperación de un solo uso (guardados con hash) cubren la pérdida del móvil;
  un propietario también puede restablecer la verificación de otra cuenta. Desactivarla
  exige la contraseña y un código.
- Un nombre de usuario incorrecto tarda lo mismo en rechazarse que una contraseña incorrecta (se hace
  una comparación bcrypt en ambos casos), así que los nombres de usuario no se pueden sondear por tiempos.
- Las sesiones son cookies cifradas, `HttpOnly`, `SameSite=Lax`, `Secure` en producción
  (iron-session), que llevan la cuenta y su versión de sesión.
  Cambiar o restablecer una contraseña cierra la sesión de esa cuenta en todas partes;
  eliminar una cuenta termina sus sesiones al instante.
- Cada página y ruta de API del admin comprueba la sesión por sí misma, y cada ruta
  bajo un id de evento comprueba que el evento esté en el alcance del administrador.
  `tests/unit/routeGuards.test.ts` falla si se añade una sin esa comprobación.

## Abuso {#abuse}

| Límite | Por defecto |
|---|---|
| Inicio de sesión en el admin | 5 contraseñas incorrectas por minuto por dirección y nombre de usuario, 30 contraseñas incorrectas por minuto por dirección, 30 intentos por minuto por dirección (detrás de `TRUST_PROXY`) |
| Código de acceso | 10 intentos por minuto por invitado, 30 códigos incorrectos por minuto por evento, intentos en curso incluidos |
| Envíos | 30 por minuto por invitado, 300 por evento, 120 por dirección (detrás de `TRUST_PROXY`), más la cuota por invitado |
| Libro de visitas | 10 mensajes por minuto por invitado, 60 por evento, 30 por dirección (detrás de `TRUST_PROXY`) |
| Contraseña de enlace a la galería | 10 intentos por minuto por IP y enlace |
| Correo de prueba | 5 por minuto |

Los códigos y contraseñas incorrectos se cuentan antes de comprobarse, y se devuelven
cuando resultan correctos: una ráfaga de intentos en paralelo cuenta entera. Un inicio
de sesión correcto solo borra los límites de la cuenta que ha iniciado sesión. No hay
máximo por nombre de usuario entre direcciones: cualquiera podría entonces bloquear una cuenta conocida
desde cualquier lugar.

Sin `TRUST_PROXY`, todos los clientes parecen la misma dirección para la app, así que
los límites por dirección los comparte todo el mundo; detrás de un proxy inverso, actívalo.

El máximo de códigos incorrectos por evento es un compromiso deliberado: alguien que inunde
de códigos incorrectos puede hacer esperar a los invitados reales hasta un minuto, pero no puede adivinar por fuerza bruta un
código de 6 caracteres o más (obligatorio) en un tiempo útil.

## Peticiones entre sitios {#cross-site-requests}

Cada petición que cambia el estado (admin e invitados) debe llevar una cabecera `Origin`
que coincida, además de cookies `SameSite`. La app define `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, una `Referrer-Policy` estricta y una
`Permissions-Policy` que solo permite la cámara y el micrófono a la propia app.
Cuando `PUBLIC_URL` es `https://`, las páginas también envían
`Strict-Transport-Security` (un año, sin subdominios).

Cada página lleva una **Content-Security-Policy** con un nonce nuevo
(`src/proxy.ts`): solo se ejecutan los scripts que Next.js marcó con él, así que el marcado inyectado
no puede ejecutar nada, y la página solo puede comunicarse con su propio origen. Los estilos
siguen en `unsafe-inline` (React escribe atributos `style`; un estilo no puede ejecutar código).
Las imágenes, notas de voz y archivos SVG servidos llevan su propia política de aislamiento. La
app no carga nada de terceros: ni CDN, ni fuentes ni analítica de otros sitios.

## Lo que te toca a ti {#your-part}

- Sírvelo por **HTTPS**. Los móviles lo necesitan para la cámara, y las cookies son
  `Secure` en producción.
- Define `TRUST_PROXY=true` detrás de tu proxy inverso, y **solo** entonces.
- Deja que el proxy almacene en búfer el cuerpo de las peticiones antes de reenviarlo (nginx lo hace por
  defecto, `proxy_request_buffering on`): un cliente que envía la mayor parte de un
  archivo y luego se queda parado bloquea entonces el proxy, no la memoria de Guestroll. La
  app corta esos envíos a los 2 minutos por su cuenta, pero un cliente que se reconecta
  una y otra vez podría mantener ocupado su presupuesto de envío.
- Haz copias de `DATA_DIR` y mantenlo privado: contiene todas las fotos y el secreto
  de sesión.
- Fija una versión de la imagen y sigue las versiones para las correcciones de seguridad.
