import { NextResponse } from "next/server";
import { ensureGuestId, getGuestSession } from "@/lib/auth/session";
import { getEventBySlug } from "@/lib/events";
import { apiError, readJson } from "@/lib/http";
import { isSameOrigin } from "@/lib/security/request";
import { parseGuestName } from "@/lib/validation";

/** Stores the name a guest signs their photos with. Kept in the cookie, not the database. */
export async function POST(request: Request, { params }: RouteContext<"/api/e/[slug]/guest">) {
  if (!isSameOrigin(request)) return apiError("forbidden");
  if (!getEventBySlug((await params).slug)) return apiError("not_found");

  const body = (await readJson(request)) as { name?: unknown } | undefined;
  const name = parseGuestName(body?.name);
  if (!name) return apiError("bad_request", { name: "required" });

  const session = await getGuestSession();
  ensureGuestId(session);
  session.name = name;
  await session.save();
  return NextResponse.json({ name });
}
