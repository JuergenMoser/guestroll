// Text of the theme's own components, by the page's language (`useData().lang`).
const STRINGS = {
  en: {
    next: 'You are reading the documentation of the next version of Guestroll, not released yet.',
    old: (v: string, latest: string) => `You are reading the documentation of Guestroll ${v}. The latest version is ${latest}.`,
    latestDocs: 'Latest docs', changes: 'What changed', changelog: 'Changelog',
    nextLabel: 'next (develop)', latestLabel: (v: string) => `${v} (latest)`, of: (v: string) => `Documentation of Guestroll ${v}`,
  },
  fr: {
    next: 'Vous lisez la documentation de la prochaine version de Guestroll, pas encore publiée.',
    old: (v: string, latest: string) => `Vous lisez la documentation de Guestroll ${v}. La dernière version est ${latest}.`,
    latestDocs: 'Dernière documentation', changes: 'Ce qui a changé', changelog: 'Journal des modifications',
    nextLabel: 'next (develop)', latestLabel: (v: string) => `${v} (dernière)`, of: (v: string) => `Documentation de Guestroll ${v}`,
  },
  it: {
    next: 'Stai leggendo la documentazione della prossima versione di Guestroll, non ancora pubblicata.',
    old: (v: string, latest: string) => `Stai leggendo la documentazione di Guestroll ${v}. L'ultima versione è ${latest}.`,
    latestDocs: 'Documentazione più recente', changes: 'Cosa è cambiato', changelog: 'Registro delle modifiche',
    nextLabel: 'next (develop)', latestLabel: (v: string) => `${v} (ultima)`, of: (v: string) => `Documentazione di Guestroll ${v}`,
  },
  es: {
    next: 'Estás leyendo la documentación de la próxima versión de Guestroll, aún no publicada.',
    old: (v: string, latest: string) => `Estás leyendo la documentación de Guestroll ${v}. La última versión es ${latest}.`,
    latestDocs: 'Documentación más reciente', changes: 'Qué ha cambiado', changelog: 'Registro de cambios',
    nextLabel: 'next (develop)', latestLabel: (v: string) => `${v} (última)`, of: (v: string) => `Documentación de Guestroll ${v}`,
  },
}

export type Lang = keyof typeof STRINGS

export function langOf(lang: string): Lang {
  const code = lang.slice(0, 2) as Lang
  return code in STRINGS ? code : 'en'
}

export const strings = (lang: string) => STRINGS[langOf(lang)]

/** The language's folder under a version's base: '' for English, 'fr/' for French. */
export const langDir = (lang: string) => (langOf(lang) === 'en' ? '' : `${langOf(lang)}/`)
