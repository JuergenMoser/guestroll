import "server-only";
import { redirect } from "next/navigation";
import { isAdmin } from "./admin";

/** For admin pages: API routes use `requireAdmin` from lib/http instead, which answers 401. */
export async function requireAdminPage(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}
