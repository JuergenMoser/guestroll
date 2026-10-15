import { NextResponse } from "next/server";
import { apiError, requireAdmin } from "@/lib/http";
import { revokeShareLink } from "@/lib/shares";

/** Revokes a gallery link: it stops working at once, for everyone who unlocked it. */
export async function DELETE(request: Request, { params }: RouteContext<"/api/admin/events/[id]/shares/[shareId]">) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const { id, shareId } = await params;
  return revokeShareLink(shareId, id) ? NextResponse.json({ ok: true }) : apiError("not_found");
}
