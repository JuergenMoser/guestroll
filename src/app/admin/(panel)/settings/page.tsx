import { AccountsPanel } from "@/components/admin/AccountsPanel";
import { MailSettings } from "@/components/admin/MailSettings";
import { WebhookSettings } from "@/components/admin/WebhookSettings";
import { PageHeader } from "@/components/admin/PageHeader";
import { PasswordForm } from "@/components/admin/PasswordForm";
import { ProfileForm } from "@/components/admin/ProfileForm";
import { LanguagePicker } from "@/components/LanguagePicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Card, CardTitle } from "@/components/ui";
import { getAccount } from "@/lib/accounts";
import { passwordManagedByEnv } from "@/lib/auth/admin";
import { requireAdminPage } from "@/lib/auth/guard";
import { config } from "@/lib/config";
import { listEvents } from "@/lib/events";
import { getLocale, getT } from "@/lib/i18n/server";
import { getTheme } from "@/lib/theme/server";
import pkg from "../../../../../package.json";

export default async function SettingsPage() {
  const admin = await requireAdminPage();
  const account = getAccount(admin.id)!;
  const owner = admin.role === "owner";
  const t = await getT();
  const locale = await getLocale();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title={t("admin.settings")} />
      <Card className="space-y-4">
        <CardTitle>{t("admin.settingsPage.appearance")}</CardTitle>
        <div className="flex flex-wrap gap-2">
          <LanguagePicker current={locale} />
          <ThemeToggle initial={await getTheme()} />
        </div>
      </Card>
      <Card className="space-y-4">
        <CardTitle>{t("admin.profile.title")}</CardTitle>
        <ProfileForm username={account.username} initialName={account.name} initialEmail={account.email} />
      </Card>
      <Card className="space-y-4">
        <CardTitle>{t("admin.settingsPage.passwordTitle")}</CardTitle>
        {passwordManagedByEnv(account) ? <p className="text-sm text-ink-muted">{t("admin.settingsPage.managedByEnv")}</p> : <PasswordForm />}
      </Card>
      {owner && (
        <>
          <AccountsPanel selfId={admin.id} events={listEvents(admin.scope).map((e) => ({ id: e.id, name: e.name }))} locale={locale} />
          <MailSettings locale={locale} />
          <WebhookSettings locale={locale} />
          <Card className="space-y-3">
            <CardTitle>{t("admin.settingsPage.about")}</CardTitle>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm tabular-nums">
              <dt className="text-ink-muted">version</dt>
              <dd>{pkg.version}</dd>
              <dt className="text-ink-muted">locale</dt>
              <dd>{config.locale}</dd>
              <dt className="text-ink-muted">storage</dt>
              <dd>{config.storage.driver}</dd>
              <dt className="text-ink-muted">max upload</dt>
              <dd>{config.maxUploadBytes / 1024 / 1024} MB</dd>
              <dt className="text-ink-muted">public url</dt>
              <dd className="truncate">{config.publicUrl || "—"}</dd>
            </dl>
            <a href="https://github.com/achedon12/guestroll" className="inline-block text-sm text-accent underline-offset-2 hover:underline">
              github.com/achedon12/guestroll
            </a>
          </Card>
        </>
      )}
    </div>
  );
}
