import { AccountsPanel } from "@/components/admin/AccountsPanel";
import { requireAdminPage } from "@/lib/auth/guard";
import { listEventNames } from "@/lib/events";
import { getLocale } from "@/lib/i18n/server";

export default async function TeamSettingsPage() {
  const admin = await requireAdminPage({ owner: true });
  return <AccountsPanel selfId={admin.id} events={listEventNames(admin.scope)} locale={await getLocale()} />;
}
