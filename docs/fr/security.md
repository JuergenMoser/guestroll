# Sécurité

Guestroll conserve les photos d'autres personnes, souvent d'enfants, prises lors d'évènements privés.
Cette page liste ce qu'il protège, contre qui, et comment. Si vous trouvez une faille,
merci de la signaler en privé (voir [SECURITY.md](../../SECURITY.md)).

## Ce qui est protégé {#what-is-protected}

| Élément | Qui peut y accéder |
|---|---|
| Les photos d'un invité | Cet invité (depuis le navigateur qui les a prises) et les admins |
| Les photos de tous les autres | Les admins uniquement. Jamais un autre invité. |
| Réglages, statistiques et QR codes d'un évènement | Les admins uniquement |
| La page de l'évènement elle-même | Quiconque a le QR code, plus le code d'accès s'il y en a un |

Il n'y a pas de galerie publique ni de téléchargement par un invité des photos des autres,
quels que soient les réglages : c'est un choix de conception, pas une option.

## Comment les photos restent privées {#how-photos-stay-private}

- **Aucun fichier public.** Les photos sont stockées hors de la racine web
  (`DATA_DIR/uploads`) et ne quittent le serveur que par `/api/media/<id>`,
  qui vérifie l'accès à **chaque** requête. Une URL copiée ne sert à rien dans un autre
  navigateur : les réponses sont identiques (`404`) pour « n'existe pas » et « pas à vous ».
- **Rejoindre passe par un cookie, pas par un lien.** Ouvrir la page d'un évènement inscrit l'évènement
  dans un cookie invité chiffré. Les requêtes de médias l'exigent : une URL de photo
  collée dans une messagerie ne s'ouvre nulle part ailleurs.
- **Identifiants impossibles à deviner.** Les identifiants de photo sont des UUID aléatoires, les slugs d'évènement portent
  ~40 bits d'aléa. Les slugs ne sont pas la frontière de sécurité (c'est le cookie),
  mais ils empêchent d'énumérer les évènements.
- **Cache privé.** Les réponses de médias sont en `Cache-Control: private`, les originaux
  en `no-store` : aucun proxy partagé ni CDN n'en garde de copie.
- **Liens renouvelables.** « Générer un nouveau lien » change le slug : l'ancien QR code
  cesse de fonctionner immédiatement, par exemple après une fuite sur les réseaux sociaux.
- **Code d'accès facultatif** par évènement, haché avec bcrypt.
- **Les invités peuvent reprendre leurs photos**, à tout moment, même après l'évènement :
  en supprimer une efface ses fichiers, de l'album, des liens de galerie et du
  mur. Seul le navigateur qui l'a envoyée le peut (même cookie invité).

## Liens de galerie {#gallery-links}

- Un lien est un jeton aléatoire de 32 caractères **plus** un mot de passe (bcrypt). Le
  jeton seul affiche un formulaire de mot de passe, rien d'autre ; les liens inconnus, expirés et révoqués
  répondent tous `404`.
- Le déverrouillage inscrit le lien dans un cookie chiffré distinct (`gr_share`).
  L'accès est revérifié à chaque requête : révoquer un lien ou le laisser expirer le coupe
  immédiatement, y compris pour les navigateurs qui l'avaient déjà ouvert.
- Les liens ne voient que les photos visibles, ou les favorites visibles pour un
  lien limité aux favorites. Les originaux et le ZIP exigent l'option *Autoriser les téléchargements*
  du lien, et le ZIP d'un lien contient ce que ce lien montre. Un lien ne permet jamais
  d'envoyer des photos. Les favorites ne sont jamais signalées aux invités ni aux liens.
- Mauvais mots de passe : 10 tentatives par minute par IP et par lien, et un plafond
  par lien toutes IP confondues.
- Les mots de passe générés (`xxxx-xxxx-xxxx-xxxx`, ~82 bits) sont affichés une fois et
  jamais stockés en clair.

## Mises à jour {#updates}

- La vérification des mises à jour est un unique `GET` anonyme à l'API de GitHub toutes les 12 heures
  (`UPDATE_CHECK=false` la désactive). Rien n'est envoyé sur l'instance.
