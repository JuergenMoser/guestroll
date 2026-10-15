import { Plus } from "lucide-react";
import Link from "next/link";
import { EventList } from "@/components/admin/EventList";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatsPanel } from "@/components/admin/StatsPanel";
import { buttonClass } from "@/components/ui";
import { pageEvents } from "@/lib/events";
import { getLocale, getT } from "@/lib/i18n/server";
import { getStats } from "@/lib/stats";
import { requireAdminPage } from "@/lib/auth/guard";

const RECENT = 5;

export default async function DashboardPage() {
  const admin = await requireAdminPage();
  const t = await getT();
  const locale = await getLocale();
  const recent = pageEvents(admin.scope, { perPage: RECENT });
  return (
    <>
      <PageHeader
        title={t("admin.dashboard")}
        actions={
          admin.role === "owner" && (
            <Link href="/admin/events/new" className={buttonClass()}>
              <Plus className="size-4" aria-hidden />
              {t("admin.newEvent")}
            </Link>
          )
        }
      />
      <div className="space-y-10">
        <StatsPanel stats={getStats(admin.scope)} locale={locale} />
        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-bold tracking-tight">{t("admin.events")}</h2>
            {recent.total > RECENT && (
              <Link href="/admin/events" className="text-sm font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline">
                {t("admin.eventList.seeAll", { n: recent.total })}
              </Link>
            )}
          </div>
          <EventList events={recent.events} locale={locale} emptyHint={admin.role === "owner" ? undefined : t("admin.accounts.organizerEmpty")} />
        </section>
      </div>
    </>
  );
}
