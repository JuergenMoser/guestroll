import { PageHeader } from "@/components/admin/PageHeader";
import { PasswordForm } from "@/components/admin/PasswordForm";
import { Card, CardTitle } from "@/components/ui";
import { passwordManagedByEnv } from "@/lib/auth/admin";
import { config } from "@/lib/config";
import { getT } from "@/lib/i18n/server";
import pkg from "../../../../../package.json";
import { requireAdminPage } from "@/lib/auth/guard";

export default async function SettingsPage() {
  await requireAdminPage();
  const t = await getT();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title={t("admin.settings")} />
      <Card className="space-y-4">
        <CardTitle>{t("admin.settingsPage.passwordTitle")}</CardTitle>
        {passwordManagedByEnv() ? <p className="text-sm text-ink-muted">{t("admin.settingsPage.managedByEnv")}</p> : <PasswordForm />}
      </Card>
      <Card className="space-y-3">
        <CardTitle>{t("admin.settingsPage.about")}</CardTitle>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm tabular-nums">
          <dt className="text-ink-muted">version</dt>
          <dd>{pkg.version}</dd>
          <dt className="text-ink-muted">locale</dt>
          <dd>{config.locale}</dd>
          <dt className="text-ink-muted">max upload</dt>
          <dd>{config.maxUploadBytes / 1024 / 1024} MB</dd>
          <dt className="text-ink-muted">public url</dt>
          <dd className="truncate">{config.publicUrl || "—"}</dd>
        </dl>
        <a href="https://github.com/achedon12/guestroll" className="inline-block text-sm text-accent underline-offset-2 hover:underline">
          github.com/achedon12/guestroll
        </a>
      </Card>
    </div>
  );
}
