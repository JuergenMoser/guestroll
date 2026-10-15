import type { Locale } from "@/lib/constants";

/**
 * Email copy, apart from the UI messages: emails are rendered on the server,
 * in the recipient's language (the guest's, or DEFAULT_LOCALE for the admin).
 */
const en = {
  footer: "Sent by {app}, the photo album of your events.",
  test: {
    subject: "{app}: test email",
    title: "Your email settings work.",
    body: "This message was sent from your {app} instance. Alerts and end-of-event emails will arrive at this address.",
  },
  gallery: {
    subject: "The photos of {event} are here",
    title: "The album of {event} is ready.",
    body: "Thank you for sharing your photos. Here is the album with everyone's best shots.",
    cta: "Open the album",
    password: "Password:",
    passwordFromHosts: "The hosts will give you the password.",
    expires: "This link works until {date}.",
    downloads: "You can download the photos.",
    linkLabel: "Sent to guests at the end of the event",
  },
  summary: {
    subject: "{event}: the event is over",
    title: "{event} is over.",
    body: "Uploads are closed. Here is how it went.",
    photos: "Photos",
    guests: "Photographers",
    pending: "Waiting for approval",
    views: "Page views",
    messages: "Guestbook messages",
    topGuests: "Most photos",
    galleryLink: "Guests who received a gallery link: {count}.",
    galleryPassword: "Guests got {url} without its password. Give them this one:",
    cta: "Open the event",
  },
  pending: {
    subject: "{event}: {count} photos waiting for approval",
    title: "{count} photos are waiting for you.",
    body: "Guests sent new photos to {event}. They stay hidden until you approve them.",
    cta: "Review the photos",
  },
  failedLogins: {
    subject: "{app}: {count} failed sign-in attempts",
    title: "Someone is trying admin passwords.",
    body: "{count} wrong admin passwords were entered in the last 15 minutes. If it wasn't you, check that your password is long and unique; sign-in attempts are rate limited.",
    cta: "Open the admin",
  },
  notice: {
    guestbook: "{event}: a new guestbook message",
    from: "From {name}",
    voiceNote: "(voice note)",
    testTitle: "{app}: test notification",
    testBody: "If you can read this, the webhook works.",
  },
  storage: {
    subject: "{app}: the disk is {percent}% full",
    title: "Storage is running out.",
    body: "The disk holding the photos is {percent}% full ({free} left). New uploads will fail once it's full: free some space or download and delete past events.",
    cta: "Open the admin",
  },
};

export type MailMessages = typeof en;
type Strings<T> = { [K in keyof T]: T[K] extends string ? string : Strings<T[K]> };

const fr: Strings<MailMessages> = {
  footer: "Envoyé par {app}, l'album photo de vos évènements.",
  test: {
    subject: "{app} : e-mail de test",
    title: "Vos réglages e-mail fonctionnent.",
    body: "Ce message a été envoyé depuis votre instance {app}. Les alertes et les e-mails de fin d'évènement arriveront à cette adresse.",
  },
  gallery: {
    subject: "Les photos de « {event} » sont là",
    title: "L'album de « {event} » est prêt.",
    body: "Merci d'avoir partagé vos photos. Voici l'album avec les meilleurs clichés de tout le monde.",
    cta: "Ouvrir l'album",
    password: "Mot de passe :",
    passwordFromHosts: "Les organisateurs vous donneront le mot de passe.",
    expires: "Ce lien fonctionne jusqu'au {date}.",
    downloads: "Vous pouvez télécharger les photos.",
    linkLabel: "Envoyé aux invités à la fin de l'évènement",
  },
  summary: {
    subject: "{event} : l'évènement est terminé",
    title: "{event} est terminé.",
    body: "Les envois sont fermés. Voici le bilan.",
    photos: "Photos",
    guests: "Photographes",
    pending: "En attente de validation",
    views: "Pages vues",
    messages: "Messages du livre d'or",
    topGuests: "Le plus de photos",
    galleryLink: "Invités ayant reçu un lien de galerie : {count}.",
    galleryPassword: "Les invités ont reçu {url} sans son mot de passe. Donnez-leur celui-ci :",
    cta: "Ouvrir l'évènement",
  },
  pending: {
    subject: "{event} : {count} photos en attente de validation",
    title: "{count} photos vous attendent.",
    body: "Des invités ont envoyé de nouvelles photos pour « {event} ». Elles restent masquées jusqu'à votre validation.",
    cta: "Voir les photos",
  },
  failedLogins: {
    subject: "{app} : {count} tentatives de connexion échouées",
    title: "Quelqu'un essaie des mots de passe admin.",
    body: "{count} mauvais mots de passe admin ont été saisis ces 15 dernières minutes. Si ce n'était pas vous, vérifiez que votre mot de passe est long et unique ; les tentatives sont limitées en débit.",
    cta: "Ouvrir l'admin",
  },
  notice: {
    guestbook: "{event} : un nouveau message dans le livre d'or",
    from: "De {name}",
    voiceNote: "(message vocal)",
    testTitle: "{app} : notification de test",
    testBody: "Si vous lisez ceci, le webhook fonctionne.",
  },
  storage: {
    subject: "{app} : disque plein à {percent} %",
    title: "L'espace disque s'épuise.",
    body: "Le disque qui contient les photos est plein à {percent} % (il reste {free}). Les envois échoueront une fois plein : libérez de la place ou téléchargez puis supprimez d'anciens évènements.",
    cta: "Ouvrir l'admin",
  },
};

