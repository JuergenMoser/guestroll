import "server-only";
import { notFound, redirect } from "next/navigation";
import type { EventRow } from "@/lib/db/schema";
import { getEventById } from "@/lib/events";
import { isEventAdmin } from "@/lib/policy";
import { getAdmin, type AdminIdentity } from "./admin";

/**
 * Call at the top of EVERY admin page, not only in the layout: Next renders a
 * layout and its page in parallel, so a layout check doesn't stop the page's
 * own data from being sent. API routes use `requireAdmin` from lib/http instead.
 */
export async function requireAdminPage(options: { owner?: boolean } = {}): Promise<AdminIdentity> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (options.owner && admin.role !== "owner") notFound();
  return admin;
}

/** An event page: 404 for events outside the admin's scope, exactly as for missing ones. */
export async function requireEventAdminPage(eventId: string): Promise<{ admin: AdminIdentity; event: EventRow }> {
  const admin = await requireAdminPage();
  const event = getEventById(eventId);
  if (!event || !isEventAdmin(event.id, { admin: admin.scope })) notFound();
  return { admin, event };
}
