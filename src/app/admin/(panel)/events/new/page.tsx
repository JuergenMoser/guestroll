import { EventForm } from "@/components/admin/EventForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { getT } from "@/lib/i18n/server";

export default function NewEventPage() {
  const t = getT();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader kicker={t("admin.events")} title={t("admin.newEvent")} />
      <EventForm />
    </div>
  );
}
