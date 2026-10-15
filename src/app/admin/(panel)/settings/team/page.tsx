import { AccountsPanel } from "@/components/admin/AccountsPanel";
import { InvitationsSection } from "@/components/admin/InvitationsSection";
import { requireAdminPage } from "@/lib/auth/guard";
import { listEventNames } from "@/lib/events";
import { getLocale } from "@/lib/i18n/server";

export default async function TeamSettingsPage() {
  const admin = await requireAdminPage({ owner: true });
  const [events, locale] = [listEventNames(admin.scope), await getLocale()];
  return (
    <>
      <InvitationsSection events={events} locale={locale} />
      <AccountsPanel selfId={admin.id} events={events} locale={locale} />
    </>
  );
}
