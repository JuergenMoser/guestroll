import { NextResponse } from "next/server";
import { apiError, requireAdmin } from "@/lib/http";
import { getEventById } from "@/lib/events";
import { getStats } from "@/lib/stats";

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const eventId = new URL(request.url).searchParams.get("eventId") ?? undefined;
  if (eventId && !getEventById(eventId)) return apiError("not_found");
  return NextResponse.json(getStats(eventId));
}
