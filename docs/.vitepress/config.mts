import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'

const site = 'https://achedon12.github.io/guestroll/'
const repo = 'https://github.com/achedon12/guestroll'
const description = "Self-hosted QR-code photo sharing for weddings and parties: guests scan, the camera opens, every photo lands in the hosts' private album."

// One build per version of the docs, made by .github/scripts/build-docs.py: the latest release
// at the root, develop under /next/, older releases under /vX.Y.Z/. Without these variables
// (npm run dev), it builds the working copy at the root.
const version = process.env.GUESTROLL_DOCS_VERSION ?? 'next'
const latest = process.env.GUESTROLL_DOCS_LATEST ?? version
const base = process.env.GUESTROLL_DOCS_BASE ?? '/guestroll/'
const versions: { version: string, base: string }[] = JSON.parse(process.env.GUESTROLL_DOCS_VERSIONS ?? '[]')
// archived releases are built from their own docs/, links included, as they were released
const archived = process.env.GUESTROLL_DOCS_ARCHIVED === '1'
// the git ref links to the rest of the repository point at
const ref = version === 'next' ? 'develop' : version
const isLatest = version === latest

const srcDir = fileURLToPath(new URL('..', import.meta.url))

// The languages of the app. English sits at the root, the others under their code, each
// only when its folder exists: archived releases are built from their own docs/, from
// before the translations.
const LANGS = {
  en: { label: 'English', lang: 'en-US' },
  fr: { label: 'Français', lang: 'fr-FR' },
  it: { label: 'Italiano', lang: 'it-IT' },
  es: { label: 'Español', lang: 'es-ES' },
} as const
type Lang = keyof typeof LANGS
const translated = (Object.keys(LANGS) as Lang[]).filter((l) => l !== 'en' && existsSync(`${srcDir}${l}/index.md`))
const prefix = (l: Lang) => (l === 'en' ? '/' : `/${l}/`)

const STRINGS: Record<Lang, Record<string, string>> = {
  en: {
    description,
    guide: 'Guide', selfHosting: 'Self-hosting', reference: 'Reference', links: 'Links',
    changelog: 'Changelog', releases: 'Releases', tour: 'Watch the tour', bug: 'Report a bug',
    gettingStarted: 'Getting started', adminGuide: 'Admin guide', customization: 'Customization',
    deployment: 'Deployment', configuration: 'Configuration', security: 'Security',
    api: 'HTTP API', architecture: 'Architecture', development: 'Development', design: 'Design notes',
    edit: 'Edit this page on GitHub', license: 'Released under the MIT License.',
    outline: 'On this page', prev: 'Previous page', next: 'Next page', updated: 'Last updated',
    top: 'Return to top', menu: 'Menu', theme: 'Appearance', light: 'Switch to light theme', dark: 'Switch to dark theme', language: 'Change language',
  },
  fr: {
    description: "Partage de photos par QR code, auto-hébergé, pour mariages et fêtes : les invités scannent, l'appareil photo s'ouvre, chaque photo arrive dans l'album privé des organisateurs.",
    guide: 'Guide', selfHosting: 'Auto-hébergement', reference: 'Référence', links: 'Liens',
    changelog: 'Journal des modifications', releases: 'Versions', tour: 'Voir la visite guidée', bug: 'Signaler un bug',
    gettingStarted: 'Premiers pas', adminGuide: "Guide d'administration", customization: 'Personnalisation',
    deployment: 'Déploiement', configuration: 'Configuration', security: 'Sécurité',
    api: 'API HTTP', architecture: 'Architecture', development: 'Développement', design: 'Notes de design',
    edit: 'Modifier cette page sur GitHub', license: 'Publié sous licence MIT.',
    outline: 'Sur cette page', prev: 'Page précédente', next: 'Page suivante', updated: 'Mis à jour le',
    top: 'Retour en haut', menu: 'Menu', theme: 'Apparence', light: 'Passer au thème clair', dark: 'Passer au thème sombre', language: 'Changer de langue',
  },
  it: {
    description: "Condivisione di foto con codice QR, self-hosted, per matrimoni e feste: gli invitati scansionano, si apre la fotocamera, ogni foto arriva nell'album privato degli organizzatori.",
    guide: 'Guida', selfHosting: 'Self-hosting', reference: 'Riferimento', links: 'Link',
    changelog: 'Registro delle modifiche', releases: 'Versioni', tour: 'Guarda il tour', bug: 'Segnala un bug',
    gettingStarted: 'Per iniziare', adminGuide: 'Guida di amministrazione', customization: 'Personalizzazione',
    deployment: 'Installazione', configuration: 'Configurazione', security: 'Sicurezza',
    api: 'API HTTP', architecture: 'Architettura', development: 'Sviluppo', design: 'Note di design',
    edit: 'Modifica questa pagina su GitHub', license: 'Rilasciato con licenza MIT.',
    outline: 'In questa pagina', prev: 'Pagina precedente', next: 'Pagina successiva', updated: 'Ultimo aggiornamento',
    top: "Torna all'inizio", menu: 'Menu', theme: 'Aspetto', light: 'Passa al tema chiaro', dark: 'Passa al tema scuro', language: 'Cambia lingua',
  },
  es: {
    description: 'Fotos compartidas con código QR, autoalojadas, para bodas y fiestas: los invitados escanean, se abre la cámara y cada foto llega al álbum privado de los anfitriones.',
    guide: 'Guía', selfHosting: 'Autoalojamiento', reference: 'Referencia', links: 'Enlaces',
    changelog: 'Registro de cambios', releases: 'Versiones', tour: 'Ver el recorrido', bug: 'Informar de un error',
    gettingStarted: 'Primeros pasos', adminGuide: 'Guía de administración', customization: 'Personalización',
    deployment: 'Despliegue', configuration: 'Configuración', security: 'Seguridad',
    api: 'API HTTP', architecture: 'Arquitectura', development: 'Desarrollo', design: 'Notas de diseño',
    edit: 'Editar esta página en GitHub', license: 'Publicado bajo la licencia MIT.',
    outline: 'En esta página', prev: 'Página anterior', next: 'Página siguiente', updated: 'Última actualización',
    top: 'Volver arriba', menu: 'Menú', theme: 'Apariencia', light: 'Cambiar al tema claro', dark: 'Cambiar al tema oscuro', language: 'Cambiar de idioma',
  },
}

