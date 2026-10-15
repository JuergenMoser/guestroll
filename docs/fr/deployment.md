# Déploiement

## Prérequis {#requirements}

- Docker 20.10+ (ou Node.js 22.12+ pour se passer de Docker)
- Environ 256 Mo de RAM. Le traitement d'image culmine à ~150 Mo par envoi en cours.
- De l'espace disque pour les photos : environ 3 Mo par photo (l'original plus deux aperçus)
- Un nom de domaine en HTTPS (exigé par les appareils photo des téléphones)

Les images sont publiées pour `linux/amd64` et `linux/arm64` sur
[GHCR](https://github.com/achedon12/guestroll/pkgs/container/guestroll) (`ghcr.io/achedon12/guestroll`)
et [Docker Hub](https://hub.docker.com/r/achedon12/guestroll) (`achedon12/guestroll`), avec les mêmes tags.

| Tag | Signification |
|---|---|
| `latest` | La dernière version |
| `1`, `1.2` | La dernière version de cette branche majeure / mineure |
| `1.2.3` | Une version exacte. À figer en production. |

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

Avec un montage de dossier (`./data`), réglez `PUID` et `PGID` sur le propriétaire de ce dossier
(`id -u`, `id -g`) : au démarrage, le conteneur confie le dossier à cet utilisateur, puis
abandonne les droits root et lance le serveur sous son identité. Lancez-le avec `--user` pour sauter
complètement cette étape et gérer les permissions vous-même.

Le [`docker-compose.yml`](../../docker-compose.yml) du dépôt lit tout
depuis `.env`, y compris le port publié (`HOST_PORT`), l'interface sur laquelle il écoute
(`HOST_BIND`), le chemin des données et le tag de l'image :

```bash
cp .env.example .env   # puis modifiez-le
docker compose up -d
```

## HTTPS et reverse proxies {#https-and-reverse-proxies}

Réglez toujours `TRUST_PROXY=true` derrière un proxy, et **seulement** dans ce cas : Guestroll
lit alors l'IP du client dans `X-Forwarded-For`, que n'importe qui pourrait falsifier
sans proxy devant.

Relevez la taille maximale des requêtes du proxy au-dessus de `MAX_UPLOAD_MB` (25 Mo par défaut).

### Caddy {#caddy}

```caddy
photos.example.com {
	request_body {
		max_size 30MB
	}
	reverse_proxy guestroll:3000
}
```

### Traefik (labels) {#traefik-labels}

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

## Sans Docker {#without-docker}

```bash
git clone https://github.com/achedon12/guestroll && cd guestroll
npm ci
npm run build
cp -r .next/static .next/standalone/.next/ && cp -r drizzle .next/standalone/
cd .next/standalone
DATA_DIR=/var/lib/guestroll ADMIN_PASSWORD=… PUBLIC_URL=… node server.js
```

Faites-le tourner sous systemd ou un autre superviseur, avec un utilisateur non privilégié propriétaire de `DATA_DIR`.

## Une démo publique {#a-public-demo}

`DEMO_MODE=true` transforme une instance en démo que tout le monde peut essayer :
`docker compose -f docker-compose.demo.yml up -d`.

- Au premier démarrage, elle crée trois évènements (un mariage avec défis, livre
  d'or, favorites, cadres et mur en mosaïque ; un anniversaire avec modération ;
  une conférence) avec des photos, des messages et un lien de galerie générés.
- Un compte propriétaire partagé, `demo` / `guestroll-demo`, est affiché sur la page de
  connexion et dans un bandeau sur chaque page, avec le mot de passe du lien de galerie.
- Tout est réinitialisé selon `DEMO_RESET_CRON` (chaque nuit à 4 h UTC) : les évènements,
  photos et comptes des visiteurs disparaissent, et les données de démo sont recréées.
- Rien ne sort de l'instance : les e-mails et webhooks restent en file, la vérification
  des mises à jour est désactivée, et les réglages e-mail, webhook, sauvegarde, mise à jour, mot de passe,
  validation en deux étapes et comptes répondent `403`. `ADMIN_PASSWORD` reste le compte
  `admin` de l'exploitant.

## Sauvegardes {#backups}

Le plus simple : **Admin → Réglages → Données → Télécharger une
sauvegarde** (propriétaires). Un seul ZIP avec la base de données (un instantané à chaud, cohérent
même pendant que les invités continuent d'envoyer), toutes les photos, logos et messages vocaux quel que soit
le pilote de stockage, et le secret de session généré. **Restaurer**, sur la même page,
remplace toute l'instance par une sauvegarde ; c'est aussi la façon de déplacer les photos du
disque vers un bucket S3 (sauvegarder, régler `STORAGE_DRIVER=s3`, redémarrer, restaurer).
Une restauration est envoyée en un seul envoi : relevez la limite de taille des requêtes de votre reverse proxy
(`client_max_body_size` dans nginx) au-dessus de la taille de la sauvegarde.

Pour l'automatiser par script, le même ZIP s'obtient avec `GET /api/admin/backup?download=1` et
la session d'un propriétaire. Ou copiez vous-même le dossier de données ; tout se trouve dans
`/data` :

```
/data
├── guestroll.db          # events, photo metadata, stats, accounts, settings
├── guestroll.db-wal      # SQLite write-ahead log, part of the database
├── .session-secret       # only if SESSION_SECRET isn't set
└── uploads/<event-id>/   # photos, logo, messages/ (empty with STORAGE_DRIVER=s3)
```

Pour une copie cohérente pendant que l'application tourne, sauvegardez la base avec la sauvegarde
à chaud de SQLite, puis les fichiers :

```bash
docker exec guestroll node -e "require('better-sqlite3')('/data/guestroll.db').backup('/data/backup.db').then(()=>console.log('ok'))"
tar czf guestroll-$(date +%F).tgz -C /var/lib/docker/volumes/guestroll-data/_data backup.db uploads
```

Copier le dossier pendant que le conteneur est arrêté fonctionne tout aussi bien.

## Mises à jour {#upgrades}

Guestroll vérifie toutes les 12 heures si GitHub a publié une nouvelle version. Quand c'est le cas, les
propriétaires reçoivent un e-mail (ainsi que les webhooks abonnés à *Une nouvelle version est
disponible*), et **Admin → Réglages → Système** affiche ses notes de version.

### Depuis l'admin, en un clic {#from-the-admin-in-one-click}

Comme dans Matomo : **Mettre à jour vers X.Y.Z** fait une sauvegarde complète, puis remplace le
conteneur en cours par le même sur la nouvelle image (volumes, ports,
réseaux, variables et politique de redémarrage conservés), attend son contrôle de santé, et
remet en place l'ancien conteneur si le nouveau ne démarre pas sain.
Les migrations de base de données s'exécutent toutes seules au démarrage ; l'historique des mises à jour liste
celles appliquées par chaque mise à jour.

Il faut pour cela le petit conteneur **updater** à côté de Guestroll, car un
conteneur ne peut pas se remplacer lui-même :

```bash
# .env
UPDATER_URL=http://updater:9900
UPDATER_TOKEN=$(openssl rand -hex 32)   # collez la valeur

docker compose --profile updater up -d
```

L'updater détient le socket Docker, ce qui donne les droits root sur l'hôte. Il ne publie
aucun port, ne répond qu'avec le jeton, ne remplace jamais que le conteneur Guestroll,
et ne télécharge que les nouvelles versions de l'image de ce même conteneur. Laissez-le
de côté si vous préférez ne rien faire tourner avec le socket : les mises à jour restent alors une
commande.

### Depuis le serveur {#from-the-server}

```bash
docker compose pull && docker compose up -d
```

Dans les deux cas, lisez d'abord la liste **Upgrading** des notes de version. Chaque version est
testée en la démarrant sur les données de la précédente (voir
[Développement](development.md#upgrades)).

## Contrôle de santé {#health-check}

`GET /api/health` renvoie `200 {"status":"ok"}` quand la base de données est lisible,
`503` sinon. L'image le déclare comme son `HEALTHCHECK` Docker.
