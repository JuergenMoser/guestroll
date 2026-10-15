import { Plus } from "lucide-react";
import Link from "next/link";
import { EventList } from "@/components/admin/EventList";
import { PageHeader } from "@/components/admin/PageHeader";
import { buttonClass } from "@/components/ui";
import { listEvents } from "@/lib/events";
import { getLocale, getT } from "@/lib/i18n/server";
import { requireAdminPage } from "@/lib/auth/guard";

export default async function EventsPage() {
  const admin = await requireAdminPage();
  const t = await getT();
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
      <EventList events={listEvents(admin.scope)} locale={await getLocale()} emptyHint={admin.role === "owner" ? undefined : t("admin.accounts.organizerEmpty")} />
    </>
  );
}
