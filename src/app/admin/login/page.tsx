import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { Brand } from "@/components/Brand";
import { getAdmin } from "@/lib/auth/admin";
import { config } from "@/lib/config";
import { DEMO_PASSWORD, DEMO_USERNAME } from "@/lib/demo/seed";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  const t = await getT();
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
        <LoginForm demo={config.demo.enabled ? { username: DEMO_USERNAME, password: DEMO_PASSWORD } : undefined} />
      </div>
    </main>
  );
}
