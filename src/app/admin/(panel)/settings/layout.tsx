import { PageHeader } from "@/components/admin/PageHeader";
import { SettingsNav, type SettingsArea } from "@/components/admin/settings/SettingsNav";
import { getAccount } from "@/lib/accounts";
import { requireAdminPage } from "@/lib/auth/guard";
import { getSchedule } from "@/lib/backupSchedule";
import { getT } from "@/lib/i18n/server";
import { smtpSource } from "@/lib/mail/settings";
import { availableUpdate } from "@/lib/updates";

// Layouts render in parallel with pages: each settings page checks the session itself too.
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  const t = await getT();
  const owner = admin.role === "owner";
  const attention: Partial<Record<SettingsArea, { text: string; tone: "warn" | "info" }>> = {};
  if (!getAccount(admin.id)?.totpSecret) attention.account = { text: t("admin.settingsNav.twoFactorOff"), tone: "warn" };
  if (owner) {
    const update = availableUpdate();
    if (update) attention.system = { text: t("admin.settingsNav.updateAvailable", { version: update.version }), tone: "info" };
    if (smtpSource() === "none") attention.notifications = { text: t("admin.settingsNav.noEmail"), tone: "info" };
    if (!getSchedule().enabled) attention.data = { text: t("admin.settingsNav.noBackups"), tone: "warn" };
  }
  return (
    <>
      <PageHeader title={t("admin.settings")} />
      <div className="grid gap-x-10 gap-y-6 md:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="min-w-0 md:sticky md:top-20 md:self-start">
          <SettingsNav owner={owner} attention={attention} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
