import { AccountsPanel } from "@/components/admin/AccountsPanel";
import { requireAdminPage } from "@/lib/auth/guard";
import { listEvents } from "@/lib/events";
import { getLocale } from "@/lib/i18n/server";

export default async function TeamSettingsPage() {
  const admin = await requireAdminPage({ owner: true });
  return <AccountsPanel selfId={admin.id} events={listEvents(admin.scope).map((e) => ({ id: e.id, name: e.name }))} locale={await getLocale()} />;
}
