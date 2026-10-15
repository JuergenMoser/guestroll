import { NextResponse } from "next/server";
import { rotateSlug, toAdminEvent } from "@/lib/events";
import { requireEventAdmin } from "@/lib/http";

export async function POST(request: Request, { params }: RouteContext<"/api/admin/events/[id]/rotate">) {
  const { event, denied } = await requireEventAdmin(request, (await params).id);
  if (denied) return denied;
  return NextResponse.json({ event: toAdminEvent(rotateSlug(event.id)!) });
}
