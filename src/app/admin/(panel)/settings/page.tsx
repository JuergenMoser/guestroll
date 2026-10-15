import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/guard";

export default async function SettingsPage() {
  await requireAdminPage();
  redirect("/admin/settings/account");
}
