"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "@/lib/constants";
import type { Messages } from "@/lib/i18n/messages";
import { createTranslator, type Translate } from "@/lib/i18n/translate";

const I18nContext = createContext<{ t: Translate; locale: Locale } | null>(null);

export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: ReactNode }) {
  const value = useMemo(() => ({ t: createTranslator(messages), locale }), [messages, locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): Translate {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT() must be used inside <I18nProvider>");
  return ctx.t;
}

export function useLocale(): Locale {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useLocale() must be used inside <I18nProvider>");
  return ctx.locale;
}
