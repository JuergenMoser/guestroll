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
const page = (text: string, link: string) => existsSync(`${srcDir}${link.slice(1)}.md`) ? [{ text, link }] : []

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
    const head: [string, Record<string, string>, string?][] = [
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: pageDescription }],
      ['meta', { name: 'twitter:title', content: title }],
      ['meta', { name: 'twitter:description', content: pageDescription }],
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

    nav: [
      { text: 'Guide', link: '/getting-started', activeMatch: '^/(getting-started|admin-guide|customization)' },
      { text: 'Self-hosting', link: '/deployment', activeMatch: '^/(deployment|configuration|security)' },
      { text: 'Reference', link: '/api', activeMatch: '^/(api|architecture|development|design-prompt)' },
      {
        text: 'Links',
        items: [
          { text: 'Releases', link: `${repo}/releases` },
          { text: 'Docker Hub', link: 'https://hub.docker.com/r/achedon12/guestroll' },
          { text: 'Watch the tour', link: 'https://youtu.be/MEuvBB-wVI8' },
          { text: 'Report a bug', link: `${repo}/issues/new/choose` },
        ],
      },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          ...page('Getting started', '/getting-started'),
          ...page('Admin guide', '/admin-guide'),
          ...page('Customization', '/customization'),
        ],
      },
      {
        text: 'Self-hosting',
        items: [
          ...page('Deployment', '/deployment'),
          ...page('Configuration', '/configuration'),
          ...page('Security', '/security'),
        ],
      },
      {
        text: 'Reference',
        items: [
          ...page('HTTP API', '/api'),
          ...page('Architecture', '/architecture'),
          ...page('Development', '/development'),
          ...page('Design notes', '/design-prompt'),
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: repo },
      { icon: 'docker', link: 'https://hub.docker.com/r/achedon12/guestroll' },
      { icon: 'youtube', link: 'https://youtu.be/MEuvBB-wVI8' },
    ],

    // a released version's docs are not edited anymore
    editLink: archived ? undefined : {
      pattern: `${repo}/edit/develop/docs/:path`,
      text: 'Edit this page on GitHub',
    },

    // read by the version switcher and banner of theme/
    docsVersions: { version, latest, versions },

    search: { provider: 'local' },
    outline: { level: [2, 3] },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Achedon12',
    },
  },
})
