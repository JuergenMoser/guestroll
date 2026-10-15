import { Plus } from "lucide-react";
import Link from "next/link";
import { EventList } from "@/components/admin/EventList";
import { PageHeader } from "@/components/admin/PageHeader";
import { buttonClass } from "@/components/ui";
import { listEvents } from "@/lib/events";
import { getLocale, getT } from "@/lib/i18n/server";

export default function EventsPage() {
  const t = getT();
  return (
    <>
      <PageHeader
        title={t("admin.events")}
        actions={
          <Link href="/admin/events/new" className={buttonClass()}>
            <Plus className="size-4" aria-hidden />
            {t("admin.newEvent")}
          </Link>
        }
      />
      <EventList events={listEvents()} locale={getLocale()} />
    </>
  );
}
