import { NextResponse } from "next/server";
import { getEventById, toAdminEvent, updateEvent } from "@/lib/events";
import { apiError, requireEventAdmin } from "@/lib/http";
import { endEvent } from "@/lib/mail/automation";
import { processOutbox } from "@/lib/mail/outbox";
import { mailEnabled } from "@/lib/mail/settings";

/**
 * "End the event now": closes uploads and runs the end-of-event automation
 * immediately instead of waiting for the scheduled closing time.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/admin/events/[id]/end">) {
  const { event, denied } = await requireEventAdmin(request, (await params).id);
  if (denied) return denied;
  if (event.endedAt) return apiError("bad_request", { event: "already_ended" });

  const closed = updateEvent(event.id, { uploadsOpen: false, uploadsCloseAt: event.uploadsCloseAt ?? Date.now() })!;
  const result = endEvent(closed);
  if (mailEnabled()) void processOutbox().catch((error) => console.error("[mail]", error));
  return NextResponse.json({ event: toAdminEvent(getEventById(event.id)!), result });
}
