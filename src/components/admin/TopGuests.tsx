"use client";

import { useT } from "@/components/I18nProvider";

export function TopGuests({ guests }: { guests: { name: string; photos: number }[] }) {
  const t = useT();
  const max = Math.max(1, ...guests.map((g) => g.photos));
  if (guests.length === 0) return <p className="text-sm text-ink-400">—</p>;
  return (
    <ol className="space-y-3">
      {guests.map((g, i) => (
        <li key={i} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="truncate text-paper">{g.name || t("admin.anonymous")}</span>
            <span className="font-mono tabular-nums text-ink-300">{g.photos}</span>
          </div>
          <div className="h-1 rounded-full bg-ink-800">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(g.photos / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
