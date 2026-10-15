import { NextResponse } from "next/server";
import { apiError, readJson, requireEventAdmin } from "@/lib/http";
import { countSpots, createSpot, listSpots, MAX_SPOTS, parseSpotLabel } from "@/lib/spots";

type Context = RouteContext<"/api/admin/events/[id]/spots">;

export async function GET(request: Request, { params }: Context) {
  const { event, denied } = await requireEventAdmin(request, (await params).id);
  if (denied) return denied;
  return NextResponse.json({ spots: listSpots(event.id) });
}

/** `{ label }`: a new place with its own QR code. */
export async function POST(request: Request, { params }: Context) {
  const { event, denied } = await requireEventAdmin(request, (await params).id);
  if (denied) return denied;
  const label = parseSpotLabel(((await readJson(request)) as { label?: unknown } | undefined)?.label);
  if (!label) return apiError("bad_request", { label: "invalid" });
  if (countSpots(event.id) >= MAX_SPOTS) return apiError("bad_request", { label: "too_many" });
  const spot = createSpot(event.id, label);
  return NextResponse.json({ spot: { id: spot.id, label: spot.label, photos: 0 } }, { status: 201 });
}
