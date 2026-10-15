import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdminPage } from "@/lib/auth/guard";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

// Layouts and pages render in parallel: this check guards the nav only.
// Every page under (panel) runs `requireAdminPage()` itself before reading data.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return (
    <>
      <AdminNav appName={config.appName} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </>
  );
}
