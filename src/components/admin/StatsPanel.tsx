"use client";

import { useT } from "@/components/I18nProvider";
import { Card, CardTitle } from "@/components/ui";
import type { Stats } from "@/lib/stats";
import { StatGrid } from "./StatGrid";
import { TopGuests } from "./TopGuests";
import { UploadsChart } from "./UploadsChart";

export function StatsPanel({ stats, locale }: { stats: Stats; locale: string }) {
  const t = useT();
  return (
    <div className="space-y-4">
      <StatGrid totals={stats.totals} locale={locale} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle className="mb-4">{t("admin.uploadsSeries")}</CardTitle>
          <UploadsChart series={stats.series} />
        </Card>
        <Card>
          <CardTitle className="mb-4">{t("admin.topGuests")}</CardTitle>
          <TopGuests guests={stats.topGuests} />
        </Card>
      </div>
    </div>
  );
}