- L'updater facultatif détient le socket Docker, soit les droits root sur l'hôte. Il
  ne publie aucun port, exige un jeton de 24 caractères ou plus comparé en temps constant,
  n'accepte qu'une version `x.y.z`, ne remplace jamais que `UPDATER_CONTAINER`, et
  ne télécharge que le dépôt d'image de ce même conteneur, à la version demandée.
  L'application ne lui demande que la version annoncée par GitHub, après une sauvegarde.
- Une nouvelle version qui ne passe pas son contrôle de santé est automatiquement remplacée par le
  conteneur précédent.

## Sauvegardes {#backups}

- Seuls les propriétaires téléchargent ou restaurent les sauvegardes. Une sauvegarde contient tout,
  y compris les empreintes des mots de passe et le secret de session généré : conservez-la comme
  le serveur lui-même.
- Une restauration vérifie toute l'archive avant de modifier quoi que ce soit : le manifeste,
  un vrai fichier SQLite, et des noms de fichiers de la forme qu'écrit l'application (les chemins
  qui remontent avec `../` sont refusés). Une archive qui échoue à ces vérifications
  laisse l'instance intacte.

## Webhooks {#webhooks}

- Seuls les propriétaires les gèrent. Les URL et les secrets de signature sont chiffrés au repos
  (une URL de webhook Discord ou Slack est un identifiant) et jamais renvoyés au
  navigateur, qui n'en voit qu'un aperçu masqué.
- Les requêtes sont de simples `POST` avec un délai de 10 secondes, sans suivre
  de redirection. Elles ne visent que des adresses publiques : une URL dont l'hôte est, ou se résout en,
  une adresse privée, de loopback ou link-local (le serveur lui-même, le réseau
  local, les métadonnées du cloud, l'updater) échoue avec un message qui le dit,
  quelle que soit l'écriture de l'adresse (IPv4 dans IPv6 compris). La vérification est
  faite par la résolution DNS de la connexion elle-même, sur l'adresse à laquelle elle se connecte ensuite :
  un nom ne peut pas répondre autre chose entre-temps. Pour joindre un Home Assistant ou
  un ntfy sur votre propre réseau, réglez `WEBHOOK_ALLOW_PRIVATE=true`.
- Les notifications contiennent des noms d'évènements, des nombres et des liens d'admin, jamais de photos, d'e-mails
  d'invités ni d'audio de messages.

## Livre d'or {#guestbook}

- Les messages sont privés comme les photos : un invité ne lit et n'écoute que les siens,
  les admins de l'évènement les lisent tous, les liens de galerie seulement ceux validés et seulement si
  les organisateurs partagent le livre d'or. Les messages vocaux quittent le serveur par
  `/api/messages/<id>/audio`, vérifié à chaque requête.
- Les messages vocaux sont identifiés par leurs octets (Ogg/Opus, WebM, MP4/AAC, MP3)
  et stockés tels qu'enregistrés : les réencoder demanderait ffmpeg dans l'image. Ils ne sont
  servis qu'avec un type audio, en `no-store`, sous une CSP de mise en bac à sable. Les enregistrements
  du navigateur ne contiennent aucune position.
- 3 Mo par message vocal, 500 caractères par texte, 20 messages par invité et par évènement,
  10 par minute (voir *Abus* pour les limites qui tiennent sans cookie). Le micro n'est demandé que lorsqu'un invité touche *Enregistrer un message vocal*.

## E-mail {#email}

- Les adresses des invités sont **facultatives**, proposées seulement sur les évènements dont les organisateurs les ont
  demandées, utilisées pour l'album de cet évènement uniquement, et supprimées avec l'évènement. Un invité
  peut retirer la sienne depuis la page.
- Le mot de passe SMTP saisi dans l'admin est chiffré au repos et jamais renvoyé
  au navigateur. Il n'est conservé que pour le serveur et l'identifiant pour lesquels il a été saisi :
  changer l'un ou l'autre le redemande, si bien qu'un autre propriétaire ne peut pas le rediriger vers un
  serveur à lui.
- Avec un utilisateur défini, l'identifiant ne passe que par une connexion chiffrée (TLS
  implicite, ou STARTTLS rendu obligatoire) : on ne peut pas le lire en retirant STARTTLS
  en chemin. `SMTP_ALLOW_PLAIN=true` pour un relais sans TLS sur un réseau
  de confiance.
