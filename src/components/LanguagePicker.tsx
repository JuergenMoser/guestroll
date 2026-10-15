"use client";

import { Check, ChevronDown, Languages, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { useT } from "@/components/I18nProvider";
import { cn } from "@/components/ui";
import { LOCALES, type Locale } from "@/lib/constants";
import { LOCALE_COOKIE, LOCALE_NAMES, localeDisplayName } from "@/lib/i18n/locale";

function rememberLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Per-browser language choice, kept in a cookie so the server renders it directly.
 * A listbox rather than a native select: each language under its own name, so a
 * guest who can't read the current one still finds theirs, with the name in the
 * current language beside it.
 */
export function LanguagePicker({ current, align = "end", className }: { current: Locale; align?: "start" | "end"; className?: string }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [up, setUp] = useState(false);
  const [pending, startTransition] = useTransition();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  function show() {
    // The guest page keeps the picker in its footer: near the bottom of the screen the list opens upwards.
    const rect = button.current?.getBoundingClientRect();
    const room = LOCALES.length * 52 + 16;
    setUp(!!rect && window.innerHeight - rect.bottom < room && rect.top > room);
    setActive(LOCALES.indexOf(current));
    setOpen(true);
  }

  function choose(locale: Locale) {
    setOpen(false);
    button.current?.focus();
    if (locale === current) return;
    rememberLocale(locale);
    startTransition(() => router.refresh());
  }

  function onListKey(e: KeyboardEvent) {
    const last = LOCALES.length - 1;
    const move: Record<string, number> = { ArrowDown: Math.min(active + 1, last), ArrowUp: Math.max(active - 1, 0), Home: 0, End: last };
    if (e.key in move) {
      e.preventDefault();
      setActive(move[e.key]);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(LOCALES[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      button.current?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    } else if (e.key.length === 1) {
      // From the next one on, so a second press reaches Español after English.
      const order = LOCALES.map((_, i) => (active + 1 + i) % LOCALES.length);
      const hit = order.find((i) => LOCALE_NAMES[LOCALES[i]].toLowerCase().startsWith(e.key.toLowerCase()));
      if (hit !== undefined) setActive(hit);
    }
  }

  return (
    <div ref={root} className={cn("relative inline-block", className)}>
      <button
        ref={button}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-label={`${t("common.language")}: ${LOCALE_NAMES[current]}`}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            show();
          }
        }}
        className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-ink ring-1 ring-line transition-colors hover:bg-sunken focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        {pending ? <LoaderCircle className="size-4 animate-spin text-ink-muted" aria-hidden /> : <Languages className="size-4 text-ink-muted" aria-hidden />}
        <span lang={current}>{LOCALE_NAMES[current]}</span>
        <ChevronDown className={cn("size-3.5 text-ink-muted transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <ul
          ref={list}
          id={`${id}-list`}
          role="listbox"
          tabIndex={-1}
          aria-label={t("common.language")}
          aria-activedescendant={`${id}-${LOCALES[active]}`}
          onKeyDown={onListKey}
          className={cn(
            "absolute z-50 w-56 rounded-lg bg-surface p-1 shadow-lg ring-1 ring-line focus:outline-none",
            up ? "bottom-full mb-1.5" : "top-full mt-1.5",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {LOCALES.map((locale, i) => {
            const selected = locale === current;
            const translated = localeDisplayName(locale, current);
            return (
              <li
                key={locale}
                id={`${id}-${locale}`}
                role="option"
                aria-selected={selected}
                lang={locale}
                onPointerEnter={() => setActive(i)}
                onClick={() => choose(locale)}
                className={cn("flex cursor-pointer items-center gap-3 rounded-md px-3 py-2", i === active && "bg-sunken")}
              >
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm text-ink", selected && "font-semibold")}>{LOCALE_NAMES[locale]}</span>
                  {!selected && translated && (
                    <span className="block text-xs text-ink-muted" lang={current}>
                      {translated}
                    </span>
                  )}
                </span>
                {selected && <Check className="size-4 shrink-0 text-ink" aria-hidden />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
