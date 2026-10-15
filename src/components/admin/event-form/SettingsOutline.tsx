"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { cn } from "@/components/ui";

/**
 * The settings tab's sections, to jump between them on a long page; the one on
 * screen is highlighted as you scroll.
 */
export function SettingsOutline({ sections }: { sections: { id: string; label: string; danger?: boolean }[] }) {
  const t = useT();
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        // The topmost section that's on screen, in page order.
        const first = sections.find((s) => (visible.get(s.id) ?? 0) > 0);
        if (first) setActive(first.id);
      },
      { rootMargin: "-80px 0px -55% 0px", threshold: [0, 0.01] },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label={t("admin.form.outline")} className="hidden md:block">
      <ul role="list" className="sticky top-24 space-y-0.5 border-l border-line">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              aria-current={active === s.id ? "location" : undefined}
              className={cn(
                "-ml-px block border-l-2 py-1.5 pl-4 text-sm transition-colors",
                active === s.id ? "border-ink font-medium text-ink" : "border-transparent text-ink-muted hover:text-ink",
                s.danger && "text-danger hover:text-danger",
              )}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
