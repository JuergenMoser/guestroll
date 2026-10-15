import { track } from "@/lib/activity";
import { archiveResponse } from "@/lib/archive";
import { apiError } from "@/lib/http";
import { incrementDownloads, listForArchive } from "@/lib/photos";
import { canDownloadAlbum } from "@/lib/policy";
import { resolveShare } from "@/lib/shareAccess";

export async function GET(_request: Request, { params }: RouteContext<"/api/g/[token]/archive">) {
  const access = await resolveShare((await params).token);
  if (access.status === "missing") return apiError("not_found");
  if (access.status === "locked" || !canDownloadAlbum(access.event, access.viewer, access.grant)) return apiError("forbidden");

  const rows = listForArchive(access.event.id, access.share.favoritesOnly ? "favorites" : "visible");
  incrementDownloads(rows.map((p) => p.id));
  track("zip", access.event.id);
  return archiveResponse(access.event, rows);
}
