"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useT } from "@/components/I18nProvider";
import { cn } from "@/components/ui";
import { THEME_COOKIE, THEMES, type Theme } from "@/lib/theme/theme";

const ICONS = { system: Monitor, light: Sun, dark: Moon };

function applyTheme(theme: Theme) {
  if (theme === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.dataset.theme = theme;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Writes the choice to a cookie (read by the root layout on the next request,
 * so the page is rendered in the right theme with no flash) and applies it now.
 */
export function ThemeToggle({ initial, className }: { initial: Theme; className?: string }) {
  const t = useT();
  const [theme, setTheme] = useState(initial);

  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div role="radiogroup" aria-label={t("common.theme")} className={cn("inline-flex rounded-md p-0.5 ring-1 ring-line", className)}>
      {THEMES.map((option) => {
        const Icon = ICONS[option];
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={theme === option}
            aria-label={t(`common.themes.${option}`)}
            title={t(`common.themes.${option}`)}
            onClick={() => choose(option)}
            className={cn("grid size-7 place-items-center rounded transition-colors", theme === option ? "bg-sunken text-ink" : "text-ink-muted hover:text-ink")}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
