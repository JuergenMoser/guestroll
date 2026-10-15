"use client";

import { useT } from "@/components/I18nProvider";
import type { MessageKey } from "@/lib/i18n/translate";
import { formatBytes, formatNumber } from "@/lib/format";
import type { Totals } from "@/lib/stats";

const TILES: { key: keyof Totals; label: MessageKey; bytes?: boolean }[] = [
  { key: "photos", label: "admin.photos" },
  { key: "guests", label: "admin.guests" },
  { key: "views", label: "admin.views" },
  { key: "downloads", label: "admin.downloads" },
  { key: "bytes", label: "admin.storage", bytes: true },
  { key: "pending", label: "admin.pending" },
];

export function StatGrid({ totals, locale }: { totals: Totals; locale: string }) {
  const t = useT();
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-ink-800 ring-1 ring-ink-800 sm:grid-cols-3 lg:grid-cols-6">
      {TILES.map(({ key, label, bytes }) => (
        <div key={key} className="bg-ink-900 p-4">
          <dt className="kicker">{t(label)}</dt>
          <dd className="mt-2 font-mono text-2xl tabular-nums text-paper">
            {bytes ? formatBytes(totals[key], locale) : formatNumber(totals[key] + (key === "downloads" ? totals.zips : 0), locale)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
