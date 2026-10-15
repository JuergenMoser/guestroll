import { track } from "@/lib/activity";
import { archiveResponse } from "@/lib/archive";
import { requireEventAdmin } from "@/lib/http";
import { listForArchive } from "@/lib/photos";

/** `?all=1` also includes pending and hidden photos; `?favorites=1` is the hosts' "best of". */
export async function GET(request: Request, { params }: RouteContext<"/api/admin/events/[id]/archive">) {
  const { event, denied } = await requireEventAdmin(request, (await params).id);
  if (denied) return denied;

  const search = new URL(request.url).searchParams;
  const scope = search.get("favorites") === "1" ? "favorites" : search.get("all") === "1" ? "all" : "visible";
  track("zip", event.id);
  return archiveResponse(event, listForArchive(event.id, scope), scope === "favorites" ? "favorites" : undefined);
}
