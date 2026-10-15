import { guestbookArchiveResponse } from "@/lib/archive";
import { requireEventAdmin } from "@/lib/http";
import { listMessages } from "@/lib/messages";

/** The guestbook to keep: `guestbook.txt` with every message, and the voice notes next to it. Hidden ones are left out. */
export async function GET(request: Request, { params }: RouteContext<"/api/admin/events/[id]/messages/archive">) {
  const { event, denied } = await requireEventAdmin(request, (await params).id);
  if (denied) return denied;
  const rows = listMessages(event, "book", { limit: 500 }).filter((m) => m.status !== "hidden");
  return guestbookArchiveResponse(event, rows.reverse());
}
