import { NextResponse } from "next/server";
import { deleteEvent, toAdminEvent, updateEvent } from "@/lib/events";
import { apiError, readJson, requireEventAdmin } from "@/lib/http";
import { parseEventInput } from "@/lib/validation";

type Context = RouteContext<"/api/admin/events/[id]">;

export async function GET(request: Request, { params }: Context) {
  const { event, denied } = await requireEventAdmin(request, (await params).id);
  if (denied) return denied;
  return NextResponse.json({ event: toAdminEvent(event) });
}

export async function PATCH(request: Request, { params }: Context) {
  const { event, denied } = await requireEventAdmin(request, (await params).id);
  if (denied) return denied;
  const parsed = parseEventInput(await readJson(request), true);
  if (!parsed.ok) return apiError("bad_request", parsed.errors);
  return NextResponse.json({ event: toAdminEvent(updateEvent(event.id, parsed.value)!) });
}

/** Owners only: deleting an event removes every photo, an organizer can't do that alone. */
export async function DELETE(request: Request, { params }: Context) {
  const { admin, event, denied } = await requireEventAdmin(request, (await params).id);
  if (denied) return denied;
  if (admin.role !== "owner") return apiError("forbidden");
  await deleteEvent(event.id);
  return NextResponse.json({ ok: true });
}