const it: Strings<MailMessages> = {
  footer: "Inviato da {app}, l'album fotografico dei tuoi eventi.",
  test: {
    subject: "{app}: e-mail di prova",
    title: "Le impostazioni e-mail funzionano.",
    body: "Questo messaggio è stato inviato dalla tua istanza {app}. Avvisi ed e-mail di fine evento arriveranno a questo indirizzo.",
  },
  gallery: {
    subject: "Le foto di «{event}» sono arrivate",
    title: "L'album di «{event}» è pronto.",
    body: "Grazie per aver condiviso le tue foto. Ecco l'album con i migliori scatti di tutti.",
    cta: "Apri l'album",
    password: "Password:",
    passwordFromHosts: "Gli organizzatori ti daranno la password.",
    expires: "Questo link funziona fino al {date}.",
    downloads: "Puoi scaricare le foto.",
    linkLabel: "Inviato agli ospiti a fine evento",
  },
  summary: {
    subject: "{event}: l'evento è finito",
    title: "{event} è finito.",
    body: "I caricamenti sono chiusi. Ecco com'è andata.",
    photos: "Foto",
    guests: "Fotografi",
    pending: "In attesa di approvazione",
    views: "Visite",
    messages: "Messaggi nel libro degli ospiti",
    topGuests: "Più foto",
    galleryLink: "Ospiti che hanno ricevuto un link alla galleria: {count}.",
    galleryPassword: "Gli ospiti hanno ricevuto {url} senza password. Comunicagli questa:",
    cta: "Apri l'evento",
  },
  pending: {
    subject: "{event}: {count} foto in attesa di approvazione",
    title: "{count} foto ti aspettano.",
    body: "Gli ospiti hanno inviato nuove foto a {event}. Restano nascoste finché non le approvi.",
    cta: "Rivedi le foto",
  },
  failedLogins: {
    subject: "{app}: {count} tentativi di accesso falliti",
    title: "Qualcuno sta provando password admin.",
    body: "Negli ultimi 15 minuti sono state inserite {count} password admin errate. Se non sei stato tu, verifica che la password sia lunga e unica; i tentativi sono limitati.",
    cta: "Apri l'admin",
  },
  notice: {
    guestbook: "{event}: un nuovo messaggio nel libro degli ospiti",
    from: "Da {name}",
    voiceNote: "(messaggio vocale)",
    testTitle: "{app}: notifica di prova",
    testBody: "Se leggi questo messaggio, il webhook funziona.",
  },
  storage: {
    subject: "{app}: disco pieno al {percent}%",
    title: "Lo spazio sta finendo.",
    body: "Il disco con le foto è pieno al {percent}% (restano {free}). I caricamenti falliranno quando sarà pieno: libera spazio o scarica ed elimina eventi passati.",
    cta: "Apri l'admin",
  },
};

const es: Strings<MailMessages> = {
  footer: "Enviado por {app}, el álbum de fotos de tus eventos.",
  test: {
    subject: "{app}: correo de prueba",
    title: "Tu configuración de correo funciona.",
    body: "Este mensaje se envió desde tu instancia de {app}. Las alertas y los correos de fin de evento llegarán a esta dirección.",
  },
  gallery: {
    subject: "Ya están aquí las fotos de «{event}»",
    title: "El álbum de «{event}» está listo.",
    body: "Gracias por compartir tus fotos. Aquí tienes el álbum con las mejores de todos.",
    cta: "Abrir el álbum",
    password: "Contraseña:",
    passwordFromHosts: "Los anfitriones te darán la contraseña.",
    expires: "Este enlace funciona hasta el {date}.",
    downloads: "Puedes descargar las fotos.",
    linkLabel: "Enviado a los invitados al final del evento",
  },
  summary: {
    subject: "{event}: el evento ha terminado",
    title: "{event} ha terminado.",
    body: "Los envíos están cerrados. Así ha ido.",
    photos: "Fotos",
    guests: "Fotógrafos",
    pending: "Pendientes de aprobación",
    views: "Visitas",
    messages: "Mensajes del libro de visitas",
    topGuests: "Más fotos",
    galleryLink: "Invitados que han recibido un enlace a la galería: {count}.",
    galleryPassword: "Los invitados han recibido {url} sin su contraseña. Dales esta:",
    cta: "Abrir el evento",
  },
  pending: {
    subject: "{event}: {count} fotos pendientes de aprobación",
    title: "{count} fotos te esperan.",
    body: "Los invitados han enviado nuevas fotos a {event}. Permanecen ocultas hasta que las apruebes.",
    cta: "Revisar las fotos",
  },
  failedLogins: {
    subject: "{app}: {count} intentos de acceso fallidos",
    title: "Alguien está probando contraseñas de admin.",
    body: "Se han introducido {count} contraseñas de admin incorrectas en los últimos 15 minutos. Si no has sido tú, comprueba que tu contraseña sea larga y única; los intentos están limitados.",
    cta: "Abrir el admin",
  },
  notice: {
    guestbook: "{event}: un nuevo mensaje en el libro de visitas",
    from: "De {name}",
    voiceNote: "(nota de voz)",
    testTitle: "{app}: notificación de prueba",
    testBody: "Si puedes leer esto, el webhook funciona.",
  },
  storage: {
    subject: "{app}: disco al {percent} %",
    title: "Se está acabando el espacio.",
    body: "El disco con las fotos está al {percent} % (quedan {free}). Los envíos fallarán cuando esté lleno: libera espacio o descarga y elimina eventos pasados.",
    cta: "Abrir el admin",
  },
};

export const mailMessages: Record<Locale, MailMessages> = { en, fr: fr as MailMessages, it: it as MailMessages, es: es as MailMessages };