- Chaque valeur d'un e-mail est échappée en HTML ; chaque e-mail a son jumeau en texte brut.
- Choisir de ne pas mettre le mot de passe dans les e-mails des invités signifie qu'un e-mail transféré
  n'ouvre pas l'album.

## Envois {#uploads}

- Les fichiers sont identifiés par leurs octets, jamais par leur nom ni par `Content-Type` ; seuls
  JPEG, PNG, WebP, HEIC/HEIF, AVIF et GIF sont acceptés.
- Chaque image est **réencodée** : les métadonnées EXIF (position GPS, numéros de série
  de l'appareil) sont retirées, et tout ce qui est ajouté après les données de l'image est écarté.
- La taille est plafonnée pendant que le corps arrive : des requêtes découpées sans
  `Content-Length` ne peuvent pas épuiser la mémoire. Les images au-delà de `MAX_IMAGE_MEGAPIXELS`
  sont refusées avant décodage, HEIC compris : sa taille est lue dans l'en-tête du
  fichier avant que le décodeur n'alloue quoi que ce soit.
- Un seul envoi à la fois par invité : des requêtes parallèles d'un même invité ne peuvent pas
  contourner le quota par invité. Un invité n'est cependant qu'un cookie : un script qui le jette
  est un nouvel invité à chaque fois. Ce qui tient alors, ce sont les limites par évènement et par adresse
  ci-dessous ; un budget mémoire pour les envois en cours de réception, compté en octets
  à mesure qu'ils arrivent (une connexion qui envoie au compte-gouttes ne coûte presque rien,
  une rafale d'envois rapides est priée de réessayer) ; au plus 3 images décodées à la fois
  avec 12 en attente ; et un refus dès que le disque a moins de 512 Mo libres.
  Les téléphones des invités réessaient d'eux-mêmes quand le serveur est occupé.

## Authentification {#authentication}

- Le premier compte propriétaire (`admin`, ou `ADMIN_USERNAME`) reçoit son mot de passe
  de `ADMIN_PASSWORD`, ou un mot de passe généré au premier démarrage et affiché une fois.
  Il n'y a pas de page d'inscription publique qu'un inconnu pourrait atteindre en premier : les autres
  comptes sont créés par un propriétaire, avec un mot de passe généré affiché une fois.
- Les **propriétaires** gèrent tous les évènements, les comptes, l'e-mail et les réglages de l'instance.
  Les **organisateurs** n'accèdent qu'aux évènements qui leur sont attribués, et ne peuvent pas les supprimer.
  Un évènement hors du périmètre d'un organisateur répond `404`, exactement comme un évènement
  inexistant, aussi bien par l'API d'admin que par `/api/media`. L'instance garde toujours
  au moins un propriétaire.
- La **validation en deux étapes** (TOTP, RFC 6238) s'active compte par compte
  depuis les Réglages : après le mot de passe, un code d'une appli d'authentification. Le
  secret est chiffré au repos, un code ne peut pas servir deux fois, les codes sont limités à
  5 essais par minute et par compte, et l'état « à moitié connecté » expire au bout de 5
  minutes. Dix codes de secours à usage unique (stockés hachés) couvrent la perte du téléphone ;
  un propriétaire peut aussi réinitialiser la validation d'un autre compte. La désactiver
  demande le mot de passe et un code.
- Un mauvais identifiant met autant de temps à être refusé qu'un mauvais mot de passe (une
  comparaison bcrypt a lieu dans les deux cas) : on ne peut pas sonder les identifiants par la durée de réponse.
- Les sessions sont des cookies chiffrés, `HttpOnly`, `SameSite=Lax`, `Secure` en production
  (iron-session), qui portent le compte et sa version de session.
  Changer ou réinitialiser un mot de passe déconnecte ce compte partout ;
  supprimer un compte met fin à ses sessions immédiatement.
