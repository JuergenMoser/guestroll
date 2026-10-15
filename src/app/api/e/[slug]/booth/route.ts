import { NextResponse } from "next/server";
import { ensureGuestId, getGuestSession } from "@/lib/auth/session";
import { boothKeyMatches } from "@/lib/booth";
import { getEventBySlug } from "@/lib/events";
import { apiError, rateLimited, readJson } from "@/lib/http";
import { limiters } from "@/lib/security/limiters";
import { clientIp, isSameOrigin } from "@/lib/security/request";

/** `{ key }`: sets this device up as the event's photo booth (joined, no per-guest limit). */
export async function POST(request: Request, { params }: RouteContext<"/api/e/[slug]/booth">) {
  if (!isSameOrigin(request)) return apiError("forbidden");
  const event = getEventBySlug((await params).slug);
  if (!event) return apiError("not_found");
  const attempt = limiters.unlock.consume(`booth:${clientIp(request)}`);
  if (!attempt.allowed) return rateLimited(attempt.retryAfterMs);

  const key = ((await readJson(request)) as { key?: unknown } | undefined)?.key;
  // A booth link that was turned off or replaced answers like a wrong one.
  if (!boothKeyMatches(event, key)) return apiError("forbidden");

  const session = await getGuestSession();
  ensureGuestId(session);
  session.unlocked = [...new Set([...(session.unlocked ?? []), event.id])].slice(-50);
  session.booths = { ...session.booths, [event.id]: key as string };
  await session.save();
  return NextResponse.json({ ok: true });
}
