# Guía de administración {#admin-guide}

Inicia sesión en `/admin` con tu cuenta: `admin` y la contraseña de
`ADMIN_PASSWORD` en una instalación nueva, o la que te dio un propietario. El admin
funciona en un móvil, pero es más cómodo en un portátil.

## Panel {#dashboard}

Totales de todos los eventos: fotos, invitados que enviaron al menos una foto,
visitas, descargas, almacenamiento usado y fotos pendientes de aprobación. Debajo: envíos
por día en los últimos 30 días, los cinco fotógrafos más activos y los
últimos eventos.

## Eventos {#events}

**Nuevo evento** solo pide un nombre; todos los demás ajustes tienen un
valor por defecto que puedes cambiar después. Cada evento tiene sus pestañas: Fotos, Libro de visitas
(cuando lo activas), Estadísticas, QR y compartir y Ajustes.

### Fotos {#photos}

La hoja de contactos con todo lo que enviaron los invitados, de lo más reciente a lo más antiguo.

- Filtra por **Todas**, **Pendientes**, **Visibles**, **Ocultas** o **Favoritas**, y
  por reto cuando el evento los tiene.
- Toca las fotos para seleccionarlas y luego **Aprobar**, **Ocultar**, **Favorita**,
  **Quitar de favoritas** o **Eliminar** desde la barra inferior. Las fotos ocultas desaparecen también para el invitado que las hizo,
  y salen del muro en directo; las fotos eliminadas se borran del disco.
- **Descargar ZIP** descarga todas las fotos visibles a resolución completa, con nombres como
  `0001-camille-1a2b3c4d.jpg` para que se ordenen según se hicieron.
  El archivo se transmite al momento, así que incluso un álbum de varios gigas empieza a descargarse
  enseguida.
- **Importar fotos** añade archivos desde tu ordenador, normalmente los del
  fotógrafo: se envían de uno en uno a calidad completa (sin compresión en el
  navegador), se publican al momento, fuera de las cuotas y horarios de cierre de los invitados, y
  se atribuyen al nombre que indiques.
- Las **Favoritas** son tu selección, marcadas con una estrella. Con el filtro Favoritas,
  **Descargar las favoritas** descarga un ZIP con «lo mejor», y un enlace a la galería puede mostrar
  solo las favoritas. Los invitados nunca ven qué fotos elegiste.

### Libro de visitas {#guestbook}

Actívalo en **Ajustes → Libro de visitas**: los invitados encuentran entonces una tarjeta bajo sus
fotos para dejar unas palabras, una nota de voz de hasta 2 minutos grabada en el
navegador, o ambas cosas. Los mensajes siguen la moderación del evento, como las fotos; cada
invitado solo ve y puede eliminar los suyos.

La pestaña **Libro de visitas** los muestra con un reproductor para cada nota de voz. Selecciona para
aprobar, ocultar o eliminar; **Descargar el libro de visitas** descarga un ZIP con
`guestbook.txt` (todos los mensajes, del más antiguo al más reciente) y las notas de voz, numeradas para
que coincidan. *Mostrar los mensajes en los enlaces de galería* añade los aprobados bajo
las fotos de cada enlace a la galería del evento (desactivado por defecto: iban
dirigidos a ti). El resumen de fin de evento los cuenta.

### Estadísticas {#stats}

Envíos por hora durante el evento (una fiesta dura una noche, así que la hora es la
unidad útil), visitas, descargas, códigos de acceso incorrectos, fotógrafos más activos
y fotos por reto.

### QR y compartir {#qr-sharing}

- **Enlace para invitados**: la dirección que hay detrás del código QR, para pegarla en un mensaje.
- **Diseño del código QR**: ajustes predefinidos, colores, formas de puntos y esquinas, margen, un logo en
  el centro y un pie de texto. La vista previa es exactamente el archivo que descargas, en PNG
  (de 512 a 4096 px) o SVG. Acuérdate de **Guardar** antes de descargar.
