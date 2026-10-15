import { track } from "@/lib/activity";
import { archiveResponse } from "@/lib/archive";
import { apiError, requireEventAdmin } from "@/lib/http";
import { listForArchive } from "@/lib/photos";

/** `?all=1` also includes pending and hidden photos. */
export async function GET(request: Request, { params }: RouteContext<"/api/admin/events/[id]/archive">) {
  const { event, denied } = await requireEventAdmin(request, (await params).id);
  if (denied) return denied;

  const all = new URL(request.url).searchParams.get("all") === "1";
  track("zip", event.id);
  return archiveResponse(event, listForArchive(event.id, all));
}
