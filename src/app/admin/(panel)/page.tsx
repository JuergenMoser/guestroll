import { Plus } from "lucide-react";
import Link from "next/link";
import { EventList } from "@/components/admin/EventList";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatsPanel } from "@/components/admin/StatsPanel";
import { buttonClass } from "@/components/ui";
import { listEvents } from "@/lib/events";
import { getLocale, getT } from "@/lib/i18n/server";
import { getStats } from "@/lib/stats";
import { requireAdminPage } from "@/lib/auth/guard";

export default async function DashboardPage() {
  await requireAdminPage();
  const t = getT();
  const locale = getLocale();
  return (
    <>
      <PageHeader
        kicker={t("admin.title")}
        title={t("admin.dashboard")}
        actions={
          <Link href="/admin/events/new" className={buttonClass()}>
            <Plus className="size-4" aria-hidden />
            {t("admin.newEvent")}
          </Link>
        }
      />
      <div className="space-y-10">
        <StatsPanel stats={getStats()} locale={locale} />
        <section className="space-y-4">
          <h2 className="kicker">{t("admin.events")}</h2>
          <EventList events={listEvents().slice(0, 5)} locale={locale} />
        </section>
      </div>
    </>
  );
}