- **Cartel para imprimir**: una tarjeta A4 con el nombre del evento, la fecha y el código QR.
- **Vídeo de diapositivas**: un MP4 de las fotos visibles (o las favoritas) en el
  orden en que se hicieron, con una tarjeta de título, zooms lentos y fundidos encadenados, en 16:9 o
  9:16 para stories, de 2 a 8 segundos por foto, hasta 300 fotos, y tu propia
  música si añades un archivo (cortada y con fundido al final). Se genera en tu
  navegador (WebCodecs, cualquier Chrome, Edge, Safari o Firefox reciente), así que el servidor
  no necesita codificador de vídeo: deja la pestaña abierta mientras avanza la barra de progreso.
  Las fotos con una forma muy distinta a la del vídeo se muestran enteras sobre un fondo desenfocado
  en lugar de recortarse.
- **Muro en directo**: una presentación a pantalla completa para un proyector o una tele. Las fotos nuevas
  se saltan la cola y aparecen en menos de cinco segundos; entre medias, va rotando por las
  más recientes. Solo se muestran las fotos visibles, así que con *Aprobar cada foto antes de mostrarla*
  nada llega a la pantalla hasta que la apruebas. Sus ajustes:

  | Ajuste | Qué hace |
  |---|---|
  | Disposición | **Una copia** a la vez, un **mosaico** (la más reciente en grande, cuatro alrededor) o una **cuadrícula** de quince |
  | Segundos por paso | De 3 a 30 |
  | Mostrar quién hizo cada foto / el reto | Pies de texto bajo cada foto |
  | Mostrar el código QR en una esquina | Para que la sala siga uniéndose |
  | Solo las favoritas | Solo las fotos que marcaste con estrella |
  | Mostrar los mensajes del libro de visitas | Mensajes de texto aprobados: entre fotos en *Una copia*, en la parte inferior en los demás casos |

  Un muro abierto recoge los cambios de ajustes en menos de 20 segundos, sin recargar.
- **Generar un enlace nuevo**: cambia la dirección. El código QR anterior deja de funcionar
  al instante, para todos. Úsalo si el código se ha filtrado.

### Ajustes {#settings}

| Sección | Ajuste | Qué hace |
|---|---|---|
| Evento | Nombre, mensaje de bienvenida, fecha, color principal | Lo que ven los invitados en la parte superior de su página. El color tiñe la cámara y los botones; el texto que va encima se ajusta solo. |
| Acceso | Código de acceso | Opcional, 6 caracteres o más. Los invitados lo escriben una sola vez. Déjalo vacío para que el código QR baste para entrar. |
| Envíos | Aceptar envíos | Desactiva los envíos cuando quieras; los invitados conservan sus propias fotos. |
| | Cerrar los envíos automáticamente el | Por ejemplo, la mañana siguiente. |
| | Modo de captura | Solo cámara (por defecto), solo galería, o cámara y galería. |
| | Fotos por invitado | 0 para no poner límite. Los invitados ven un contador de las fotos que les quedan. |
| | Moderación | Publicar al momento y ocultar después, o aprobar cada foto antes. |
| Invitados | Idioma del álbum | Automático (el móvil de cada invitado) o un idioma fijo. Los invitados pueden cambiarlo igualmente. |
| | Pedir el nombre a los invitados | Se muestra junto a sus fotos en el admin y en el muro en directo. |
| Aspecto | Marco | **Foto instantánea** (borde blanco, nombre del evento y fecha debajo, logo), **Color del evento** (un borde del color principal con el nombre) o **Sello con logo** en una esquina. Se dibuja en el móvil antes de enviar. |
| | Dejar que los invitados elijan un filtro | Blanco y negro, cálido, vintage o vivo, elegido encima del obturador. Los marcos y filtros forman parte de la foto enviada: el original no se conserva. Los móviles que no pueden descodificar un formato en el navegador (algo raro) la envían sin efectos. |
| Retos | Lista de ideas | Hasta 30 ideas de fotos («La pista de baile», «Los novios con un desconocido»). Los invitados eligen una encima del obturador y ven cuáles ya han hecho. Cambiar el nombre de un reto conserva sus fotos; quitarlo también, sin etiqueta en el filtro. |

