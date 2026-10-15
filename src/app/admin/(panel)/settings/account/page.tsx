import { PasswordForm } from "@/components/admin/PasswordForm";
import { ProfileForm } from "@/components/admin/ProfileForm";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { TwoFactorCard } from "@/components/admin/TwoFactorCard";
import { LanguagePicker } from "@/components/LanguagePicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getAccount } from "@/lib/accounts";
import { passwordManagedByEnv } from "@/lib/auth/admin";
import { requireAdminPage } from "@/lib/auth/guard";
import { getLocale, getT } from "@/lib/i18n/server";
import { getTheme } from "@/lib/theme/server";

export default async function AccountSettingsPage() {
  const admin = await requireAdminPage();
  const account = getAccount(admin.id)!;
  const t = await getT();
  return (
    <>
      <SettingsSection id="profile" title={t("admin.profile.title")} description={t("admin.profile.lead")}>
        <ProfileForm username={account.username} initialName={account.name} initialEmail={account.email} />
      </SettingsSection>
      <SettingsSection id="password" title={t("admin.settingsPage.passwordTitle")} description={t("admin.settingsPage.passwordLead")}>
        {passwordManagedByEnv(account) ? <p className="rounded-lg bg-sunken p-3 text-sm text-ink-soft">{t("admin.settingsPage.managedByEnv")}</p> : <PasswordForm />}
      </SettingsSection>
      <TwoFactorCard />
      <SettingsSection id="appearance" title={t("admin.settingsPage.appearance")} description={t("admin.settingsPage.appearanceLead")}>
        <div className="flex flex-wrap gap-2">
          <LanguagePicker current={await getLocale()} align="start" />
          <ThemeToggle initial={await getTheme()} />
        </div>
      </SettingsSection>
    </>
  );
}
