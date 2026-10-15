import { KeyRound } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { Brand } from "@/components/Brand";
import { buttonClass } from "@/components/ui";
import { oidcEnabled } from "@/lib/auth/oidc";
import { getAdmin } from "@/lib/auth/admin";
import { config } from "@/lib/config";
import { DEMO_PASSWORD, DEMO_USERNAME } from "@/lib/demo/seed";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const SSO_ERRORS = ["unknown", "failed", "expired", "unavailable"] as const;

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ sso?: string; step?: string }> }) {
  if (await getAdmin()) redirect("/admin");
  const t = await getT();
  const { sso, step } = await searchParams;
  const ssoError = (SSO_ERRORS as readonly string[]).includes(sso ?? "") ? (sso as (typeof SSO_ERRORS)[number]) : null;
  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-4">
          <Brand name={config.appName} />
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{t("admin.loginTitle")}</h1>
            <p className="text-ink-muted">{t("admin.loginHint")}</p>
          </div>
        </div>
        {ssoError && (
          <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger ring-1 ring-danger/25">
            {t(`admin.sso.errors.${ssoError}`)}
          </p>
        )}
        {oidcEnabled() && step !== "code" && (
          <>
            <a href="/api/admin/oidc/start" className={buttonClass("secondary", "md", "w-full")}>
              <KeyRound className="size-4" aria-hidden />
              {t("admin.sso.signIn", { name: config.oidc.name })}
            </a>
            <p className="flex items-center gap-3 text-xs text-ink-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">{t("admin.sso.or")}</p>
          </>
        )}
        <LoginForm demo={config.demo.enabled ? { username: DEMO_USERNAME, password: DEMO_PASSWORD } : undefined} initialStep={step === "code" ? "code" : "password"} />
      </div>
    </main>
  );
}
