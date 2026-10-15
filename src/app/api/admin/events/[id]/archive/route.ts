import { track } from "@/lib/activity";
import { archiveResponse } from "@/lib/archive";
import { getEventById } from "@/lib/events";
import { apiError, requireAdmin } from "@/lib/http";
import { listForArchive } from "@/lib/photos";

/** `?all=1` also includes pending and hidden photos. */
export async function GET(request: Request, { params }: RouteContext<"/api/admin/events/[id]/archive">) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const event = getEventById((await params).id);
  if (!event) return apiError("not_found");

  const all = new URL(request.url).searchParams.get("all") === "1";
  track("zip", event.id);
  return archiveResponse(event, listForArchive(event.id, all));
}
