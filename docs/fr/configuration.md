# Configuration

Guestroll se configure uniquement par variables d'environnement. Toutes les variables sont
facultatives : une instance vide démarre avec des valeurs par défaut sûres. Un modèle complet se trouve dans
[`.env.example`](../../.env.example).

Une valeur invalide arrête le serveur au démarrage avec un message qui nomme la variable,
au lieu de tourner avec une valeur de repli silencieuse.

## Docker et réseau {#docker-and-network}

Ces variables sont lues par le conteneur ou par `docker-compose.yml`, pas par l'application elle-même.

| Variable | Défaut | Description |
|---|---|---|
| `PORT` | `3000` | Port sur lequel le serveur écoute dans le conteneur (ou sur la machine sans Docker). Le contrôle de santé le suit. |
| `HOSTNAME` | `0.0.0.0` | Interface sur laquelle le serveur écoute dans le conteneur. |
| `HOST_PORT` | `3000` | Compose uniquement : port publié sur l'hôte. |
| `HOST_BIND` | `0.0.0.0` | Compose uniquement : interface de l'hôte sur laquelle publier. `127.0.0.1` ne rend Guestroll joignable que par un reverse proxy local. |
| `DATA_PATH` | `guestroll-data` | Compose uniquement : volume nommé ou chemin de l'hôte monté sur `/data`. |
| `PUID` / `PGID` | `1001` | Utilisateur et groupe propriétaires du dossier de données, qui font tourner le serveur. Faites-les correspondre à votre utilisateur hôte pour les montages de dossier. |
| `TZ` | `UTC` | Fuseau horaire des statistiques (regroupements par heure et par jour), par exemple `Europe/Paris`. |
| `GUESTROLL_IMAGE` | `ghcr.io/achedon12/guestroll:latest` | Compose uniquement : image à lancer. Figez une version en production. |
| `CONTAINER_NAME` | `guestroll` | Compose uniquement : permet de faire tourner plusieurs instances côte à côte. |

## Instance {#instance}

| Variable | Défaut | Description |
|---|---|---|
| `APP_NAME` | `Guestroll` | Affiché dans les titres de page, l'en-tête de l'admin et les cartes de partage social. |
| `PUBLIC_URL` | *(hôte de la requête)* | Origine publique encodée dans les QR codes et les cartes de partage, par exemple `https://photos.example.com`. Renseignez-la : derrière un proxy, l'hôte de la requête peut être un nom interne. |
| `DATA_DIR` | `./data` (`/data` sous Docker) | Emplacement de la base SQLite et des photos. |

## Langues {#languages}

Guestroll parle anglais (`en`), français (`fr`), italien (`it`) et espagnol (`es`).
Chaque visiteur obtient, dans cet ordre :

1. la langue qu'il a choisie dans le menu des langues (gardée dans son navigateur) ;
2. la langue de l'album, si les organisateurs en ont défini une dans les réglages de l'évènement ;
3. la langue de son navigateur, si elle est prise en charge et que `DETECT_BROWSER_LOCALE` est activé ;
4. `DEFAULT_LOCALE`.

| Variable | Défaut | Description |
|---|---|---|
| `DEFAULT_LOCALE` | `en` | Langue utilisée quand rien de plus précis ne s'applique. |
| `DETECT_BROWSER_LOCALE` | `true` | `false` saute l'étape 3 : quiconque n'a pas fait de choix obtient la langue de l'album ou `DEFAULT_LOCALE`. |

## Sécurité {#security}

| Variable | Défaut | Description |
|---|---|---|
| `ADMIN_USERNAME` | `admin` | Identifiant du compte propriétaire créé au premier démarrage. |
| `ADMIN_PASSWORD` | *(généré)* | Mot de passe de ce compte propriétaire. S'il est défini, il s'impose à chaque démarrage (et le compte reste propriétaire) : c'est le moyen de reprendre la main si tous les autres mots de passe sont perdus. S'il est vide, un mot de passe est généré au premier démarrage et affiché une fois dans les logs ; changez-le dans **Admin → Réglages**. Les autres comptes se créent depuis l'admin. |
| `SESSION_SECRET` | *(généré)* | Clé qui signe et chiffre les cookies, 32 caractères ou plus. Si elle est vide, une clé est générée et stockée dans `DATA_DIR/.session-secret`. La changer déconnecte tout le monde. |
| `TRUST_PROXY` | `false` | Lit l'IP du client dans `X-Forwarded-For` et l'hôte dans `X-Forwarded-Host`. Activez-le **uniquement** derrière un reverse proxy que vous contrôlez, sinon un en-tête falsifié permet de contourner les limites de débit. |
| `SECURE_COOKIES` | `true` en production | Les cookies ne circulent qu'en HTTPS. Mettez `false` uniquement pour tester en HTTP simple sur un réseau local. |
| `WEBHOOK_ALLOW_PRIVATE` | `false` | Autorise les webhooks à joindre des adresses privées, de loopback et link-local (un ntfy ou un Home Assistant auto-hébergé sur votre réseau). Désactivé, un webhook vers une telle adresse échoue avec un message qui le dit : le webhook d'un propriétaire ne peut pas sonder le réseau du serveur lui-même ni les métadonnées du cloud. |

