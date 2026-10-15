import "server-only";
import { redirect } from "next/navigation";
import { isAdmin } from "./admin";

/**
 * Call at the top of EVERY admin page, not only in the layout: Next renders a
 * layout and its page in parallel, so a layout check doesn't stop the page's
 * own data from being sent. API routes use `requireAdmin` from lib/http instead.
 */
export async function requireAdminPage(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}