| Después del evento | Permitir que los invitados dejen su correo para recibir el álbum | Añade una tarjeta en la página del invitado. Voluntario; las direcciones se eliminan con el evento. |
| | Enviarme un resumen al cerrar los envíos | Fotos, fotógrafos, visitas, lo que sigue pendiente. |
| | Enviar a los invitados un enlace a la galería al cerrar los envíos | Un único enlace protegido con contraseña para el evento, enviado una vez a cada dirección. |
| | Validez del enlace (días) | 0 para un enlace que no caduca nunca. |
| | Los invitados pueden descargar las fotos desde el enlace | Desactivado: el enlace muestra las fotos, pero no los originales ni el ZIP. |
| | Enviar solo las favoritas | El enlace muestra las fotos que marcaste con estrella en lugar de todo el álbum. Márcalas antes de que termine el evento. |
| | Incluir la contraseña en el correo | Desactivado: los invitados solo reciben el enlace, y la contraseña te llega a ti (correo de resumen y tarjeta *Terminar el evento*) para que se la pases tú. Así, reenviar el correo no basta. |

### Enlaces a la galería {#gallery-links}

En **QR y compartir**, *Enlaces a la galería* crea enlaces privados a las fotos
visibles del evento: para la familia que no pudo ir, o para los invitados después.
Cada enlace tiene su propia contraseña (la tuya, o una generada que se muestra **una sola vez**), una
caducidad opcional, un interruptor de descargas, todo el álbum o solo las favoritas,
y un contador de visitas. **Revocar** lo corta
al instante, incluso para quien ya lo había abierto. Un enlace a la galería nunca permite
enviar fotos, y nunca muestra fotos pendientes ni ocultas.

### Terminar el evento {#end-the-event}

Los envíos se cierran solos a la hora de cierre prevista; los correos de fin de evento
salen en menos de un minuto. **Terminar el evento ahora** lo hace al instante. Solo se ejecuta
una vez por evento: terminarlo de nuevo no hace nada.

**Duplicar este evento** (propietarios): un evento nuevo con los mismos ajustes,
colores, diseño del código QR, logo, retos y organizadores, listo para el año que viene.
No se copian fotos, mensajes ni enlaces, y tiene su propio código QR: el anterior
sigue apuntando al evento antiguo.

**Zona peligrosa**: eliminar un evento borra todas sus fotos del disco. Escribe el
nombre del evento para confirmar.

## Ajustes {#settings-1}

Los ajustes se dividen en cinco áreas, listadas a la izquierda (una fila de pestañas en un
móvil). Un área que necesita tu atención lo indica en la lista: verificación en dos pasos
desactivada, sin copias automáticas, sin servidor de correo, una actualización pendiente.
Los organizadores solo ven **Tu cuenta**.

### Tu cuenta {#your-account}

- **Perfil**: nombre visible y la dirección a la que llegan los resúmenes
  y alertas de *tus* eventos.
- **Contraseña**: cambiarla cierra tus otras sesiones. No disponible para
  la cuenta definida por `ADMIN_PASSWORD`: cambia la variable y reinicia.
- **Verificación en dos pasos**: escanea el código QR con una app de autenticación,
  escribe el código y guarda los diez códigos de recuperación que se muestran una sola vez. Cada inicio de sesión
  pide entonces un código después de la contraseña. ¿Perdiste el móvil? Inicia sesión con un
  código de recuperación, o pide a un propietario que la restablezca desde **Equipo**.
- **Idioma y tema** para tu propio navegador.

### Equipo (propietarios) {#team-owners}

Añade personas y elige su rol.

| Rol | Puede |
|---|---|
| Propietario | Todo: cualquier evento, crear y eliminar eventos, cuentas, correo, alertas |
| Organizador | Solo los eventos que tiene asignados: fotos y moderación, ajustes, código QR, enlaces a la galería, muro en directo, terminar el evento. No eliminarlo. |

