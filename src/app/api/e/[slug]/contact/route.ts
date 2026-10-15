import { NextResponse } from "next/server";
import { ensureGuestId, getGuestSession } from "@/lib/auth/session";
import { getViewer } from "@/lib/auth/viewer";
import { deleteGuestContact, parseEmail, saveGuestContact } from "@/lib/contacts";
import { getEventBySlug } from "@/lib/events";
import { apiError, readJson } from "@/lib/http";
import { getLocale } from "@/lib/i18n/server";
import { canEnterEvent } from "@/lib/policy";
import { isSameOrigin } from "@/lib/security/request";

type Context = RouteContext<"/api/e/[slug]/contact">;

async function guard(request: Request, slug: string) {
  if (!isSameOrigin(request)) return { error: apiError("forbidden") };
  const event = getEventBySlug(slug);
  if (!event) return { error: apiError("not_found") };
  if (!event.collectGuestEmails || !canEnterEvent(event, await getViewer())) return { error: apiError("forbidden") };
  return { event };
}

/** A guest asks to receive the album by email when the event ends (opt-in). */
export async function POST(request: Request, { params }: Context) {
  const { event, error } = await guard(request, (await params).slug);
  if (error) return error;
  const body = (await readJson(request)) as { email?: unknown } | undefined;
  const email = parseEmail(body?.email);
  if (!email) return apiError("bad_request", { email: "invalid" });
  const session = await getGuestSession();
  const guestId = ensureGuestId(session);
  await session.save();
  saveGuestContact(event.id, guestId, email, await getLocale(event.defaultLocale));
  return NextResponse.json({ email });
}

/** The guest changes their mind: the address is deleted, not just flagged. */
export async function DELETE(request: Request, { params }: Context) {
  const { event, error } = await guard(request, (await params).slug);
  if (error) return error;
  const session = await getGuestSession();
  if (session.guestId) deleteGuestContact(event.id, session.guestId);
  return NextResponse.json({ ok: true });
}
