# Développement

## Lancer en local {#run-locally}

```bash
git clone https://github.com/achedon12/guestroll && cd guestroll
nvm use            # Node 22, voir .nvmrc
npm ci
echo "ADMIN_PASSWORD=dev-password-123" > .env.local
npm run dev        # http://localhost:3000
```

Remplissez-le d'évènements et de photos de démo (par l'API publique, dans un autre
terminal) :

```bash
BASE_URL=http://localhost:3000 ADMIN_PASSWORD=dev-password-123 npm run seed:demo
```

Pour essayer l'appareil photo sur un vrai téléphone, la page doit être en HTTPS. Le plus rapide est
un tunnel (`cloudflared tunnel --url http://localhost:3000`) ou
`next dev --experimental-https` sur votre réseau local.

## Vérifications {#checks}

```bash
npm run lint
npm run typecheck      # génère d'abord les types de routes de Next
npm test               # unitaires + intégration (Vitest)
npm run test:coverage  # la même chose, avec un rapport de couverture dans coverage/
npm run build
npm run test:e2e       # tests fonctionnels sur le build de production (Playwright)
```

`npm run test:e2e` démarre le build de production sur le port 3210 avec un dossier de données
temporaire : il ne touche jamais à vos données. En local, il utilise votre Chrome
installé ; en CI, le Chromium installé par `npx playwright install`.

### Trois niveaux de tests {#three-layers-of-tests}

| Niveau | Où | Contre quoi il tourne |
|---|---|---|
| Unitaire | `tests/unit/` | Modules purs : politique d'accès, validation, limiteur de débit, rendu des QR codes… |
| Intégration | `tests/integration/` | Un vrai SQLite dans un dossier temporaire, de vraies images passées par sharp, de vrais ZIP, des QR codes décodés par ZXing |
| Fonctionnel | `tests/e2e/api/` | L'API HTTP d'un build de production en marche : scénarios invité et admin, sécurité, quotas |
| Navigateur | `tests/e2e/browser/` | De vrais parcours : un invité sur un téléphone, un admin sur un ordinateur |

Fichiers du niveau unitaire :

| Fichier | Ce qu'il verrouille |
|---|---|
| `policy.test.ts` | Chaque règle d'accès : qui voit quelle photo, dans quelle taille |
| `routeGuards.test.ts` | Chaque page et route d'admin vérifie la session ; chaque modification côté invité vérifie l'origine |
| `qrScan.test.ts` | Chaque préréglage et forme de QR code est rendu puis décodé avec ZXing |
| `qr.test.ts` | Analyse du style, échappement, dégagement de la zone du logo |
| `request.test.ts` | Règles d'IP client et d'origine, plafond du corps en streaming |
| `rateLimit.test.ts`, `validation.test.ts`, `ids.test.ts`, `negotiate.test.ts`, `translate.test.ts` | Le reste des modules purs |

## Branches et CI {#branches-and-ci}

`develop` est la branche par défaut, où arrivent les pull requests ; `main` est
la production. Chaque changement sur l'une ou l'autre branche lance :

| Workflow | Ce qu'il fait |
|---|---|
| Quality | Lint, types, build de production |
| Tests | Vitest avec couverture, puis Playwright sur un build de production |
| Security | CodeQL (code et workflows) et `npm audit` sur les dépendances de production, plus une exécution hebdomadaire |
| Docker image | Construit l'image, la lance sur un port et un utilisateur personnalisés, envoie une photo de bout en bout, puis **teste la mise à jour** : la dernière version remplit un dossier de données et la nouvelle image doit démarrer dessus avec chaque évènement et chaque photo intacts |
| Workflows | actionlint et zizmor sur `.github/` |

**Publish to production** (manuel) avance `main` jusqu'à `develop` en fast-forward une fois
Quality et Tests passés sur `develop` ; **Align develop** ramène sur `develop` tout ce qui arrive sur
`main`. Poser le tag `vX.Y.Z` sur `main` lance **Release** : l'image
multi-architecture sur GHCR (et Docker Hub quand ses secrets sont définis) et une
release GitHub avec des notes générées. **Docs** construit le site et le wiki à partir de
`docs/` (voir plus bas) quand `develop` les modifie et quand une version est taguée.

## Mises à jour {#upgrades}

`tests/integration/upgrade.test.ts` reconstruit la base de données de chaque version à partir
des migrations qu'elle livrait, la remplit comme le faisait cette version, et l'ouvre avec
le code actuel. Quand une version ajoute des migrations, ajoutez-la à `SHIPPED_MIGRATIONS`.
Ne modifiez jamais une migration une fois publiée : des instances l'ont déjà appliquée.

## Publier une version {#releasing}

1. Déplacez les entrées **Unreleased** de `CHANGELOG.md` sous un nouveau titre
   `## [X.Y.Z] - date`, avec une liste **Upgrading** quand quelque chose
   demande l'attention de l'admin, et mettez à jour les liens de comparaison en bas.
2. Augmentez `version` dans `package.json`, poussez sur `develop`, attendez les vérifications.
3. Lancez **Publish to production**, puis posez le tag `vX.Y.Z` sur `main`.

Les notes de version sont cette section du changelog (la release échoue sans
elle), et la page de mise à jour de l'admin la montre à tous ceux qui utilisent une version
plus ancienne.

## Site de documentation {#documentation-website}

`docs/` est à la fois la documentation lue sur GitHub et la source du site
(VitePress) et du wiki. Écrivez le Markdown là, et nulle part ailleurs : le wiki est
régénéré par le workflow **Docs**, les modifications faites dessus sont perdues.

```bash
cd docs
npm install
npm run dev        # http://localhost:5173/guestroll/
```

`.github/scripts/build-docs.py` construit la documentation de chaque version (la plus récente à la
racine, `develop` sous `/next/` dès qu'elle diffère, les plus anciennes sous `/vX.Y.Z/`),
avec la configuration et le thème actuels pour qu'elles partagent toutes le sélecteur de version.
`.github/scripts/build-wiki.py` fait de même pour le wiki, avec une page par
version sous `vX.Y.Z-Page`. Les liens vers des fichiers hors de `docs/` (comme
`../SECURITY.md`) pointent vers GitHub sur le site.

Entretien : Dependabot (groupé, une semaine de délai), issues inactives, un message
d'accueil sur les premières pull requests, un label « merge conflict », et les pull requests remises
en brouillon quand des changements sont demandés.

## Changements de base de données {#database-changes}

Modifiez `src/lib/db/schema.ts`, puis :

```bash
npm run db:generate -- --name short_description
```

Committez le dossier généré sous `drizzle/`. Les migrations s'exécutent automatiquement au
démarrage. Ne modifiez jamais une migration déjà publiée.

## Conventions {#conventions}

- TypeScript strict, ESM, l'alias `@/` pour `src/`.
- Les règles d'accès vont dans `lib/policy.ts`, avec un test. Les routes restent minces.
- Le texte de l'interface va dans `lib/i18n/messages.ts`, dans les quatre langues.
- Les couleurs passent uniquement par les tokens de `globals.css` (`bg-surface`,
  `text-ink-muted`…), pour que les deux thèmes continuent de fonctionner.
- Les commentaires expliquent le *pourquoi*, pas le *quoi*.
- Les commits suivent les [Conventional Commits](https://www.conventionalcommits.org).

La direction visuelle est décrite dans [design-prompt.md](design-prompt.md) :
lisez-la avant de modifier l'interface.