Una cuenta nueva recibe una contraseña generada, que se muestra una sola vez para que se la pases.
*Nueva contraseña* genera otra y cierra la sesión de esa persona; *Eliminar*
le quita el acceso al instante. El último propietario no se puede degradar ni eliminar.

### Notificaciones (propietarios) {#notifications-owners}

- **Correo**: servidor SMTP (o solo lectura si lo define `SMTP_HOST`), adónde van
  las alertas, y un botón **Enviar un correo de prueba** que muestra la respuesta del servidor.
- **Alertas**, cada una activable: fotos pendientes de aprobación (como mucho cada 30
  minutos, solo cuando el número crece), el resumen de fin de un evento, 10 o más contraseñas de admin
  incorrectas en 15 minutos (como mucho cada hora), disco al 90 % (como mucho una vez al día).
- **Correos recientes** con su estado. Los fallidos se pueden reintentar.
- **Webhooks**: las mismas alertas en tu móvil o en un chat, sea cual sea
  la configuración del correo. Hasta 10, cada uno con su propia selección de alertas (evento
  terminado, fotos pendientes, nuevo mensaje en el libro de visitas, inicios de sesión fallidos, almacenamiento).

  | Servicio | URL | Qué llega |
  |---|---|---|
  | ntfy | un tema en ntfy.sh o en tu propio servidor | Una notificación push que abre la página del admin |
  | Discord | ajustes del canal → Integraciones → Webhooks | Un embed (menciones desactivadas) |
  | Slack | un Incoming Webhook | Un mensaje con un enlace |
  | JSON | cualquier cosa: Home Assistant, n8n, tu script | `{ app, kind, title, message, url, event, data, sentAt }`, firmado con `X-Guestroll-Signature: sha256=<HMAC of the body>` cuando defines un secreto |

  **Probar** envía un aviso al momento y muestra la respuesta del servicio. Las alertas
  reales pasan por una cola que se reintenta como los correos (1, 5, 15 minutos, 1 y 6
  horas); las últimas entregas aparecen bajo los webhooks.

### Datos (propietarios) {#data-owners}

- **Copia de seguridad**: descarga una copia de todo (consulta
  [Despliegue](deployment.md#backups)).
- **Copias automáticas**: cada noche, cada 6 horas, cada semana o cualquier expresión
  cron, a una carpeta o a un bucket S3 conservando las N más recientes, cada una listada
  con botones para descargar y restaurar. **Copiar ahora** lanza una al momento.
- **Restaurar** un archivo de copia.
- **Eliminar los eventos terminados**: con un número de días (14 o más), un evento se
  elimina ese tiempo después de terminar, fotos y mensajes incluidos; sus anfitriones
  reciben un correo una semana antes, y la fecha aparece en la pestaña *QR y compartir*
  del evento. Los eventos que nunca terminaron (sin hora de cierre, nunca terminados a mano) se conservan.

### Sistema (propietarios) {#system-owners}

- **Actualizaciones**: la versión que usas, la más reciente con sus notas de
  versión, **Comprobar ahora** y, con el contenedor de actualización, **Actualizar a X.Y.Z**:
  una copia de seguridad, la imagen nueva, una comprobación de salud, y vuelta a la anterior si algo
  falla. El historial lista cada actualización y las migraciones de base de datos que
  aplicó. Una línea bajo la navegación avisa a los propietarios cuando sale una versión.
- **Acerca de**: versión, idioma por defecto, almacenamiento de fotos, foto más pesada
  aceptada, dirección pública y zona horaria de la instancia.

Los correos de eventos (resúmenes, fotos pendientes de aprobación) van a la dirección de la
instancia en **Correo** y a todas las cuentas que gestionan el evento y han definido una
dirección. Las alertas de la instancia (inicios de sesión fallidos, disco) van a los propietarios.
