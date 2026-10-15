# Guide d'administration

Connectez-vous sur `/admin` avec votre compte : `admin` et le mot de passe de
`ADMIN_PASSWORD` sur une installation neuve, ou celui qu'un propriétaire vous a donné. L'admin
fonctionne sur téléphone, mais il est plus confortable sur un ordinateur portable.

## Tableau de bord {#dashboard}

Les totaux de tous les évènements : photos, invités ayant envoyé au moins une photo, pages
vues, téléchargements, stockage utilisé et photos en attente de validation. En dessous : les envois
par jour sur les 30 derniers jours, les cinq photographes les plus actifs, et les
derniers évènements.

## Évènements {#events}

**Nouvel évènement** ne demande qu'un nom ; tous les autres réglages ont une valeur
par défaut modifiable plus tard. Chaque évènement a ses onglets : Photos, Livre d'or
(une fois activé), Statistiques, QR & partage et Réglages.

### Photos {#photos}

La planche contact de tout ce que les invités ont envoyé, les plus récentes d'abord.

- Filtrez par **Toutes**, **En attente**, **Visibles**, **Masquées** ou **Favorites**, et
  par défi quand l'évènement en a.
- Touchez des photos pour les sélectionner, puis **Valider**, **Masquer**, **Favorite**,
  **Retirer des favorites** ou **Supprimer** depuis la barre du bas. Les photos masquées disparaissent aussi pour l'invité qui les a prises,
  et quittent le mur en direct ; les photos supprimées sont effacées du disque.
- **Télécharger le ZIP** récupère toutes les photos visibles en pleine résolution, nommées
  `0001-camille-1a2b3c4d.jpg` pour qu'elles se rangent dans l'ordre où elles ont été prises.
  L'archive est diffusée en continu : même un album de plusieurs gigaoctets commence à se télécharger
  immédiatement.
- **Importer des photos** ajoute des fichiers depuis votre ordinateur, typiquement ceux du
  photographe : envoyés un par un en pleine qualité (sans compression dans le
  navigateur), publiés tout de suite, hors des quotas des invités et des heures de fermeture, et
  crédités au nom que vous indiquez.
- Les **favorites** sont votre sélection, marquée d'une étoile. Avec le filtre Favorites,
  **Télécharger les favorites** récupère un ZIP « best of », et un lien de galerie peut ne montrer
  que les favorites. Les invités ne voient jamais quelles photos vous avez choisies.

### Livre d'or {#guestbook}

Activez-le dans **Réglages → Livre d'or** : les invités trouvent alors une carte sous leurs
photos pour laisser quelques mots, un message vocal de 2 minutes au plus enregistré dans le
navigateur, ou les deux. Les messages suivent la modération de l'évènement, comme les photos ; un
invité ne voit et ne peut supprimer que les siens.

L'onglet **Livre d'or** les liste, avec un lecteur pour chaque message vocal. Sélectionnez pour
valider, masquer ou supprimer ; **Télécharger le livre d'or** récupère un ZIP avec
`guestbook.txt` (tous les messages, du plus ancien au plus récent) et les messages vocaux, numérotés en
correspondance. *Montrer les messages derrière les liens de galerie* ajoute ceux qui sont validés sous
les photos de chaque lien de galerie de l'évènement (désactivé par défaut : ils vous étaient
adressés). Le bilan de fin d'évènement les compte.

### Statistiques {#stats}

Les envois heure par heure pendant l'évènement (une fête dure une nuit, l'heure est donc
l'unité utile), les pages vues, les téléchargements, les codes d'accès erronés, les meilleurs photographes,
et les photos par défi.

### QR & partage {#qr-sharing}

- **Lien invité** : l'adresse derrière le QR code, à coller dans un message.
- **Design du QR code** : préréglages, couleurs, forme des points et des coins, marge, un logo au
  centre et une légende. L'aperçu est exactement le fichier que vous téléchargez, en PNG
  (512 à 4096 px) ou en SVG. Pensez à **Enregistrer** avant de télécharger.
