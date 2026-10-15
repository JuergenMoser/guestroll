import { NextResponse } from "next/server";
import { createEvent, listEvents, pageEvents, toAdminEvent } from "@/lib/events";
import { apiError, readJson, requireAdmin } from "@/lib/http";
import { parseEventInput } from "@/lib/validation";

export async function GET(request: Request) {
  const { admin, denied } = await requireAdmin(request);
  if (denied) return denied;
  const url = new URL(request.url);
  const page = url.searchParams.get("page");
  const q = url.searchParams.get("q")?.slice(0, 100) ?? undefined;
  // Without ?page or ?q, every event as before, for the scripts written against it.
  if (page === null && q === undefined) return NextResponse.json({ events: listEvents(admin.scope) });
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("perPage")) || 20));
  return NextResponse.json(pageEvents(admin.scope, { page: Number(page) || 1, perPage, q }));
}

/** Owners create events; organizers work on the ones they're given. */
export async function POST(request: Request) {
  const { denied } = await requireAdmin(request, { owner: true });
  if (denied) return denied;
  const parsed = parseEventInput(await readJson(request), false);
  if (!parsed.ok) return apiError("bad_request", parsed.errors);
  const event = createEvent(parsed.value as Parameters<typeof createEvent>[0]);
  return NextResponse.json({ event: toAdminEvent(event) }, { status: 201 });
}
