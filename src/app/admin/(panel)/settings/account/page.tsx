import { PasswordForm } from "@/components/admin/PasswordForm";
import { ProfileForm } from "@/components/admin/ProfileForm";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { TwoFactorCard } from "@/components/admin/TwoFactorCard";
import { SsoLink } from "@/components/admin/SsoLink";
import { oidcEnabled } from "@/lib/auth/oidc";
import { config } from "@/lib/config";
import { LanguagePicker } from "@/components/LanguagePicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getAccount } from "@/lib/accounts";
import { passwordManagedByEnv } from "@/lib/auth/admin";
import { requireAdminPage } from "@/lib/auth/guard";
import { getLocale, getT } from "@/lib/i18n/server";
import { getTheme } from "@/lib/theme/server";

export default async function AccountSettingsPage({ searchParams }: { searchParams: Promise<{ sso?: string }> }) {
  const admin = await requireAdminPage();
  const { sso } = await searchParams;
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
      {oidcEnabled() && (
        <SettingsSection id="sso" title={t("admin.sso.title")} description={t("admin.sso.lead", { name: config.oidc.name })}>
          {(sso === "linked" || sso === "taken") && (
            <p role="status" className={sso === "linked" ? "text-sm text-ok" : "text-sm text-danger"}>
              {t(sso === "linked" ? "admin.sso.linkedNow" : "admin.sso.taken")}
            </p>
          )}
          <SsoLink linked={Boolean(account.oidcSubject)} provider={config.oidc.name} />
        </SettingsSection>
      )}
      <SettingsSection id="appearance" title={t("admin.settingsPage.appearance")} description={t("admin.settingsPage.appearanceLead")}>
        <div className="flex flex-wrap gap-2">
          <LanguagePicker current={await getLocale()} align="start" />
          <ThemeToggle initial={await getTheme()} />
        </div>
      </SettingsSection>
    </>
  );
}
