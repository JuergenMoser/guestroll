import { NextResponse } from "next/server";
import { createEvent, listEvents, toAdminEvent } from "@/lib/events";
import { apiError, readJson, requireAdmin } from "@/lib/http";
import { parseEventInput } from "@/lib/validation";

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return NextResponse.json({ events: listEvents() });
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const parsed = parseEventInput(await readJson(request), false);
  if (!parsed.ok) return apiError("bad_request", parsed.errors);
  const event = createEvent(parsed.value as Parameters<typeof createEvent>[0]);
  return NextResponse.json({ event: toAdminEvent(event) }, { status: 201 });
}
