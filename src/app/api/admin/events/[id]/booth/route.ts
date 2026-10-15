import { NextResponse } from "next/server";
import { disableBooth, newBoothKey } from "@/lib/booth";
import { requireEventAdmin } from "@/lib/http";

type Context = RouteContext<"/api/admin/events/[id]/booth">;

/** Turns the booth on, or replaces its link: a booth set up with the old one stops. */
export async function POST(request: Request, { params }: Context) {
  const { event, denied } = await requireEventAdmin(request, (await params).id);
  if (denied) return denied;
  return NextResponse.json({ boothKey: newBoothKey(event.id) });
}

export async function DELETE(request: Request, { params }: Context) {
  const { event, denied } = await requireEventAdmin(request, (await params).id);
  if (denied) return denied;
  disableBooth(event.id);
  return NextResponse.json({ ok: true });
}
