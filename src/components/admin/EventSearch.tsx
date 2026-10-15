"use client";

import { LoaderCircle, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { useT } from "@/components/I18nProvider";
import { Input } from "@/components/ui";

/**
 * Filters the list as you type: the URL holds the search, so a reload or a shared
 * link shows the same results, and the server renders only the matching page.
 */
export function EventSearch() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function apply(q: string) {
    const next = new URLSearchParams(params);
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");
    // A new search starts from its first page.
    next.delete("page");
    const query = next.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  function change(q: string) {
    setValue(q);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => apply(q), 250);
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        clearTimeout(timer.current);
        apply(value);
      }}
      className="relative w-full sm:max-w-xs"
    >
      {pending ? (
        <LoaderCircle className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 animate-spin text-ink-muted" aria-hidden />
      ) : (
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
      )}
      <Input
        type="search"
        name="q"
        value={value}
        onChange={(e) => change(e.target.value)}
        placeholder={t("admin.eventList.search")}
        aria-label={t("admin.eventList.search")}
        className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => change("")}
          aria-label={t("admin.eventList.clear")}
          className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded text-ink-muted hover:text-ink"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </form>
  );
}
