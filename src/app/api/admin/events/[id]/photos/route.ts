import { NextResponse } from "next/server";
import { getEventById } from "@/lib/events";
import { apiError, readJson, requireAdmin } from "@/lib/http";
import { deletePhotos, listPhotos, setPhotoStatus, toPhotoDto } from "@/lib/photos";

type Context = RouteContext<"/api/admin/events/[id]/photos">;
const STATUSES = new Set(["visible", "pending", "hidden"] as const);
const ADMIN_VIEWER = { isAdmin: true, unlocked: [] };

export async function GET(request: Request, { params }: Context) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const event = getEventById((await params).id);
  if (!event) return apiError("not_found");

  const search = new URL(request.url).searchParams;
  const status = search.get("status") as "visible" | "pending" | "hidden" | null;
  const before = Number(search.get("before")) || undefined;
  const rows = listPhotos(event, ADMIN_VIEWER, {
    before,
    limit: 100,
    status: status && STATUSES.has(status) ? status : undefined,
  });
  return NextResponse.json({
    photos: rows.map((p) => toPhotoDto(p, ADMIN_VIEWER)),
    nextCursor: rows.length === 100 ? rows[rows.length - 1].createdAt : null,
  });
}

/** Bulk moderation: `{ action: "approve" | "hide" | "delete", ids: string[] }`. */
export async function POST(request: Request, { params }: Context) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const event = getEventById((await params).id);
  if (!event) return apiError("not_found");

  const body = (await readJson(request)) as { action?: unknown; ids?: unknown } | undefined;
  const ids = Array.isArray(body?.ids) ? body.ids.filter((id): id is string => typeof id === "string").slice(0, 500) : [];
  if (ids.length === 0) return apiError("bad_request", { ids: "required" });

  switch (body?.action) {
    case "approve":
      return NextResponse.json({ changed: setPhotoStatus(ids, event.id, "visible") });
    case "hide":
      return NextResponse.json({ changed: setPhotoStatus(ids, event.id, "hidden") });
    case "delete":
      return NextResponse.json({ changed: await deletePhotos(ids, event.id) });
    default:
      return apiError("bad_request", { action: "approve | hide | delete" });
  }
}
