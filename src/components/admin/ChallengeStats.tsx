"use client";

import type { Challenge } from "@/lib/challenges";

/** Photos per challenge, in the order the hosts wrote them; the ones nobody did yet show at zero. */
export function ChallengeStats({ challenges, counts }: { challenges: Challenge[]; counts: { id: string; photos: number }[] }) {
  const byId = new Map(counts.map((c) => [c.id, c.photos]));
  const max = Math.max(1, ...counts.map((c) => c.photos));
  return (
    <ol className="space-y-3">
      {challenges.map((c) => {
        const n = byId.get(c.id) ?? 0;
        return (
          <li key={c.id} className="space-y-1">
            <div className="flex justify-between gap-3 text-sm">
              <span className="truncate text-ink">{c.label}</span>
              <span className="font-medium tabular-nums text-ink-soft">{n}</span>
            </div>
            <div className="h-1.5 rounded-sm bg-sunken">
              <div className="h-full rounded-sm bg-ink" style={{ width: `${(n / max) * 100}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
