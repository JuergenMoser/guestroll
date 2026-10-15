import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { EventList } from "@/components/admin/EventList";
import { EventSearch } from "@/components/admin/EventSearch";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { buttonClass, EmptyState } from "@/components/ui";
import { EVENTS_PER_PAGE, pageEvents } from "@/lib/events";
import { getLocale, getT } from "@/lib/i18n/server";
import { requireAdminPage } from "@/lib/auth/guard";

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const admin = await requireAdminPage();
  const t = await getT();
  const { page, q } = await searchParams;
  const query = q?.slice(0, 100);
  const result = pageEvents(admin.scope, { page: Number(page) || 1, q: query });
  const href = (n: number) => {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (n > 1) p.set("page", String(n));
    const s = p.toString();
    return s ? `/admin/events?${s}` : "/admin/events";
  };
  return (
    <>
      <PageHeader
        title={t("admin.events")}
        actions={
          admin.role === "owner" && (
            <Link href="/admin/events/new" className={buttonClass()}>
              <Plus className="size-4" aria-hidden />
              {t("admin.newEvent")}
            </Link>
          )
        }
      />
      <div className="space-y-4">
        {(result.total > EVENTS_PER_PAGE || query) && (
          <Suspense>
            <EventSearch />
          </Suspense>
        )}
        {query && result.total === 0 ? (
          <EmptyState className="py-12">{t("admin.eventList.noMatch", { q: query })}</EmptyState>
        ) : (
          <EventList events={result.events} locale={await getLocale()} emptyHint={admin.role === "owner" ? undefined : t("admin.accounts.organizerEmpty")} />
        )}
        <Pagination t={t} page={result.page} pageCount={result.pageCount} total={result.total} perPage={EVENTS_PER_PAGE} href={href} />
      </div>
    </>
  );
}
