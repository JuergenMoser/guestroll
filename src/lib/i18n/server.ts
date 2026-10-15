import "server-only";
import { cookies, headers } from "next/headers";
import { config, type Locale } from "@/lib/config";
import { LOCALE_COOKIE, parseLocale } from "./locale";
import { messages } from "./messages";
import { negotiateLocale } from "./negotiate";
import { createTranslator } from "./translate";

/**
 * Priority: the language this visitor picked (cookie), then the album's
 * default when there is one, then the browser's language (unless
 * DETECT_BROWSER_LOCALE=false), then DEFAULT_LOCALE.
 */
export async function getLocale(eventDefault?: Locale | null): Promise<Locale> {
  const chosen = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  if (chosen) return chosen;
  if (eventDefault) return eventDefault;
  if (!config.detectBrowserLocale) return config.locale;
  return negotiateLocale((await headers()).get("accept-language"), config.locale);
}

/** Whether the visitor picked a language themselves (the picker shows it as selected). */
export async function getChosenLocale(): Promise<Locale | null> {
  return parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}

export async function getMessages(eventDefault?: Locale | null) {
  return messages[await getLocale(eventDefault)];
}

export async function getT(eventDefault?: Locale | null) {
  return createTranslator(await getMessages(eventDefault));
}
