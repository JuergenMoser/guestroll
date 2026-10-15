import "server-only";
import { headers } from "next/headers";
import { config, type Locale } from "@/lib/config";
import { messages } from "./messages";
import { negotiateLocale } from "./negotiate";
import { createTranslator } from "./translate";

/** The visitor's browser language when supported, `DEFAULT_LOCALE` otherwise. */
export async function getLocale(): Promise<Locale> {
  return negotiateLocale((await headers()).get("accept-language"), config.locale);
}

export async function getMessages() {
  return messages[await getLocale()];
}

export async function getT() {
  return createTranslator(await getMessages());
}
