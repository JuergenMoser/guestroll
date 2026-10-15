# Primeros pasos {#getting-started}

Esta guía te lleva de cero a un código QR impreso en unos diez minutos.

## 1. Arranca Guestroll {#_1-run-guestroll}

Necesitas una máquina con Docker: un VPS, un servidor doméstico, un NAS o una Raspberry Pi 4/5.

```bash
docker run -d --name guestroll \
  --restart unless-stopped \
  -p 3000:3000 \
  -v guestroll-data:/data \
  -e ADMIN_PASSWORD='choose-a-long-password' \
  -e PUBLIC_URL='https://photos.example.com' \
  ghcr.io/achedon12/guestroll:latest
```

- `-v guestroll-data:/data` conserva la base de datos y las fotos cuando se recrea el contenedor. **No te lo saltes.**
- `PUBLIC_URL` es la dirección codificada en tus códigos QR. Usa la dirección HTTPS pública a la que llegarán los invitados.
- Inicia sesión en `/admin` como `admin`. Sin `ADMIN_PASSWORD`, se genera una contraseña aleatoria que se muestra una sola vez: `docker logs guestroll`.
- ¿Necesitas ayuda? Crea cuentas para tus colaboradores en **Admin → Ajustes → Equipo**: un *organizador* solo ve los eventos que le asignas.

Otras formas de arrancarlo (Compose, Node.js a secas) están en [Despliegue](deployment.md).

## 2. Ponlo detrás de HTTPS {#_2-put-it-behind-https}

Los móviles se niegan a abrir la cámara desde una página `http://`. Antes del evento,
la instancia tiene que ser accesible por HTTPS. Lo más rápido es Caddy, que obtiene
un certificado por su cuenta:

```caddy
photos.example.com {
	reverse_proxy localhost:3000
}
```

Después define `TRUST_PROXY=true` para que los límites de peticiones vean la IP real del cliente.
[Despliegue](deployment.md#https-and-reverse-proxies) también cubre Traefik y nginx.

## 3. Crea un evento {#_3-create-an-event}

1. Abre `https://photos.example.com/admin` e inicia sesión.
2. **Nuevo evento**: ponle un nombre. Todo lo demás tiene un valor por defecto razonable y se puede cambiar después.
3. Llegas a la pestaña **QR y compartir**.

Conviene decidir desde el principio:

| Ajuste | Recomendado para una fiesta privada |
|---|---|
| Código de acceso | Pon uno si el código QR puede acabar en redes sociales |
| Idioma del álbum | *Automático* sigue el idioma del móvil de cada invitado. Elige uno si todos comparten idioma |
| Moderación | *Publicar al momento* entre amigos, *Aprobar cada foto* si vas a proyectar el muro en directo |
| Cerrar los envíos | La mañana siguiente |

## 4. Imprime el código QR {#_4-print-the-qr-code}

En **QR y compartir**, el diseñador te deja colorear el código, redondear sus puntos y
esquinas, poner tu logo en el centro y añadir un pie de texto. La vista previa es exactamente
el archivo que descargarás. Quédate con puntos oscuros sobre fondo claro: muchos escáneres
de Android no leen lo contrario, y el diseñador te avisa si lo intentas.

**Cartel para imprimir** te da una tarjeta A4 con el nombre del evento y el código QR:
imprímela desde el navegador. Para una imprenta, descarga el **SVG**. Se mantiene nítido a cualquier tamaño.

Pruébalo: escanea el código con tu propio móvil, haz una foto y comprueba que aparece
en la pestaña **Fotos**.

## 5. El día del evento {#_5-on-the-day}

- [ ] Prueba con un móvil desde la red del lugar o con 4G, no desde el wifi de tu casa
- [ ] El muro en directo abierto en el portátil del proyector (**QR y compartir → Abrir el muro en directo**)
- [ ] Una tarjeta QR por mesa, más una cerca de la entrada
- [ ] Espacio en el servidor: calcula unos 3 MB por foto

## 6. Después del evento {#_6-after-the-event}

- **Fotos → Descargar ZIP** lo descarga todo a resolución completa.
- Cierra los envíos (**Ajustes → Aceptar envíos**) si no lo programaste.
- En Guestroll los invitados nunca ven las fotos de los demás. Para compartir el álbum, envía
  el ZIP, o las fotos que elegiste, por el canal que prefieras.
