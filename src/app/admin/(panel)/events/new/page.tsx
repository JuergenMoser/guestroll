import { EventForm } from "@/components/admin/EventForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { getT } from "@/lib/i18n/server";
import { requireAdminPage } from "@/lib/auth/guard";

export default async function NewEventPage() {
  await requireAdminPage();
  const t = await getT();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("admin.newEvent")} />
      <EventForm />
    </div>
  );
}
