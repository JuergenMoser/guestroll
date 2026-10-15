import { track } from "@/lib/activity";
import { archiveResponse } from "@/lib/archive";
import { getViewer } from "@/lib/auth/viewer";
import { getEventBySlug } from "@/lib/events";
import { apiError } from "@/lib/http";
import { incrementDownloads, listAllVisible } from "@/lib/photos";
import { canDownloadArchive } from "@/lib/policy";

export async function GET(_request: Request, { params }: RouteContext<"/api/e/[slug]/archive">) {
  const event = getEventBySlug((await params).slug);
  if (!event) return apiError("not_found");
  const viewer = await getViewer();
  if (!canDownloadArchive(event, viewer)) return apiError("forbidden");

  const rows = listAllVisible(event.id, false);
  incrementDownloads(rows.map((p) => p.id));
  track("zip", event.id, viewer.guestId);
  return archiveResponse(event, rows);
}
