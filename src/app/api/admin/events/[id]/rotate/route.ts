import { NextResponse } from "next/server";
import { rotateSlug, toAdminEvent } from "@/lib/events";
import { apiError, requireAdmin } from "@/lib/http";

export async function POST(request: Request, { params }: RouteContext<"/api/admin/events/[id]/rotate">) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const event = rotateSlug((await params).id);
  return event ? NextResponse.json({ event: toAdminEvent(event) }) : apiError("not_found");
}