## Envois {#uploads}

| Variable | Défaut | Description |
|---|---|---|
| `MAX_UPLOAD_MB` | `25` | Photo la plus lourde acceptée. Les téléphones redimensionnent avant l'envoi, la plupart des envois pèsent donc 1 à 4 Mo. Relevez au-dessus la limite de taille des requêtes de votre reverse proxy. |
| `MAX_IMAGE_MEGAPIXELS` | `80` | Les images au-delà sont refusées avant décodage, ce qui protège la mémoire des « bombes de décompression ». |
| `DEFAULT_CAPTURE_MODE` | `camera` | Mode de capture présélectionné pour les nouveaux évènements : `camera`, `picker` ou `both`. |

## Limites de débit {#rate-limits}

Par minute. Les limites d'envoi s'appliquent par invité, celles de connexion par IP client.

| Variable | Défaut | Description |
|---|---|---|
| `RATE_LIMIT_UPLOADS_PER_MINUTE` | `30` | Photos qu'un invité peut envoyer par minute. |
| `RATE_LIMIT_LOGIN_PER_MINUTE` | `5` | Tentatives de connexion à l'admin par IP. |
| `RATE_LIMIT_UNLOCK_PER_MINUTE` | `10` | Tentatives de code d'accès par invité ; trois fois cette valeur est le plafond de codes erronés sur un évènement, tous invités confondus. |

## Stockage {#storage}

Par défaut, les photos, logos et messages vocaux vont dans un dossier sous `DATA_DIR`.
Réglez `STORAGE_DRIVER=s3` pour les garder plutôt dans n'importe quel bucket compatible S3 (AWS
S3, Backblaze B2, Cloudflare R2, Wasabi, Garage, RustFS, SeaweedFS…). La
base SQLite reste toujours dans `DATA_DIR` : gardez le volume dans tous les cas.

| Variable | Défaut | Description |
|---|---|---|
| `STORAGE_DRIVER` | `local` | `local` ou `s3`. |
| `S3_ENDPOINT` | *(aucun)* | Par exemple `https://s3.eu-west-3.amazonaws.com`, `https://<account>.r2.cloudflarestorage.com`, `http://garage:3900`. |
| `S3_REGION` | `us-east-1` | Région utilisée pour signer les requêtes. La plupart des serveurs auto-hébergés acceptent la valeur par défaut. |
| `S3_BUCKET` | *(aucun)* | Le bucket doit exister. Gardez-le **privé** : Guestroll sert lui-même chaque fichier, après avoir vérifié l'accès. |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | *(aucun)* | Identifiants autorisés à lire, écrire, lister et supprimer dans le bucket. |
| `S3_PREFIX` | *(aucun)* | Dossier dans le bucket, pour partager un même bucket entre plusieurs instances. |
| `S3_FORCE_PATH_STYLE` | `true` | `true` envoie `endpoint/bucket/key` ; `false` envoie `bucket.endpoint/key` (style « virtual-hosted » d'AWS). |

Au démarrage, Guestroll écrit, relit puis supprime un petit fichier témoin, et
journalise `[storage] S3 bucket NOT usable` avec la raison en cas d'échec. Les fichiers ne sont
jamais servis directement depuis le bucket : les photos restent privées même avec un
bucket sur un endpoint public. Pour déplacer les photos existantes vers un bucket, faites une sauvegarde
(Admin → Réglages → Données), changez de pilote, puis restaurez-la.

## Sauvegardes planifiées {#scheduled-backups}

Les propriétaires les règlent dans **Admin → Réglages → Données** ; ces variables
les définissent plutôt depuis l'environnement (l'admin les affiche alors en lecture seule).
Chaque sauvegarde est le même ZIP qu'une sauvegarde manuelle : la base de données, toutes les photos, logos et
messages vocaux, et le secret de session généré.

