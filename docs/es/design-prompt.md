# Prompt de diseño {#design-prompt}

El encargo usado para diseñar la interfaz de Guestroll, escrito como un prompt para poder
dárselo a un diseñador, o a un asistente de IA, cuando la UI evolucione. Existe
porque la primera versión se parecía a cualquier app generada: fondo casi
negro, un único color de acento llamativo, un titular con serifa, diminutas etiquetas
monoespaciadas en mayúsculas sobre cada encabezado, puntos medios entre metadatos, tarjetas
redondeadas idénticas. Nada en ella decía «fotos de fiesta».

Pega todo lo que hay debajo de la línea.

---

Estás rediseñando la interfaz de **Guestroll**, una app web autoalojada para
eventos. Los invitados de una boda o un cumpleaños escanean un código QR en su mesa, se abre
la cámara del móvil y cada foto que hacen llega al álbum privado de los
anfitriones. Los anfitriones gestionan los eventos, moderan las fotos, imprimen los códigos QR y proyectan una
presentación en directo desde un área de administración.

## Quién lo usa, y dónde {#who-uses-it-and-where}

- **Invitados**: en un móvil, de pie, con una copa en la mano, en una sala oscura y
  ruidosa, a menudo algo achispados, sin ninguna gana de leer instrucciones. Entran una vez,
  unos veinte segundos por foto. Cualquier duda es una foto perdida.
- **Anfitriones**: en un portátil, la semana antes del evento (preparación) y el día después
  (ordenar, descargar). Tranquilos, cuidadosos, necesitan confiar sus recuerdos a la herramienta.

## Basa el estilo en el tema {#ground-the-look-in-the-subject}

Toma el lenguaje visual del mundo de la fotografía de fiestas, no de los paneles
SaaS:

- la **cámara desechable** que pasa de mesa en mesa: un cuerpo grueso de color, un
  gran botón de obturador, una ventanita que cuenta las exposiciones que quedan;
- la **copia de laboratorio**: borde blanco, una fecha estampada en la esquina, copias
  apiladas en un sobre;
- la **hoja de contactos** donde los anfitriones eligen sus favoritas.

Úsalos como estructura, no como decoración: el contador de exposiciones *es* la cuota
de envíos, el borde blanco *es* cómo se muestra una foto enviada, la hoja de contactos *es*
la cuadrícula de moderación. No añadas texturas esqueuomórficas, falso grano de película
ni brillo de plástico.

## Restricciones {#constraints}

- Interfaz clara sobre un papel frío y neutro. Nada de crema (familia #F4F1EA), nada de
  fondo de página casi negro (el muro en directo, mostrado en un proyector, es la única
  pantalla negra).
- Cada evento tiene su propio color de acento, elegido por los anfitriones. El diseño debe
  funcionar con cualquiera: amarillo, azul marino, rosa pálido. Calcula un texto legible encima
  en lugar de dar por hecho el blanco.
- Dos tipografías como máximo, ambas con carácter, ninguna de las habituales por defecto
  (Inter, Geist, Roboto, una serifa de titulares de alto contraste). Una grotesca redondeada y algo
  peculiar encaja con el tema: debe sentirse como una fiesta, no como un banco.
- Mayúscula solo inicial en todas partes. Nada de etiquetas en mayúsculas espaciadas, nada de etiquetas
  monoespaciadas, nada de texto «antetítulo» sobre los encabezados salvo que aporte información que
  el encabezado no da.
- Nada de puntos medios uniendo metadatos, nada de flechas añadidas a los botones, nada de emojis como
  ilustración, nada de degradados, nada de manchas de color difuminadas, nada de efectos de cristal.
- Tarjetas solo donde el contenido es un objeto separable (un evento, una foto). Los ajustes
  son un formulario, no un montón de tarjetas. Los radios siguen la jerarquía: grandes para el cuerpo
  de la cámara, pequeños para los campos, cero para las fotos (las copias tienen esquinas rectas).
- Un elemento memorable y todo lo demás discreto: el cuerpo de la cámara de la página del invitado
  con su obturador y su contador de exposiciones.
- Movimiento solo como respuesta a una acción: pulsar el obturador, una copia que se desliza a la
  tira una vez enviada. Nada de animaciones de entrada al cargar.

## Página del invitado, de arriba abajo {#guest-page-top-to-bottom}

1. El nombre del evento, grande, compuesto como la etiqueta impresa en una cámara desechable.
   Su fecha en la letra pequeña de la fecha estampada en una copia.
2. El cuerpo de la cámara en el color del evento: el botón del obturador y el contador
   de exposiciones que muestra cuántas fotos quedan (o cuántas se han enviado cuando
   no hay límite).
3. Debajo, las copias del propio invitado, de la más reciente a la más antigua, bordes blancos, esquinas
   rectas, una marca de pendiente cuando la moderación está activa. Una línea que diga que solo los anfitriones
   y el invitado pueden verlas.

Los estados de error y vacíos orientan en una sola frase («Los envíos se cerraron a
medianoche. Gracias por las fotos.»), nunca con una disculpa.

## Administración {#admin}

Discreta y densa, como el mostrador de pedidos de un laboratorio: tablas claras, números alineados, etiquetas
junto a los campos, la acción principal en el color del evento solo cuando hay un evento en
contexto. La pestaña de fotos se lee como una hoja de contactos: cuadrícula compacta, selección con
un contorno grueso y un contador, acciones en bloque en una barra que aparece al seleccionar.

## Textos {#copy}

Verbos sencillos, las palabras del usuario: «Hacer una foto», «Descargar todas las fotos»,
«Cerrar los envíos». Un botón conserva su nombre a lo largo del flujo («Guardar diseño» →
«Diseño guardado»). Traduce el sentido, no las palabras, en francés, italiano y español.

## Calidad mínima {#quality-floor}

Adaptable desde 320 px, obturador al alcance del pulgar, foco de teclado visible,
`prefers-reduced-motion` respetado, contraste de texto de 4,5:1 también sobre el color
del evento, zonas táctiles de 44 px en la página del invitado.
