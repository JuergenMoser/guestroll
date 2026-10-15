import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { listPhotos, toPhotoDto } from "@/lib/photos";
import { resolveShare } from "@/lib/shareAccess";

const PAGE = 60;

/** The album behind a gallery link: visible photos only, newest first. */
export async function GET(request: Request, { params }: RouteContext<"/api/g/[token]/photos">) {
  const access = await resolveShare((await params).token);
  if (access.status === "missing") return apiError("not_found");
  if (access.status === "locked") return apiError("forbidden");

  const before = Number(new URL(request.url).searchParams.get("before")) || undefined;
  // The album filtered to visible: exactly what canViewPhoto lets a link see.
  const rows = listPhotos(access.event, "album", { status: "visible", before, limit: PAGE });
  const asLink = { admin: undefined, guestId: undefined };
  return NextResponse.json(
    { photos: rows.map((p) => ({ ...toPhotoDto(p, asLink), downloads: undefined })), nextCursor: rows.length === PAGE ? rows[rows.length - 1].createdAt : null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
