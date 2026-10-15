"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/I18nProvider";
import { cn } from "@/components/ui";
import { LOCALES, type Locale } from "@/lib/constants";
import { LOCALE_COOKIE, LOCALE_NAMES } from "@/lib/i18n/locale";

/** Per-browser language choice, kept in a cookie so the server renders it directly. */
export function LanguagePicker({ current, className }: { current: Locale; className?: string }) {
  const t = useT();
  const router = useRouter();
  return (
    <label className={cn("relative inline-flex h-8 items-center gap-1.5 rounded-md pr-2 pl-2 text-sm text-ink-muted ring-1 ring-line hover:text-ink", className)}>
      <Languages className="size-4" aria-hidden />
      <span className="sr-only">{t("common.language")}</span>
      <select
        value={current}
        onChange={(e) => {
          document.cookie = `${LOCALE_COOKIE}=${e.target.value}; path=/; max-age=31536000; samesite=lax`;
          router.refresh();
        }}
        className="cursor-pointer appearance-none bg-transparent pr-1 text-ink focus:outline-none"
      >
        {LOCALES.map((locale) => (
          <option key={locale} value={locale} lang={locale}>
            {LOCALE_NAMES[locale]}
          </option>
        ))}
      </select>
    </label>
  );
}
