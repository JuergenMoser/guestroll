"use client";

import { Camera, ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { EventTheme } from "@/components/EventTheme";
import { useT } from "@/components/I18nProvider";
import { Badge } from "@/components/ui";
import type { EventSummary } from "@/lib/events";
import { formatBytes, formatNumber } from "@/lib/format";

export function EventList({ events, locale }: { events: EventSummary[]; locale: string }) {
  const t = useT();
  if (events.length === 0) {
    return <p className="rounded-2xl border border-dashed border-ink-700 py-16 text-center text-sm text-ink-400">{t("admin.noEvents")}</p>;
  }
  return (
    <ul role="list" className="divide-y divide-ink-800 overflow-hidden rounded-2xl bg-ink-900 ring-1 ring-ink-800">
      {events.map((event) => {
        const open = event.uploadsOpen && (event.uploadsCloseAt === null || event.uploadsCloseAt > Date.now());
        return (
          <li key={event.id}>
            <EventTheme color={event.accentColor}>
              <Link href={`/admin/events/${event.id}`} className="flex items-center gap-4 p-4 transition hover:bg-ink-800/60">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/15 ring-1 ring-accent/40">
                  <Camera className="size-4 text-accent" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">{event.name}</span>
                    {event.hasAccessCode && <Lock className="size-3.5 text-ink-400" aria-label={t("admin.form.accessCode")} />}
                  </span>
                  <span className="mt-0.5 block font-mono text-xs text-ink-400">
                    {formatNumber(event.photoCount, locale)} {t("admin.photos").toLowerCase()} · {formatBytes(event.bytes, locale)}
                    {event.eventDate ? ` · ${event.eventDate}` : ""}
                  </span>
                </span>
                {event.pendingCount > 0 && <Badge tone="accent">{event.pendingCount} {t("admin.pending").toLowerCase()}</Badge>}
                <Badge tone={open ? "ok" : "neutral"}>{open ? t("admin.open") : t("admin.closed")}</Badge>
                <ChevronRight className="size-4 text-ink-600" aria-hidden />
              </Link>
            </EventTheme>
          </li>
        );
      })}
    </ul>
  );
}