- **Affiche à imprimer** : une carte A4 avec le nom de l'évènement, la date et le QR code.
- **Diaporama vidéo** : un MP4 des photos visibles (ou des favorites) dans
  l'ordre où elles ont été prises, avec un carton titre, des zooms lents et des fondus enchaînés, en 16:9 ou
  9:16 pour les stories, 2 à 8 secondes par photo, jusqu'à 300 photos, et votre propre
  musique si vous ajoutez un fichier (coupée et en fondu à la fin). Elle est créée dans votre
  navigateur (WebCodecs, tout Chrome, Edge, Safari ou Firefox récent) : le serveur
  n'a donc besoin d'aucun encodeur vidéo, mais gardez l'onglet ouvert pendant que la barre de progression avance.
  Les photos dont la forme est très éloignée de celle de la vidéo sont montrées en entier sur un fond flouté
  au lieu d'être recadrées.
- **Mur en direct** : un diaporama plein écran pour un projecteur ou une TV. Les nouvelles photos
  passent devant la file et apparaissent en moins de cinq secondes ; entre-temps, il fait défiler
  les plus récentes. Seules les photos visibles sont montrées : avec *Valider chaque photo
  avant affichage*, rien n'arrive à l'écran tant que vous ne l'avez pas validé. Ses réglages :

  | Réglage | Effet |
  |---|---|
  | Disposition | **Un tirage** à la fois, une **mosaïque** (la plus récente en grand, quatre autour) ou une **grille** de quinze |
  | Secondes par étape | 3 à 30 |
  | Afficher qui a pris chaque photo / le défi de chaque photo | Légendes sous chaque photo |
  | Afficher le QR code dans un coin | Pour que la salle continue de participer |
  | Les favorites seulement | Seulement les photos marquées d'une étoile |
  | Afficher les messages du livre d'or | Les messages texte validés : entre les photos en *Un tirage*, en bas de l'écran sinon |

  Un mur ouvert prend en compte les changements de réglages en moins de 20 secondes, sans recharger.
- **Générer un nouveau lien** : change l'adresse. L'ancien QR code cesse de fonctionner
  immédiatement, pour tout le monde. À utiliser si le code a fuité.

### Réglages {#settings}

