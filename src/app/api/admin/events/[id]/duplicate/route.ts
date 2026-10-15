import { NextResponse } from "next/server";
import { duplicateEvent, toAdminEvent } from "@/lib/events";
import { apiError, readJson, requireEventAdmin } from "@/lib/http";
import { parseEventInput } from "@/lib/validation";

/** `{ name? }`: a copy of the event's settings, without its photos. Owners only, like creating an event. */
export async function POST(request: Request, { params }: RouteContext<"/api/admin/events/[id]/duplicate">) {
  const { admin, event, denied } = await requireEventAdmin(request, (await params).id);
  if (denied) return denied;
  if (admin.role !== "owner") return apiError("forbidden");
  const body = (await readJson(request)) as { name?: unknown } | undefined;
  const parsed = parseEventInput({ name: body?.name ?? `${event.name} (2)`.slice(0, 80) }, true);
  if (!parsed.ok) return apiError("bad_request", parsed.errors);
  const copy = await duplicateEvent(event, parsed.value.name!);
  return NextResponse.json({ event: toAdminEvent(copy) }, { status: 201 });
}
