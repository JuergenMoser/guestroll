import type { Messages } from "./messages";

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<Messages>;
export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

/** Shared by the server helper and the client hook so both resolve keys identically. */
export function createTranslator(dict: Messages): Translate {
  return (key, vars) => {
    const value = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], dict);
    const text = typeof value === "string" ? value : key;
    return vars ? text.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`)) : text;
  };
}
