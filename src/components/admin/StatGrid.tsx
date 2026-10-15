"use client";

import { useT } from "@/components/I18nProvider";
import { formatBytes, formatNumber } from "@/lib/format";
import type { MessageKey } from "@/lib/i18n/translate";
import type { Totals } from "@/lib/stats";

const TILES: { key: keyof Totals; label: MessageKey; bytes?: boolean }[] = [
  { key: "photos", label: "admin.photos" },
  { key: "guests", label: "admin.guests" },
  { key: "views", label: "admin.views" },
  { key: "downloads", label: "admin.downloads" },
  { key: "bytes", label: "admin.storage", bytes: true },
  { key: "pending", label: "admin.pending" },
];

/** A row of figures, the way a lab ticket lists them: number first, label under. */
export function StatGrid({ totals, locale }: { totals: Totals; locale: string }) {
  const t = useT();
  return (
    <dl className="grid grid-cols-2 border-y border-line sm:grid-cols-3 lg:grid-cols-6">
      {TILES.map(({ key, label, bytes }) => (
        <div key={key} className="flex flex-col-reverse gap-0.5 border-line py-4 pr-4 lg:border-r lg:pl-4 lg:first:pl-0 lg:last:border-r-0">
          <dt className="text-sm text-ink-muted">{t(label)}</dt>
          <dd className="text-3xl font-semibold tabular-nums tracking-tight">
            {bytes ? formatBytes(totals[key], locale) : formatNumber(totals[key] + (key === "downloads" ? totals.zips : 0), locale)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
