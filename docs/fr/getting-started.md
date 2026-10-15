# Bien démarrer

Ce guide vous mène de zéro à un QR code imprimé en une dizaine de minutes.

## 1. Lancer Guestroll {#_1-run-guestroll}

Il vous faut une machine avec Docker : un VPS, un serveur à la maison, un NAS ou un Raspberry Pi 4/5.

```bash
docker run -d --name guestroll \
  --restart unless-stopped \
  -p 3000:3000 \
  -v guestroll-data:/data \
  -e ADMIN_PASSWORD='choose-a-long-password' \
  -e PUBLIC_URL='https://photos.example.com' \
  ghcr.io/achedon12/guestroll:latest
```

- `-v guestroll-data:/data` conserve la base de données et les photos quand le conteneur est recréé. **Ne l'oubliez pas.**
- `PUBLIC_URL` est l'adresse encodée dans vos QR codes. Indiquez l'adresse HTTPS publique que les invités atteindront.
- Connectez-vous sur `/admin` en tant que `admin`. Sans `ADMIN_PASSWORD`, un mot de passe aléatoire est généré et affiché une seule fois : `docker logs guestroll`.
- Besoin d'aide ? Créez-leur des comptes dans **Admin → Réglages → Équipe** : un *organisateur* ne voit que les évènements que vous lui attribuez.

Les autres façons de le lancer (Compose, Node.js seul) sont dans [Déploiement](deployment.md).

## 2. Le placer derrière HTTPS {#_2-put-it-behind-https}

Les téléphones refusent d'ouvrir l'appareil photo depuis une page `http://`. Avant
l'évènement, l'instance doit être joignable en HTTPS. Le plus rapide est Caddy, qui
obtient un certificat tout seul :

```caddy
photos.example.com {
	reverse_proxy localhost:3000
}
```

Réglez ensuite `TRUST_PROXY=true` pour que les limites de débit voient la vraie IP du client.
[Déploiement](deployment.md#https-and-reverse-proxies) couvre aussi Traefik et nginx.

## 3. Créer un évènement {#_3-create-an-event}

1. Ouvrez `https://photos.example.com/admin` et connectez-vous.
2. **Nouvel évènement** : donnez-lui un nom. Tout le reste a une valeur par défaut raisonnable et se modifie plus tard.
3. Vous arrivez sur l'onglet **QR & partage**.

À décider dès le départ :

| Réglage | Recommandé pour une fête privée |
|---|---|
| Code d'accès | Définissez-en un si le QR code risque de finir sur les réseaux sociaux |
| Langue de l'album | *Automatique* suit le téléphone de chaque invité. Choisissez-en une si tous les invités parlent la même langue |
| Modération | *Publier tout de suite* entre amis, *Valider chaque photo avant affichage* si vous projetez le mur en direct |
| Fermer les envois automatiquement le | Le lendemain matin |

## 4. Imprimer le QR code {#_4-print-the-qr-code}

Dans **QR & partage**, l'éditeur vous permet de colorer le code, d'arrondir ses points et
ses coins, de placer votre logo au centre et d'ajouter une légende. L'aperçu est exactement
le fichier que vous téléchargerez. Gardez des points foncés sur fond clair : beaucoup de
scanners Android ne lisent pas l'inverse, et l'éditeur vous prévient si vous essayez.

**Affiche à imprimer** vous donne une carte A4 avec le nom de l'évènement et le QR code :
imprimez-la depuis le navigateur. Pour un imprimeur, téléchargez le **SVG**. Il reste net à toutes les tailles.

Testez-le : scannez le code avec votre propre téléphone, prenez une photo, et vérifiez
qu'elle apparaît dans l'onglet **Photos**.

## 5. Le jour J {#_5-on-the-day}

- [ ] Test au téléphone depuis le réseau du lieu ou en 4G, pas depuis votre Wi-Fi
- [ ] Le mur en direct ouvert sur l'ordinateur du projecteur (**QR & partage → Ouvrir le mur en direct**)
- [ ] Une carte QR par table, plus une près de l'entrée
- [ ] De la place sur le serveur : comptez environ 3 Mo par photo

## 6. Après l'évènement {#_6-after-the-event}

- **Photos → Télécharger le ZIP** récupère tout en pleine résolution.
- Fermez les envois (**Réglages → Accepter les envois**) si vous ne l'aviez pas programmé.
- Dans Guestroll, les invités ne voient jamais les photos des autres. Pour partager l'album,
  envoyez le ZIP, ou les photos que vous avez choisies, par le canal de votre choix.
