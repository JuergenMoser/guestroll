import { NextResponse } from "next/server";
import { getGuestSession } from "@/lib/auth/session";
import { getEventBySlug } from "@/lib/events";
import { apiError } from "@/lib/http";
import { deleteGuestPhoto } from "@/lib/photos";
import { isSameOrigin } from "@/lib/security/request";

/**
 * A guest takes back one of their photos, at any time, even after the event:
 * the photo is theirs to remove (right to erasure). Files go with the row.
 */
export async function DELETE(request: Request, { params }: RouteContext<"/api/e/[slug]/photos/[photoId]">) {
  if (!isSameOrigin(request)) return apiError("forbidden");
  const { slug, photoId } = await params;
  const event = getEventBySlug(slug);
  const session = await getGuestSession();
  // Same answer for "not yours" and "doesn't exist": ids must not be probeable.
  if (!event || !session.guestId) return apiError("not_found");
  return (await deleteGuestPhoto(photoId, event.id, session.guestId)) ? NextResponse.json({ ok: true }) : apiError("not_found");
}
