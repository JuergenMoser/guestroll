import { AdminNav } from "@/components/admin/AdminNav";
import { UpdateBanner } from "@/components/admin/UpdateBanner";
import { availableUpdate } from "@/lib/updates";
import { requireAdminPage } from "@/lib/auth/guard";
import { config } from "@/lib/config";
import { getLocale } from "@/lib/i18n/server";
import { getTheme } from "@/lib/theme/server";

export const dynamic = "force-dynamic";

// Layouts and pages render in parallel: this check guards the nav only.
// Every page under (panel) runs `requireAdminPage()` itself before reading data.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  const update = availableUpdate();
  return (
    <>
      <AdminNav appName={config.appName} locale={await getLocale()} theme={await getTheme()} account={{ name: admin.name || admin.username, role: admin.role }} />
      {admin.role === "owner" && update && <UpdateBanner version={update.version} />}
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </>
  );
}
