import { NextResponse } from "next/server";
import { apiError, requireAdmin } from "@/lib/http";
import { revokeInvitation } from "@/lib/invitations";

/** Revokes a pending invitation: its link stops working. */
export async function DELETE(request: Request, { params }: RouteContext<"/api/admin/invitations/[invitationId]">) {
  const { denied } = await requireAdmin(request, { owner: true, notInDemo: true });
  if (denied) return denied;
  return revokeInvitation((await params).invitationId) ? NextResponse.json({ ok: true }) : apiError("not_found");
}
