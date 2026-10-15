"use client";

import { useT } from "@/components/I18nProvider";
import { Card, CardTitle } from "@/components/ui";
import type { Stats } from "@/lib/stats";
import type { Challenge } from "@/lib/challenges";
import { ChallengeStats } from "./ChallengeStats";
import { StatGrid } from "./StatGrid";
import { TopGuests } from "./TopGuests";
import { UploadsChart } from "./UploadsChart";

export function StatsPanel({ stats, locale, challenges = [], spots = [] }: { stats: Stats; locale: string; challenges?: Challenge[]; spots?: { id: string; label: string; photos: number }[] }) {
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
        {challenges.length > 0 && (
          <Card className="lg:col-span-3">
            <CardTitle className="mb-4">{t("admin.challenges.statsTitle")}</CardTitle>
            <ChallengeStats challenges={challenges} counts={stats.challenges} />
          </Card>
        )}
        {spots.length > 0 && (
          <Card className="lg:col-span-3">
            <CardTitle className="mb-4">{t("admin.spots.statsTitle")}</CardTitle>
            <ChallengeStats challenges={spots} counts={spots.map((s) => ({ id: s.id, photos: s.photos }))} />
          </Card>
        )}
      </div>
    </div>
  );
}
