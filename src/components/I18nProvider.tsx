"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Messages } from "@/lib/i18n/messages";
import { createTranslator, type Translate } from "@/lib/i18n/translate";

const I18nContext = createContext<Translate | null>(null);

export function I18nProvider({ messages, children }: { messages: Messages; children: ReactNode }) {
  const t = useMemo(() => createTranslator(messages), [messages]);
  return <I18nContext.Provider value={t}>{children}</I18nContext.Provider>;
}

export function useT(): Translate {
  const t = useContext(I18nContext);
  if (!t) throw new Error("useT() must be used inside <I18nProvider>");
  return t;
}
