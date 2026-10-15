import { LOCALES, type Locale } from "@/lib/constants";

export const LOCALE_COOKIE = "gr_locale";

/** Each language in its own name, for the language picker. */
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", fr: "Français", it: "Italiano", es: "Español" };

export function parseLocale(value: string | undefined | null): Locale | null {
  return value && (LOCALES as readonly string[]).includes(value) ? (value as Locale) : null;
}
