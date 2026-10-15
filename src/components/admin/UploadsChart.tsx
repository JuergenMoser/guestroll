"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useT } from "@/components/I18nProvider";
import type { SeriesPoint } from "@/lib/stats";

/**
 * Uploads only. Views run an order of magnitude higher than uploads, so plotting
 * both on one axis would flatten the uploads into the baseline; views and
 * downloads are totals in the stat tiles instead.
 */
export function UploadsChart({ series }: { series: SeriesPoint[] }) {
  const t = useT();
  const data = series.map((p) => ({ bucket: p.bucket.length > 10 ? p.bucket.slice(11) : p.bucket.slice(5), uploads: p.uploads }));

  if (data.every((d) => d.uploads === 0)) {
    return <p className="py-16 text-center text-sm text-ink-400">{t("admin.moderation.empty")}</p>;
  }

  return (
    <figure>
      <div className="h-56" role="img" aria-label={t("admin.uploadsSeries")}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -20 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke="var(--color-ink-800)" />
            <XAxis dataKey="bucket" tickLine={false} axisLine={false} tick={{ fill: "var(--color-ink-400)", fontSize: 11 }} minTickGap={16} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--color-ink-400)", fontSize: 11 }} />
            <Tooltip
              cursor={{ fill: "var(--color-ink-800)" }}
              contentStyle={{ background: "var(--color-ink-950)", border: "1px solid var(--color-ink-700)", borderRadius: 12, fontSize: 12 }}
              labelStyle={{ color: "var(--color-ink-300)" }}
              itemStyle={{ color: "var(--color-paper)" }}
              formatter={(value) => [value, t("admin.uploadsSeries")]}
            />
            <Bar dataKey="uploads" fill="var(--color-accent)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 text-xs text-ink-400">
        <summary className="cursor-pointer select-none">Table</summary>
        <table className="mt-2 w-full text-left font-mono">
          <tbody>
            {data.map((d) => (
              <tr key={d.bucket} className="border-t border-ink-800">
                <td className="py-1">{d.bucket}</td>
                <td className="py-1 text-right tabular-nums text-paper">{d.uploads}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
