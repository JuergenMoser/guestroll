import { NextResponse } from "next/server";
import { track } from "@/lib/activity";
import { ensureGuestId, getGuestSession } from "@/lib/auth/session";
import { checkAccessCode, getEventBySlug } from "@/lib/events";
import { apiError, rateLimited, readJson } from "@/lib/http";
import { limiters } from "@/lib/security/limiters";
import { clientIp, isSameOrigin } from "@/lib/security/request";

export async function POST(request: Request, { params }: RouteContext<"/api/e/[slug]/unlock">) {
  if (!isSameOrigin(request)) return apiError("forbidden");
  const event = getEventBySlug((await params).slug);
  if (!event) return apiError("not_found");

  const session = await getGuestSession();
  const guestId = ensureGuestId(session);

  const attempt = limiters.unlock.consume(`${clientIp(request)}:${guestId}`);
  if (!attempt.allowed) return rateLimited(attempt.retryAfterMs);
  if (limiters.unlockFailures.isLimited(event.id)) return rateLimited(60_000);

  const body = (await readJson(request)) as { code?: unknown } | undefined;
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!code || !(await checkAccessCode(event, code))) {
    limiters.unlockFailures.consume(event.id);
    track("unlock_failed", event.id, guestId);
    await session.save();
    return apiError("invalid_code");
  }

  session.unlocked = [...new Set([...(session.unlocked ?? []), event.id])].slice(-50);
  await session.save();
  track("unlock", event.id, guestId);
  return NextResponse.json({ ok: true });
}
