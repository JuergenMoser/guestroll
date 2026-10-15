import { Aperture } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { isAdmin } from "@/lib/auth/admin";
import { config } from "@/lib/config";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  const t = getT();
  return (
    <main className="grain grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-3 text-center">
          <Aperture className="mx-auto size-8 text-accent" aria-hidden />
          <p className="kicker">{config.appName}</p>
          <h1 className="font-display text-4xl">{t("admin.loginTitle")}</h1>
          <p className="text-sm text-ink-400">{t("admin.loginHint")}</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
