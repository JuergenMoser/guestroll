import { NextResponse } from "next/server";
import { getGuestSession } from "@/lib/auth/session";
import { getEventBySlug } from "@/lib/events";
import { apiError } from "@/lib/http";
import { deleteMessages } from "@/lib/messages";
import { isSameOrigin } from "@/lib/security/request";

/** A guest takes back their own message, voice note included. */
export async function DELETE(request: Request, { params }: RouteContext<"/api/e/[slug]/messages/[messageId]">) {
  if (!isSameOrigin(request)) return apiError("forbidden");
  const { slug, messageId } = await params;
  const event = getEventBySlug(slug);
  const session = await getGuestSession();
  if (!event || !session.guestId) return apiError("not_found");
  return (await deleteMessages([messageId], event.id, session.guestId)) ? NextResponse.json({ ok: true }) : apiError("not_found");
}
