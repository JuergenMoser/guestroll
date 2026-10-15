import { NextResponse } from "next/server";
import { apiError, readJson, requireEventAdmin } from "@/lib/http";
import { deletePhotos, listPhotos, setFavorite, setPhotoStatus, toPhotoDto } from "@/lib/photos";

type Context = RouteContext<"/api/admin/events/[id]/photos">;
const STATUSES = new Set(["visible", "pending", "hidden"] as const);

export async function GET(request: Request, { params }: Context) {
  const { admin, event, denied } = await requireEventAdmin(request, (await params).id);
  if (denied) return denied;

  const search = new URL(request.url).searchParams;
  const status = search.get("status") as "visible" | "pending" | "hidden" | null;
  const before = Number(search.get("before")) || undefined;
  const rows = listPhotos(event, "album", {
    favorite: search.get("favorites") === "1",
    before,
    limit: 100,
    status: status && STATUSES.has(status) ? status : undefined,
  });
  return NextResponse.json({
    photos: rows.map((p) => toPhotoDto(p, { admin: admin.scope })),
    nextCursor: rows.length === 100 ? rows[rows.length - 1].createdAt : null,
  });
}

/** Bulk actions: `{ action: "approve" | "hide" | "delete" | "favorite" | "unfavorite", ids: string[] }`. */
export async function POST(request: Request, { params }: Context) {
  const { event, denied } = await requireEventAdmin(request, (await params).id);
  if (denied) return denied;

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
    case "favorite":
    case "unfavorite":
      return NextResponse.json({ changed: setFavorite(ids, event.id, body.action === "favorite") });
    default:
      return apiError("bad_request", { action: "approve | hide | delete | favorite | unfavorite" });
  }
}
