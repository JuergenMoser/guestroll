import { MailSettings } from "@/components/admin/MailSettings";
import { WebhookSettings } from "@/components/admin/WebhookSettings";
import { requireAdminPage } from "@/lib/auth/guard";
import { getLocale } from "@/lib/i18n/server";

export default async function NotificationSettingsPage() {
  await requireAdminPage({ owner: true });
  const locale = await getLocale();
  return (
    <>
      <MailSettings locale={locale} />
      <WebhookSettings locale={locale} />
    </>
  );
}