- Chaque page d'admin et chaque route d'API vérifie elle-même la session, et chaque route
  sous un identifiant d'évènement vérifie que l'évènement est dans le périmètre de l'admin.
  `tests/unit/routeGuards.test.ts` échoue si une route est ajoutée sans cette vérification.

## Abus {#abuse}

| Limite | Défaut |
|---|---|
| Connexion à l'admin | 5 mauvais mots de passe par minute par adresse et identifiant, 30 mauvais mots de passe par minute par adresse, 30 tentatives par minute par adresse (derrière `TRUST_PROXY`) |
| Code d'accès | 10 tentatives par minute par invité, 30 codes erronés par minute par évènement, tentatives en cours comprises |
| Envois | 30 par minute par invité, 300 par évènement, 120 par adresse (derrière `TRUST_PROXY`), plus le quota par invité |
| Livre d'or | 10 messages par minute par invité, 60 par évènement, 30 par adresse (derrière `TRUST_PROXY`) |
| Mot de passe d'un lien de galerie | 10 tentatives par minute par IP et par lien |
| E-mail de test | 5 par minute |

Les codes et mots de passe erronés sont comptés avant d'être vérifiés, puis rendus
quand ils s'avèrent justes : une rafale de tentatives parallèles compte en entier. Une
connexion réussie ne remet à zéro que les limites du compte connecté. Il n'y a pas de
plafond par identifiant toutes adresses confondues : n'importe qui pourrait alors bloquer un compte connu
depuis n'importe où.

Sans `TRUST_PROXY`, tous les clients ont la même adresse aux yeux de l'application : les
limites par adresse sont donc partagées par tout le monde ; derrière un reverse proxy, activez-le.

Le plafond par évènement sur les codes erronés est un compromis délibéré : quelqu'un qui inonde
de codes erronés peut faire attendre les vrais invités jusqu'à une minute, mais ne peut pas trouver par force brute un
code de 6 caractères ou plus (imposé) en un temps utile.

## Requêtes intersites {#cross-site-requests}

Chaque requête qui modifie un état (admin comme invité) doit porter un en-tête `Origin`
correspondant, en plus des cookies `SameSite`. L'application envoie `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, une `Referrer-Policy` stricte, et une
`Permissions-Policy` qui n'autorise l'appareil photo et le micro que pour l'application
elle-même. Quand `PUBLIC_URL` est en `https://`, les pages envoient aussi
`Strict-Transport-Security` (un an, sans les sous-domaines).

Chaque page porte une **Content-Security-Policy** avec un nonce neuf
(`src/proxy.ts`) : seuls les scripts que Next.js a marqués avec lui s'exécutent, un balisage injecté
ne peut donc rien exécuter, et la page ne peut communiquer qu'avec sa propre origine. Les styles
restent en `unsafe-inline` (React écrit des attributs `style` ; un style ne peut pas exécuter de code).
Les images, messages vocaux et fichiers SVG servis portent leur propre politique de bac à sable.
L'application ne charge rien depuis des tiers : ni CDN, ni polices ou outils d'analyse venus
d'ailleurs.

## Votre part {#your-part}

- Servez-le en **HTTPS**. Les téléphones en ont besoin pour l'appareil photo, et les cookies sont
  `Secure` en production.
- Réglez `TRUST_PROXY=true` derrière votre reverse proxy, et **seulement** dans ce cas.
- Laissez le proxy mettre en tampon le corps des requêtes avant de les transmettre (nginx le fait par
  défaut, `proxy_request_buffering on`) : un client qui envoie l'essentiel d'un
  envoi puis s'arrête bloque alors le proxy, pas la mémoire de Guestroll.
  L'application coupe d'elle-même ces envois au bout de 2 minutes, mais un client qui se reconnecte
  sans cesse pourrait occuper son budget d'envoi.
- Sauvegardez `DATA_DIR` et gardez-le privé : il contient toutes les photos et le secret
  de session.
- Figez une version d'image et suivez les versions pour les correctifs de sécurité.
