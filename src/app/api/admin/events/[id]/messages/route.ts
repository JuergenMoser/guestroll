import { NextResponse } from "next/server";
import { apiError, readJson, requireEventAdmin } from "@/lib/http";
import { deleteMessages, listMessages, setMessageStatus, toMessageDto } from "@/lib/messages";

type Context = RouteContext<"/api/admin/events/[id]/messages">;
const STATUSES = new Set(["visible", "pending", "hidden"] as const);

export async function GET(request: Request, { params }: Context) {
  const { event, denied } = await requireEventAdmin(request, (await params).id);
  if (denied) return denied;
  const search = new URL(request.url).searchParams;
  const status = search.get("status") as "visible" | "pending" | "hidden" | null;
  const before = Number(search.get("before")) || undefined;
  const rows = listMessages(event, "book", { status: status && STATUSES.has(status) ? status : undefined, before, limit: 50 });
  return NextResponse.json({ messages: rows.map((m) => toMessageDto(m, {})), nextCursor: rows.length === 50 ? rows[rows.length - 1].createdAt : null });
}

/** `{ action: "approve" | "hide" | "delete", ids }`, as for photos. */
export async function POST(request: Request, { params }: Context) {
  const { event, denied } = await requireEventAdmin(request, (await params).id);
  if (denied) return denied;
  const body = (await readJson(request)) as { action?: unknown; ids?: unknown } | undefined;
  const ids = Array.isArray(body?.ids) ? body.ids.filter((id): id is string => typeof id === "string").slice(0, 500) : [];
  if (!ids.length) return apiError("bad_request", { ids: "required" });
  switch (body?.action) {
    case "approve":
      return NextResponse.json({ changed: setMessageStatus(ids, event.id, "visible") });
    case "hide":
      return NextResponse.json({ changed: setMessageStatus(ids, event.id, "hidden") });
    case "delete":
      return NextResponse.json({ changed: await deleteMessages(ids, event.id) });
    default:
      return apiError("bad_request", { action: "approve | hide | delete" });
  }
}