function themeFor(l: Lang) {
  const t = STRINGS[l]
  const p = prefix(l)
  const dir = l === 'en' ? '' : `${l}/`
  const page = (text: string, slug: string) => existsSync(`${srcDir}${dir}${slug}.md`) ? [{ text, link: `${p}${slug}` }] : []
  const active = (pages: string) => `^${p}(${pages})`
  return {
    nav: [
      { text: t.guide, link: `${p}getting-started`, activeMatch: active('getting-started|admin-guide|customization') },
      { text: t.selfHosting, link: `${p}deployment`, activeMatch: active('deployment|configuration|security') },
      { text: t.reference, link: `${p}api`, activeMatch: active('api|architecture|development|design-prompt') },
      {
        text: t.links,
        items: [
          { text: t.changelog, link: `${repo}/blob/develop/CHANGELOG.md` },
          { text: t.releases, link: `${repo}/releases` },
          { text: 'Docker Hub', link: 'https://hub.docker.com/r/achedon12/guestroll' },
          { text: t.tour, link: 'https://youtu.be/MEuvBB-wVI8' },
          { text: t.bug, link: `${repo}/issues/new/choose` },
        ],
      },
    ],
    sidebar: [
      { text: t.guide, items: [...page(t.gettingStarted, 'getting-started'), ...page(t.adminGuide, 'admin-guide'), ...page(t.customization, 'customization')] },
      { text: t.selfHosting, items: [...page(t.deployment, 'deployment'), ...page(t.configuration, 'configuration'), ...page(t.security, 'security')] },
      {
        text: t.reference,
        items: [...page(t.api, 'api'), ...page(t.architecture, 'architecture'), ...page(t.development, 'development'), ...page(t.design, 'design-prompt')],
      },
    ],
    // a released version's docs are not edited anymore
    editLink: archived ? undefined : { pattern: `${repo}/edit/develop/docs/:path`, text: t.edit },
    outline: { level: [2, 3] as [number, number], label: t.outline },
    docFooter: { prev: t.prev, next: t.next },
    lastUpdated: { text: t.updated },
    returnToTopLabel: t.top,
    sidebarMenuLabel: t.menu,
    darkModeSwitchLabel: t.theme,
    lightModeSwitchTitle: t.light,
    darkModeSwitchTitle: t.dark,
    langMenuLabel: t.language,
    footer: { message: t.license, copyright: 'Copyright © 2026 Achedon12' },
  }
}

