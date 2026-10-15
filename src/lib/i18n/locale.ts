import { LOCALES, type Locale } from "@/lib/constants";

export const LOCALE_COOKIE = "gr_locale";

/** Each language in its own name, for the language picker. */
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", fr: "Français", it: "Italiano", es: "Español" };

export function parseLocale(value: string | undefined | null): Locale | null {
  return value && (LOCALES as readonly string[]).includes(value) ? (value as Locale) : null;
}

// A fixed table rather than Intl.DisplayNames: Node's ICU and the browser's can
// word it differently, and the server-rendered select would then not hydrate.
const NAMES_IN: Record<Locale, Record<Locale, string>> = {
  en: { en: "English", fr: "French", it: "Italian", es: "Spanish" },
  fr: { en: "anglais", fr: "français", it: "italien", es: "espagnol" },
  it: { en: "inglese", fr: "francese", it: "italiano", es: "spagnolo" },
  es: { en: "inglés", fr: "francés", it: "italiano", es: "español" },
};

/** `locale`'s name written in `inLocale` ("italien" for it in fr). */
export function localeDisplayName(locale: Locale, inLocale: Locale): string {
  return NAMES_IN[inLocale][locale];
}

/** "Italiano (italien)": findable by whoever speaks it, readable by whoever doesn't. */
export function localeOptionLabel(locale: Locale, inLocale: Locale): string {
  return locale === inLocale ? LOCALE_NAMES[locale] : `${LOCALE_NAMES[locale]} (${localeDisplayName(locale, inLocale)})`;
}
