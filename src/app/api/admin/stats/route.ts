import { NextResponse } from "next/server";
import { apiError, requireAdmin } from "@/lib/http";
import { getEventById } from "@/lib/events";
import { isEventAdmin } from "@/lib/policy";
import { getStats } from "@/lib/stats";

export async function GET(request: Request) {
  const { admin, denied } = await requireAdmin(request);
  if (denied) return denied;
  const eventId = new URL(request.url).searchParams.get("eventId");
  if (!eventId) return NextResponse.json(getStats(admin.scope));
  const event = getEventById(eventId);
  if (!event || !isEventAdmin(event.id, { admin: admin.scope })) return apiError("not_found");
  return NextResponse.json(getStats(event.id));
}
