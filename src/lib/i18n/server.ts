import "server-only";
import { config, type Locale } from "@/lib/config";
import { messages } from "./messages";
import { createTranslator } from "./translate";

export function getLocale(): Locale {
  return config.locale;
}

export function getMessages() {
  return messages[getLocale()];
}

export function getT() {
  return createTranslator(getMessages());
}