| Variable | Défaut | Description |
|---|---|---|
| `BACKUP_CRON` | *(aucun)* | Active les sauvegardes planifiées, par exemple `0 3 * * *` (chaque nuit à 3 h, dans le fuseau `TZ`). Cinq champs. |
| `BACKUP_KEEP` | `7` | Nombre de sauvegardes à garder ; les plus anciennes sont supprimées après chaque nouvelle. |
| `BACKUP_DIR` | `DATA_DIR/backups` | Leur destination. Montez-y un autre disque : une sauvegarde sur le même disque que les photos ne survit pas à ce disque. |
| `BACKUP_S3_ENDPOINT`, `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY`, `BACKUP_S3_REGION`, `BACKUP_S3_PREFIX`, `BACKUP_S3_FORCE_PATH_STYLE` | *(aucun)* | Les envoie vers un bucket compatible S3 plutôt qu'un dossier (dès que `BACKUP_S3_BUCKET` est défini). Utilisez un autre bucket que celui des photos. Les grosses archives montent par morceaux de 16 Mo. |

Une sauvegarde échouée envoie un e-mail aux propriétaires et à l'adresse de l'instance, et prévient
les webhooks abonnés à *Une sauvegarde planifiée a échoué*.

## Démo {#demo}

| Variable | Défaut | Description |
|---|---|---|
| `DEMO_MODE` | `false` | Une démo publique : contenu pré-rempli, le compte `demo`, réinitialisation chaque nuit, rien n'est envoyé à l'extérieur. Voir [Déploiement](deployment.md#a-public-demo). |
| `DEMO_RESET_CRON` | `0 4 * * *` | Quand la démo revient à son contenu initial, dans le fuseau `TZ`. |

## Mises à jour {#updates}

| Variable | Défaut | Description |
|---|---|---|
| `UPDATE_CHECK` | `true` | Interroge GitHub toutes les 12 heures sur la dernière version et prévient les propriétaires des nouvelles. `false` supprime tout appel sortant. |
| `UPDATER_URL` | *(aucun)* | Adresse où répond le conteneur updater, `http://updater:9900` avec le fichier compose fourni. Active les mises à jour en un clic. |
| `UPDATER_TOKEN` | *(aucun)* | Un long secret aléatoire partagé par l'application et l'updater (24 caractères ou plus). |

L'updater lit lui-même `UPDATER_TOKEN`, `UPDATER_CONTAINER` (le conteneur à
remplacer, `guestroll` par défaut) et `UPDATER_PORT` (`9900`). Voir
[Déploiement](deployment.md#upgrades).

## E-mail {#email}

Facultatif. Sans SMTP, tout le reste fonctionne et aucun e-mail n'est jamais envoyé.
Le SMTP peut aussi se régler dans **Admin → Réglages → Notifications**, où le mot de passe est
stocké chiffré (AES-256-GCM, clé dérivée de `SESSION_SECRET`). Quand
`SMTP_HOST` est défini, l'environnement l'emporte et le formulaire de l'admin est en lecture seule.

| Variable | Défaut | Description |
|---|---|---|
| `SMTP_HOST` | *(aucun)* | Serveur SMTP, par exemple `smtp.fastmail.com`. Le définir active l'e-mail. |
| `SMTP_PORT` | `587` | `587` (STARTTLS) ou `465` (TLS). |
| `SMTP_SECURE` | `false` | `true` pour le TLS implicite sur le port 465. |
| `SMTP_USER` / `SMTP_PASSWORD` | *(aucun)* | Identifiants, quand le serveur les demande. |
| `SMTP_FROM` | `SMTP_USER` | Expéditeur, par exemple `Guestroll <photos@example.com>`. |
| `SMTP_ALLOW_PLAIN` | `false` | Avec un utilisateur défini, l'identifiant n'est envoyé qu'une fois la connexion chiffrée (TLS implicite ou STARTTLS) : personne sur le trajet ne peut retirer STARTTLS pour le lire. `true` pour un relais sans TLS sur la même machine ou un réseau de confiance. |
| `ADMIN_EMAIL` | *(aucun)* | Destination des alertes et des bilans d'évènements. Réglable dans l'admin quand elle est vide. |
| `SCHEDULER_INTERVAL_SECONDS` | `60` | Fréquence à laquelle la tâche de fond envoie les e-mails en file, ferme les évènements programmés et vérifie les alertes. `0` la désactive. |

Les e-mails attendent dans une file en base et sont relancés après 1, 5, 15 minutes,
1 et 6 heures, puis marqués en échec (Admin → Réglages les affiche, avec un bouton pour
les relancer). Renseignez `PUBLIC_URL` : les liens des e-mails sont construits à partir d'elle, car une
tâche de fond n'a pas de requête où lire l'hôte.
