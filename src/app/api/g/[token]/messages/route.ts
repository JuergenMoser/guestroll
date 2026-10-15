import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { listMessages, toMessageDto } from "@/lib/messages";
import { resolveShare } from "@/lib/shareAccess";

/** The visible guestbook behind a gallery link, when the hosts chose to share it. */
export async function GET(request: Request, { params }: RouteContext<"/api/g/[token]/messages">) {
  const access = await resolveShare((await params).token);
  if (access.status === "missing") return apiError("not_found");
  if (access.status === "locked" || !access.event.guestbookInGallery) return apiError("forbidden");
  const before = Number(new URL(request.url).searchParams.get("before")) || undefined;
  const rows = listMessages(access.event, "book", { status: "visible", before, limit: 50 });
  return NextResponse.json(
    { messages: rows.map((m) => toMessageDto(m, {})), nextCursor: rows.length === 50 ? rows[rows.length - 1].createdAt : null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
