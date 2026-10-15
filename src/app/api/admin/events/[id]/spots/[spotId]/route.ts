import { NextResponse } from "next/server";
import { apiError, readJson, requireEventAdmin } from "@/lib/http";
import { deleteSpot, parseSpotLabel, renameSpot } from "@/lib/spots";

type Context = RouteContext<"/api/admin/events/[id]/spots/[spotId]">;

/** `{ label }`: renames it; its QR code stays the same. */
export async function PATCH(request: Request, { params }: Context) {
  const { id, spotId } = await params;
  const { event, denied } = await requireEventAdmin(request, id);
  if (denied) return denied;
  const label = parseSpotLabel(((await readJson(request)) as { label?: unknown } | undefined)?.label);
  if (!label) return apiError("bad_request", { label: "invalid" });
  const spot = renameSpot(event.id, spotId, label);
  return spot ? NextResponse.json({ spot: { id: spot.id, label: spot.label } }) : apiError("not_found");
}

/** Its QR code stops tagging photos; the photos already sent stay, untagged. */
export async function DELETE(request: Request, { params }: Context) {
  const { id, spotId } = await params;
  const { event, denied } = await requireEventAdmin(request, id);
  if (denied) return denied;
  return deleteSpot(event.id, spotId) ? NextResponse.json({ ok: true }) : apiError("not_found");
}
