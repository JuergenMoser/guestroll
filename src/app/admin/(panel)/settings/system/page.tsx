import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { UpdatesCard } from "@/components/admin/UpdatesCard";
import { requireAdminPage } from "@/lib/auth/guard";
import { config } from "@/lib/config";
import { getLocale, getT } from "@/lib/i18n/server";
import pkg from "../../../../../../package.json";

export default async function SystemSettingsPage() {
  await requireAdminPage({ owner: true });
  const t = await getT();
  const rows: [string, string][] = [
    [t("admin.about.version"), pkg.version],
    [t("admin.about.language"), config.locale],
    [t("admin.about.storage"), config.storage.driver === "s3" ? `S3 (${config.storage.s3.bucket})` : t("admin.about.localStorage")],
    [t("admin.about.maxUpload"), `${config.maxUploadBytes / 1024 / 1024} MB`],
    [t("admin.about.publicUrl"), config.publicUrl || "—"],
    [t("admin.about.timeZone"), config.timeZone],
  ];
  return (
    <>
      <UpdatesCard locale={await getLocale()} />
      <SettingsSection id="about" title={t("admin.settingsPage.about")} description={t("admin.about.lead")}>
        <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-6 gap-y-2.5 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-ink-muted">{k}</dt>
              <dd className="truncate tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <a href="https://github.com/achedon12/guestroll" className="inline-block text-sm text-accent underline-offset-2 hover:underline">
          github.com/achedon12/guestroll
        </a>
      </SettingsSection>
    </>
  );
}
