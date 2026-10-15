import { PageHeader } from "@/components/admin/PageHeader";
import { PasswordForm } from "@/components/admin/PasswordForm";
import { Card, CardTitle } from "@/components/ui";
import { passwordManagedByEnv } from "@/lib/auth/admin";
import { config } from "@/lib/config";
import { getT } from "@/lib/i18n/server";
import pkg from "../../../../../package.json";

export default function SettingsPage() {
  const t = getT();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title={t("admin.settings")} />
      <Card className="space-y-4">
        <CardTitle>{t("admin.settingsPage.passwordTitle")}</CardTitle>
        {passwordManagedByEnv() ? <p className="text-sm text-ink-400">{t("admin.settingsPage.managedByEnv")}</p> : <PasswordForm />}
      </Card>
      <Card className="space-y-3">
        <CardTitle>{t("admin.settingsPage.about")}</CardTitle>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 font-mono text-sm">
          <dt className="text-ink-400">version</dt>
          <dd>{pkg.version}</dd>
          <dt className="text-ink-400">locale</dt>
          <dd>{config.locale}</dd>
          <dt className="text-ink-400">max upload</dt>
          <dd>{config.maxUploadBytes / 1024 / 1024} MB</dd>
          <dt className="text-ink-400">public url</dt>
          <dd className="truncate">{config.publicUrl || "—"}</dd>
        </dl>
        <a href="https://github.com/achedon12/guestroll" className="inline-block text-sm text-accent underline-offset-2 hover:underline">
          github.com/achedon12/guestroll
        </a>
      </Card>
    </div>
  );
}
