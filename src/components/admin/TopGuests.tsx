"use client";

import { useT } from "@/components/I18nProvider";

export function TopGuests({ guests }: { guests: { name: string; photos: number }[] }) {
  const t = useT();
  const max = Math.max(1, ...guests.map((g) => g.photos));
  if (guests.length === 0) return <p className="text-sm text-ink-muted">—</p>;
  return (
    <ol className="space-y-3">
      {guests.map((g, i) => (
        <li key={i} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="truncate text-ink">{g.name || t("admin.anonymous")}</span>
            <span className="font-medium tabular-nums text-ink-soft">{g.photos}</span>
          </div>
          <div className="h-1.5 rounded-sm bg-sunken">
            <div className="h-full rounded-sm bg-ink" style={{ width: `${(g.photos / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