| Section | Réglage | Effet |
|---|---|---|
| Évènement | Nom, message d'accueil, date, couleur d'accent | Ce que les invités voient en haut de leur page. La couleur teinte l'appareil photo et les boutons ; le texte posé dessus s'adapte automatiquement. |
| Accès | Code d'accès | Facultatif, 6 caractères ou plus. Les invités le tapent une fois. Laissez vide pour que le QR code suffise à donner l'accès. |
| Envois | Accepter les envois | Coupez les envois à tout moment ; les invités gardent leurs propres photos. |
| | Fermer les envois automatiquement le | Par exemple le lendemain matin. |
| | Mode de capture | Appareil photo uniquement (par défaut), galerie uniquement, ou les deux. |
| | Photos par invité | 0 pour aucune limite. Les invités voient un compteur des photos restantes. |
| | Modération | Publier tout de suite et masquer ensuite, ou valider chaque photo avant affichage. |
| Invités | Langue de l'album | Automatique (le téléphone de chaque invité) ou une langue fixe. Les invités peuvent toujours en changer. |
| | Demander leur prénom aux invités | Affiché à côté de leurs photos dans l'admin et sur le mur en direct. |
| Rendu | Cadre | **Tirage instantané** (bord blanc, nom et date de l'évènement en dessous, logo), **Couleur de l'évènement** (une bordure à la couleur d'accent avec le nom), ou **Tampon logo** dans un coin. Dessiné sur le téléphone avant l'envoi. |
| | Laisser les invités choisir un filtre | Noir et blanc, chaud, vintage ou éclatant, choisi au-dessus du déclencheur. Cadres et filtres font partie de la photo envoyée : l'original n'est pas conservé. Les téléphones qui ne savent pas décoder un format dans le navigateur (rare) l'envoient tel quel. |
| Défis | Liste d'idées | Jusqu'à 30 idées de photos (« La piste de danse », « Les mariés avec un inconnu »). Les invités en choisissent une au-dessus du déclencheur et voient celles qu'ils ont déjà relevées. Renommer un défi garde ses photos ; le retirer les garde aussi, sans étiquette dans le filtre. |

| Après l'évènement | Permettre aux invités de laisser leur e-mail pour recevoir l'album | Ajoute une carte sur la page invité. Facultatif pour l'invité ; les adresses sont supprimées avec l'évènement. |
| | M'envoyer un bilan à la fermeture des envois | Photos, photographes, vues, ce qui est encore en attente. |
| | Envoyer aux invités un lien de galerie à la fermeture des envois | Un seul lien protégé par mot de passe pour l'évènement, envoyé une fois à chaque adresse. |
| | Durée de validité du lien (jours) | 0 pour un lien qui n'expire jamais. |
| | Les invités peuvent télécharger les photos depuis le lien | Désactivé : le lien montre les photos mais pas les originaux ni le ZIP. |
| | N'envoyer que les favorites | Le lien montre les photos marquées d'une étoile au lieu de tout l'album. Marquez-les avant la fin de l'évènement. |
| | Mettre le mot de passe dans l'e-mail | Désactivé : les invités ne reçoivent que le lien, et le mot de passe vous parvient (e-mail de bilan et carte *Terminer l'évènement*) pour que vous le transmettiez vous-même. Un e-mail transféré ne suffit alors plus. |

### Liens de galerie {#gallery-links}

Dans **QR & partage**, *Liens de galerie* crée des liens privés vers les photos
visibles de l'évènement : pour la famille qui n'était pas là, ou pour les invités après coup.
Chaque lien a son propre mot de passe (le vôtre, ou un mot de passe généré affiché **une seule fois**), une
expiration facultative, une option de téléchargement, tout l'album ou seulement les favorites,
et un compteur de vues. **Révoquer** le coupe
immédiatement, même pour quelqu'un qui l'a déjà ouvert. Un lien de galerie ne permet jamais
d'envoyer des photos, et ne montre jamais les photos en attente ou masquées.

### Terminer l'évènement {#end-the-event}

Les envois se ferment d'eux-mêmes à l'heure de fermeture prévue ; les e-mails de fin d'évènement
partent alors dans la minute. **Terminer l'évènement maintenant** le fait immédiatement. Cela ne s'exécute
qu'une fois par évènement : terminer à nouveau ne fait rien.

**Dupliquer cet évènement** (propriétaires) : un nouvel évènement avec les mêmes réglages,
couleurs, design de QR code, logo, défis et organisateurs, prêt pour l'année suivante.
Ni les photos, ni les messages, ni les liens ne suivent, et il reçoit son propre QR code : l'ancien
continue de pointer vers l'ancien évènement.

**Zone sensible** : supprimer un évènement efface toutes ses photos du disque. Tapez le
nom de l'évènement pour confirmer.

## Réglages {#settings-1}

Les réglages sont répartis en cinq rubriques, listées à gauche (une rangée d'onglets sur
téléphone). Une rubrique qui demande votre attention le signale dans la liste : validation
en deux étapes désactivée, aucune sauvegarde automatique, pas de serveur e-mail, une mise à jour en attente.
Les organisateurs ne voient que **Votre compte**.

### Votre compte {#your-account}

- **Profil** : nom affiché et adresse où arrivent les bilans et alertes de *vos*
  évènements.
- **Mot de passe** : le changer déconnecte vos autres sessions. Indisponible pour
  le compte défini par `ADMIN_PASSWORD` : modifiez la variable et redémarrez à la place.
- **Validation en deux étapes** : scannez le QR code avec une appli d'authentification,
  saisissez le code, et gardez les dix codes de secours affichés une seule fois. Chaque connexion
  demande alors un code après le mot de passe. Téléphone perdu ? Connectez-vous avec un code de
  secours, ou demandez à un propriétaire de la réinitialiser depuis **Équipe**.
- **Langue et thème** pour votre propre navigateur.

### Équipe (propriétaires) {#team-owners}

Ajoutez des personnes et choisissez leur rôle.

| Rôle | Peut |
|---|---|
| Propriétaire | Tout : tous les évènements, créer et supprimer des évènements, les comptes, l'e-mail, les alertes |
| Organisateur | Seulement les évènements qui lui sont attribués : photos et modération, réglages, QR code, liens de galerie, mur en direct, terminer l'évènement. Pas le supprimer. |

Un nouveau compte reçoit un mot de passe généré, affiché une seule fois pour que vous le transmettiez.
*Nouveau mot de passe* en génère un autre et déconnecte la personne ; *Supprimer*
met fin à son accès immédiatement. Le dernier propriétaire ne peut être ni rétrogradé ni supprimé.

### Notifications (propriétaires) {#notifications-owners}

- **E-mail** : serveur SMTP (ou en lecture seule quand il est défini par `SMTP_HOST`), destination
  des alertes, et un bouton **Envoyer un e-mail de test** qui affiche la réponse du serveur.
- **Alertes**, activables une à une : photos en attente de validation (au plus toutes les 30
  minutes, seulement quand leur nombre augmente), le bilan de fin d'un évènement, 10 mauvais mots de passe
  admin ou plus en 15 minutes (au plus une fois par heure), disque plein à 90 % (au plus une fois par jour).
- **E-mails récents** avec leur état. Ceux en échec peuvent être relancés.
- **Webhooks** : les mêmes alertes sur votre téléphone ou dans une messagerie, quels que soient
  les réglages e-mail. Jusqu'à 10, chacun avec son propre choix d'alertes (évènement
  terminé, photos en attente, nouveau message dans le livre d'or, connexions échouées, stockage).

  | Service | URL | Ce qui arrive |
  |---|---|---|
  | ntfy | un sujet sur ntfy.sh ou votre propre serveur | Une notification push qui ouvre la page d'admin |
  | Discord | paramètres du salon → Intégrations → Webhooks | Un embed (mentions désactivées) |
  | Slack | un Incoming Webhook | Un message avec un lien |
  | JSON | n'importe quoi : Home Assistant, n8n, votre script | `{ app, kind, title, message, url, event, data, sentAt }`, signé avec `X-Guestroll-Signature: sha256=<HMAC of the body>` quand vous définissez un secret |

  **Tester** envoie une notification tout de suite et affiche la réponse du service. Les vraies
  alertes passent par une file relancée comme les e-mails (1, 5, 15 minutes, 1 et 6
  heures) ; les derniers envois sont listés sous les webhooks.

### Données (propriétaires) {#data-owners}

- **Sauvegarde** : téléchargez une sauvegarde de tout (voir
  [Déploiement](deployment.md#backups)).
- **Sauvegardes automatiques** : chaque nuit, toutes les 6 heures, chaque semaine, ou n'importe quelle expression
  cron, vers un dossier ou un bucket S3 en gardant les N plus récentes, chacune listée
  avec des boutons de téléchargement et de restauration. **Sauvegarder maintenant** en lance une immédiatement.
- **Restaurer** un fichier de sauvegarde.
- **Supprimer les évènements terminés** : avec un nombre de jours (14 ou plus), un évènement est
  supprimé ce délai après sa fin, photos et messages compris ; ses organisateurs
  reçoivent un e-mail une semaine avant, et la date s'affiche dans l'onglet *QR & partage*
  de l'évènement. Les évènements jamais terminés (sans heure de fermeture, jamais terminés à la main) sont conservés.

### Système (propriétaires) {#system-owners}

- **Mises à jour** : la version que vous utilisez, la plus récente avec ses notes
  de version, **Vérifier maintenant**, et, avec le conteneur updater, **Mettre à jour vers X.Y.Z** :
  une sauvegarde, la nouvelle image, un contrôle de santé, l'ancienne remise en place si quoi que ce soit
  tourne mal. L'historique liste chaque mise à jour et les migrations de base de données qu'elle a
  appliquées. Une ligne sous la navigation prévient les propriétaires quand une version sort.
- **À propos** : version, langue par défaut, stockage des photos, photo la plus lourde
  acceptée, adresse publique et fuseau horaire de l'instance.

Les e-mails d'un évènement (bilans, photos en attente de validation) vont à l'adresse de
l'instance dans **E-mail** et à chaque compte gérant l'évènement qui a renseigné une
adresse. Les alertes de l'instance (connexions échouées, disque) vont aux propriétaires.
