import { BackupSettings } from "@/components/admin/BackupSettings";
import { requireAdminPage } from "@/lib/auth/guard";
import { getLocale } from "@/lib/i18n/server";

export default async function DataSettingsPage() {
  await requireAdminPage({ owner: true });
  return <BackupSettings locale={await getLocale()} />;
}
