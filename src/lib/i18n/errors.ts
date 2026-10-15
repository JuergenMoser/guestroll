import type { Messages } from "./messages";
import type { MessageKey, Translate } from "./translate";

/** Turns an API error code into a sentence, falling back to the generic one for unknown codes. */
export function errorText(t: Translate, code: string | undefined): string {
  const key = `errors.${code ?? "generic"}`;
  const text = t(key as MessageKey);
  return text === key ? t("errors.generic") : text;
}

export type ErrorKey = keyof Messages["errors"];
