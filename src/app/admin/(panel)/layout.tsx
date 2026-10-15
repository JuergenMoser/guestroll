import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdminPage } from "@/lib/auth/guard";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return (
    <>
      <AdminNav appName={config.appName} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </>
  );
}
