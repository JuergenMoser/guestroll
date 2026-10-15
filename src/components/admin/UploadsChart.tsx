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
    return <p className="py-16 text-center text-sm text-ink-muted">{t("admin.moderation.empty")}</p>;
  }

  return (
    <figure>
      <div className="h-56" role="img" aria-label={t("admin.uploadsSeries")}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -20 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke="var(--color-line)" />
            <XAxis dataKey="bucket" tickLine={false} axisLine={false} tick={{ fill: "var(--color-ink-muted)", fontSize: 11 }} minTickGap={16} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--color-ink-muted)", fontSize: 11 }} />
            <Tooltip
              cursor={{ fill: "var(--color-line)" }}
              contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-line-2)", borderRadius: 12, fontSize: 12 }}
              labelStyle={{ color: "var(--color-ink-muted)" }}
              itemStyle={{ color: "var(--color-ink)" }}
              formatter={(value) => [value, t("admin.uploadsSeries")]}
            />
            <Bar dataKey="uploads" fill="var(--color-ink)" radius={[3, 3, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 text-xs text-ink-muted">
        <summary className="cursor-pointer select-none">Table</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <tbody>
            {data.map((d) => (
              <tr key={d.bucket} className="border-t border-line">
                <td className="py-1">{d.bucket}</td>
                <td className="py-1 text-right tabular-nums text-ink">{d.uploads}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
