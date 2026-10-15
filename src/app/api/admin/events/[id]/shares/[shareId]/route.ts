import { NextResponse } from "next/server";
import { apiError, requireEventAdmin } from "@/lib/http";
import { revokeShareLink } from "@/lib/shares";

/** Revokes a gallery link: it stops working at once, for everyone who unlocked it. */
export async function DELETE(request: Request, { params }: RouteContext<"/api/admin/events/[id]/shares/[shareId]">) {
  const { id, shareId } = await params;
  const { event, denied } = await requireEventAdmin(request, id);
  if (denied) return denied;
  return revokeShareLink(shareId, event.id) ? NextResponse.json({ ok: true }) : apiError("not_found");
}
