# Brief de design

Le brief qui a servi à concevoir l'interface de Guestroll, rédigé comme un prompt pour pouvoir être
confié à un designer, ou à un assistant IA, quand l'interface évolue. Il existe
parce que la première version ressemblait à toutes les applis générées : fond presque
noir, une seule couleur d'accent vive, un titre en serif, de minuscules libellés en capitales et en chasse fixe
au-dessus de chaque titre, des points médians entre les métadonnées, des cartes arrondies
identiques. Rien n'y évoquait des « photos de fête ».

Collez tout ce qui se trouve sous le trait.

---

Vous redessinez l'interface de **Guestroll**, une application web auto-hébergée pour les
évènements. Les invités d'un mariage ou d'un anniversaire scannent un QR code posé sur leur table, l'appareil
photo de leur téléphone s'ouvre, et chaque photo qu'ils prennent arrive dans l'album privé des
organisateurs. Les organisateurs gèrent les évènements, modèrent les photos, impriment les QR codes et projettent un diaporama
en direct depuis un espace d'administration.

## Qui l'utilise, et où {#who-uses-it-and-where}

- **Les invités** : sur un téléphone, debout, un verre à la main, dans une salle sombre et
  bruyante, souvent un peu éméchés, jamais disposés à lire des instructions. Ils viennent une fois,
  une vingtaine de secondes par photo. La moindre hésitation, c'est une photo perdue.
- **Les organisateurs** : sur un ordinateur portable, la semaine avant l'évènement (préparation) et le lendemain
  (tri, téléchargement). Calmes, attentifs, ils doivent pouvoir confier leurs souvenirs à l'outil.

## Ancrer le style dans le sujet {#ground-the-look-in-the-subject}

Puisez le langage visuel dans l'univers de la photo de fête, pas dans les tableaux de bord
SaaS :

- l'**appareil jetable** qui circule de table en table : un boîtier coloré et trapu, un
  gros déclencheur, une petite fenêtre qui compte les poses restantes ;
- le **tirage de labo** : bord blanc, date incrustée dans le coin, tirages
  empilés dans une pochette ;
- la **planche contact** où les organisateurs choisissent leurs préférées.

Utilisez-les comme structure, pas comme décoration : le compteur de poses *est* le quota
d'envoi, le bord blanc *est* la façon de montrer une photo envoyée, la planche contact *est*
la grille de modération. N'ajoutez ni textures skeuomorphiques, ni faux grain de film, ni
brillance plastique.

## Contraintes {#constraints}

- Interface claire sur un papier froid et neutre. Pas de crème (famille #F4F1EA), pas de
  fond de page presque noir (le mur en direct, montré sur un projecteur, est le seul
  écran noir).
- Chaque évènement a sa propre couleur d'accent, choisie par les organisateurs. Le design doit
  fonctionner avec n'importe laquelle : jaune, bleu marine, rose pâle. Calculez un texte lisible par-dessus
  au lieu de supposer du blanc.
- Deux polices au plus, toutes deux avec du caractère, aucune des habituelles par défaut
  (Inter, Geist, Roboto, un serif d'affichage très contrasté). Une linéale arrondie, un peu
  fantasque, colle au sujet : on doit se sentir à une fête, pas à la banque.
- Majuscule en début de phrase seulement, partout. Pas de libellés en capitales espacées, pas de libellés
  en chasse fixe, pas de surtitre au-dessus des titres sauf s'il apporte une information que le
  titre n'apporte pas.
- Pas de points médians pour relier les métadonnées, pas de flèches ajoutées aux boutons, pas d'emoji en
  guise d'illustration, pas de dégradés, pas de taches de couleur floutées, pas d'effets de verre.
- Des cartes uniquement là où le contenu est un objet séparable (un évènement, une photo). Les réglages
  sont un formulaire, pas une pile de cartes. Les arrondis suivent la hiérarchie : grands pour le boîtier
  de l'appareil, petits pour les champs, nuls pour les photos (les tirages ont des coins carrés).
- Un seul élément mémorable, tout le reste discret : le boîtier de l'appareil sur la page invité,
  avec son déclencheur et son compteur de poses.
- Du mouvement uniquement en réponse à une action : l'appui sur le déclencheur, un tirage qui glisse dans
  la bande une fois envoyé. Pas d'animation d'entrée au chargement.

## Page invité, de haut en bas {#guest-page-top-to-bottom}

1. Le nom de l'évènement, en grand, composé comme l'étiquette imprimée sur un appareil jetable.
   Sa date dans les petits caractères de la date incrustée d'un tirage.
2. Le boîtier de l'appareil à la couleur de l'évènement : le déclencheur, et le compteur de poses
   qui indique combien de photos restent (ou combien ont été envoyées quand
   il n'y a pas de limite).
3. En dessous, les tirages de l'invité lui-même, les plus récents d'abord, bords blancs, coins
   carrés, une marque « en attente » quand la modération est activée. Une ligne qui précise que seuls les organisateurs
   et l'invité peuvent les voir.

Les états d'erreur et les états vides donnent une direction en une phrase (« Envois fermés à
minuit. Merci pour les photos. »), jamais une excuse.

## Admin {#admin}

Calme et dense, comme le comptoir de commandes d'un labo : tableaux clairs, chiffres alignés, libellés
à côté des champs, action principale à la couleur de l'évènement seulement quand un évènement est en
contexte. L'onglet photos se lit comme une planche contact : grille serrée, sélection marquée par
un contour épais et un compteur, actions groupées dans une barre qui apparaît à la sélection.

## Textes {#copy}

Des verbes simples, les mots de l'utilisateur : « Prendre une photo », « Télécharger toutes les photos »,
« Fermer les envois ». Un bouton garde son nom tout au long du parcours (« Enregistrer le design » →
« Design enregistré »). Traduisez le sens, pas les mots, en français, en italien et en espagnol.

## Niveau de qualité minimal {#quality-floor}

Responsive dès 320 px, déclencheur à portée de pouce, focus clavier visible,
`prefers-reduced-motion` respecté, contraste de texte de 4.5:1, y compris sur la couleur de
l'évènement, cibles tactiles de 44 px sur la page invité.
