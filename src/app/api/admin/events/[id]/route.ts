import { NextResponse } from "next/server";
import { deleteEvent, getEventById, toAdminEvent, updateEvent } from "@/lib/events";
import { apiError, readJson, requireAdmin } from "@/lib/http";
import { parseEventInput } from "@/lib/validation";

type Context = RouteContext<"/api/admin/events/[id]">;

export async function GET(request: Request, { params }: Context) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const event = getEventById((await params).id);
  return event ? NextResponse.json({ event: toAdminEvent(event) }) : apiError("not_found");
}

export async function PATCH(request: Request, { params }: Context) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const parsed = parseEventInput(await readJson(request), true);
  if (!parsed.ok) return apiError("bad_request", parsed.errors);
  const event = updateEvent((await params).id, parsed.value);
  return event ? NextResponse.json({ event: toAdminEvent(event) }) : apiError("not_found");
}

export async function DELETE(request: Request, { params }: Context) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return (await deleteEvent((await params).id)) ? NextResponse.json({ ok: true }) : apiError("not_found");
}