export default defineConfig({
  title: 'Guestroll',
  titleTemplate: ':title · Guestroll',
  description,
  base,
  lang: 'en-US',
  cleanUrls: true,
  lastUpdated: !archived,
  ignoreDeadLinks: archived,
  srcExclude: ['README.md', 'docker-hub.md', 'node_modules/**'],
  sitemap: isLatest ? { hostname: site } : undefined,

  // An inline (empty) PostCSS config: otherwise Vite climbs to the app's postcss.config.mjs,
  // whose Tailwind plugin isn't installed for the docs.
  vite: { css: { postcss: {} } },

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` }],
    ['meta', { name: 'theme-color', content: '#ffc72c' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,400..800&display=swap' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Guestroll' }],
    ['meta', { property: 'og:image', content: site + 'og.png' }],
    ['meta', { property: 'og:image:alt', content: "Guestroll: every guest's photos, in one place" }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: site + 'og.png' }],
  ],

  transformHead({ pageData, title, description: pageDescription }) {
    const path = pageData.relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
    const url = site + path
    // The same page in every language, so search engines send each reader to theirs.
    const lang = (translated as string[]).find((l) => path === l || path.startsWith(`${l}/`))
    const bare = lang ? path.slice(lang.length).replace(/^\//, '') : path
    const alternates = (['en', ...translated] as Lang[])
      .filter((l) => existsSync(`${srcDir}${l === 'en' ? '' : `${l}/`}${bare === '' ? 'index' : bare}.md`))
      .map((l): [string, Record<string, string>] => ['link', { rel: 'alternate', hreflang: l, href: site + (l === 'en' ? '' : `${l}/`) + bare }])
    const head: [string, Record<string, string>, string?][] = [
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: pageDescription }],
      ['meta', { name: 'twitter:title', content: title }],
      ['meta', { name: 'twitter:description', content: pageDescription }],
      ...alternates,
    ]
    if (path === '') {
      head.push(['script', { type: 'application/ld+json' }, JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Guestroll',
        description,
        url: site,
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Docker (linux/amd64, linux/arm64)',
        license: 'https://opensource.org/licenses/MIT',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        author: { '@type': 'Person', name: 'Achedon12', url: 'https://github.com/achedon12' },
      })])
    }
    return head
  },

  markdown: {
    theme: { light: 'github-light', dark: 'github-dark' },
    // The docs also read on GitHub, where `../SECURITY.md` is a file of the repository:
    // on the website those links point at GitHub, at this version's ref.
    config(md) {
      const render = md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
      md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
        const href = tokens[idx].attrGet('href')
        if (href?.startsWith('../')) {
          tokens[idx].attrSet('href', `${repo}/blob/${ref}/${href.replace(/^(\.\.\/)+/, '')}`)
          tokens[idx].attrSet('target', '_blank')
        }
        return render(tokens, idx, options, env, self)
      }
    },
  },

  themeConfig: {
    logo: { src: '/logo.svg', alt: '' },
    siteTitle: 'Guestroll',

    socialLinks: [
      { icon: 'github', link: repo },
      { icon: 'docker', link: 'https://hub.docker.com/r/achedon12/guestroll' },
      { icon: 'youtube', link: 'https://youtu.be/MEuvBB-wVI8' },
    ],

    // read by the version switcher and banner of theme/
    docsVersions: { version, latest, versions },

    ...themeFor('en'),

    search: {
      provider: 'local',
      options: {
        locales: {
          fr: { translations: { button: { buttonText: 'Rechercher', buttonAriaLabel: 'Rechercher' }, modal: { noResultsText: 'Aucun résultat pour', resetButtonTitle: 'Effacer la recherche', footer: { selectText: 'choisir', navigateText: 'naviguer', closeText: 'fermer' } } } },
          it: { translations: { button: { buttonText: 'Cerca', buttonAriaLabel: 'Cerca' }, modal: { noResultsText: 'Nessun risultato per', resetButtonTitle: 'Cancella la ricerca', footer: { selectText: 'scegli', navigateText: 'naviga', closeText: 'chiudi' } } } },
          es: { translations: { button: { buttonText: 'Buscar', buttonAriaLabel: 'Buscar' }, modal: { noResultsText: 'No hay resultados para', resetButtonTitle: 'Borrar la búsqueda', footer: { selectText: 'elegir', navigateText: 'navegar', closeText: 'cerrar' } } } },
        },
      },
    },
  },

  locales: {
    root: { label: LANGS.en.label, lang: LANGS.en.lang },
    ...Object.fromEntries(
      translated.map((l) => [l, { label: LANGS[l].label, lang: LANGS[l].lang, link: `/${l}/`, description: STRINGS[l].description, themeConfig: themeFor(l) }]),
    ),
  },
})
