"use client";

import { Bell, Database, Gauge, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useT } from "@/components/I18nProvider";
import { cn } from "@/components/ui";
import type { MessageKey } from "@/lib/i18n/translate";

export type SettingsArea = "account" | "team" | "notifications" | "data" | "system";

const AREAS: { key: SettingsArea; icon: typeof Bell; owner: boolean }[] = [
  { key: "account", icon: UserRound, owner: false },
  { key: "team", icon: Users, owner: true },
  { key: "notifications", icon: Bell, owner: true },
  { key: "data", icon: Database, owner: true },
  { key: "system", icon: Gauge, owner: true },
];

/** Each area with what needs attention in it, so the owner sees it before opening it. */
export function SettingsNav({ owner, attention }: { owner: boolean; attention: Partial<Record<SettingsArea, { text: string; tone: "warn" | "info" }>> }) {
  const t = useT();
  const pathname = usePathname();
  const areas = AREAS.filter((a) => owner || !a.owner);
  const activeRef = useRef<HTMLAnchorElement>(null);
  // On a phone the areas are a row that scrolls sideways: the current one must not sit off screen.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);
  return (
    <nav aria-label={t("admin.settings")} className="-mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
      <ul role="list" className="flex gap-1 md:flex-col">
        {areas.map(({ key, icon: Icon }) => {
          const active = pathname.endsWith(`/settings/${key}`);
          const note = attention[key];
          return (
            <li key={key} className="shrink-0">
              <Link
                ref={active ? activeRef : undefined}
                href={`/admin/settings/${key}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors",
                  active ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-ink-soft hover:bg-surface/60 hover:text-ink",
                )}
              >
                <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[15px] font-medium whitespace-nowrap">{t(`admin.settingsNav.${key}` as MessageKey)}</span>
                  {note && (
                    <span className={cn("mt-0.5 hidden items-center gap-1.5 text-xs md:flex", note.tone === "warn" ? "text-danger" : "text-ink-muted")}>
                      <span className={cn("size-1.5 rounded-full", note.tone === "warn" ? "bg-danger" : "bg-accent")} aria-hidden />
                      {note.text}
                    </span>
                  )}
                </span>
                {note && <span className={cn("mt-1.5 size-2 shrink-0 rounded-full md:hidden", note.tone === "warn" ? "bg-danger" : "bg-accent")} aria-label={note.text} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
