"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { accentStyle } from "@/components/EventTheme";
import { useT } from "@/components/I18nProvider";
import { Badge } from "@/components/ui";
import type { EventSummary } from "@/lib/events";
import { formatBytes, formatNumber } from "@/lib/format";

export function EventList({ events, locale }: { events: EventSummary[]; locale: string }) {
  const t = useT();
  if (events.length === 0) {
    return <p className="border-2 border-dashed border-line-2 px-4 py-12 text-center text-ink-muted">{t("admin.noEvents")}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl bg-surface ring-1 ring-line">
      <table className="w-full min-w-[36rem] text-left text-[15px]">
        <thead className="border-b border-line text-sm text-ink-muted">
          <tr>
            <th scope="col" className="py-2.5 pr-3 pl-4 font-medium">{t("admin.form.name")}</th>
            <th scope="col" className="px-3 py-2.5 font-medium">{t("admin.form.date")}</th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">{t("admin.photos")}</th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">{t("admin.storage")}</th>
            <th scope="col" className="py-2.5 pr-4 pl-3 font-medium"><span className="sr-only">Status</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {events.map((event) => (
              <tr key={event.id} style={accentStyle(event.accentColor)} className="relative transition-colors hover:bg-sunken/60">
                <td className="py-3 pr-3 pl-4">
                  <Link href={`/admin/events/${event.id}`} className="flex items-center gap-3 font-semibold after:absolute after:inset-0">
                    <span className="size-3 shrink-0 rounded-full bg-accent ring-1 ring-black/10" aria-hidden />
                    {event.name}
                    {event.hasAccessCode && <Lock className="size-3.5 text-ink-muted" aria-label={t("admin.form.accessCode")} />}
                  </Link>
                </td>
                <td className="px-3 py-3 tabular-nums text-ink-soft">{event.eventDate ?? ""}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatNumber(event.photoCount, locale)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-ink-soft">{formatBytes(event.bytes, locale)}</td>
                <td className="py-3 pr-4 pl-3">
                  <span className="flex justify-end gap-1.5">
                    {event.pendingCount > 0 && (
                      <Badge tone="accent">
                        {event.pendingCount} {t("admin.pending").toLowerCase()}
                      </Badge>
                    )}
                    <Badge tone={event.acceptingUploads ? "ok" : "neutral"}>{event.acceptingUploads ? t("admin.open") : t("admin.closed")}</Badge>
                  </span>
                </td>
              </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
