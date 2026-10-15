import { NextResponse } from "next/server";
import { track } from "@/lib/activity";
import { ensureGuestId, getGuestSession } from "@/lib/auth/session";
import { getEventBySlug } from "@/lib/events";
import { apiError } from "@/lib/http";
import { canJoinFreely } from "@/lib/policy";
import { isSameOrigin } from "@/lib/security/request";

/** First visit to an event without an access code: records it in the guest cookie. */
export async function POST(request: Request, { params }: RouteContext<"/api/e/[slug]/join">) {
  if (!isSameOrigin(request)) return apiError("forbidden");
  const event = getEventBySlug((await params).slug);
  if (!event) return apiError("not_found");
  if (!canJoinFreely(event)) return apiError("forbidden");

  const session = await getGuestSession();
  const guestId = ensureGuestId(session);
  session.unlocked = [...new Set([...(session.unlocked ?? []), event.id])].slice(-50);
  await session.save();
  track("unlock", event.id, guestId);
  return NextResponse.json({ ok: true });
}
