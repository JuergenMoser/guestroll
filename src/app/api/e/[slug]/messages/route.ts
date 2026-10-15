import { NextResponse } from "next/server";
import { ensureGuestId, getGuestSession } from "@/lib/auth/session";
import { getViewer } from "@/lib/auth/viewer";
import { getEventBySlug } from "@/lib/events";
import { apiError, rateLimited } from "@/lib/http";
import {
  checkAudio,
  audioKey,
  audioMime,
  countGuestMessages,
  InvalidAudioError,
  insertMessage,
  listMessages,
  MAX_AUDIO_BYTES,
  MAX_MESSAGE_LENGTH,
  MAX_MESSAGES_PER_GUEST,
  toMessageDto,
} from "@/lib/messages";
import { canEnterEvent, uploadState } from "@/lib/policy";
import { guestbookNotice } from "@/lib/mail/automation";
import { newId } from "@/lib/security/ids";
import { limiters, uploadMemory } from "@/lib/security/limiters";
import {
  BodyTooLargeError,
  clientIp,
  isSameOrigin,
  readBodyCapped,
  ServerBusyError,
  type MemoryHold,
} from "@/lib/security/request";
import { storage, storageFull } from "@/lib/storage";

type Context = RouteContext<"/api/e/[slug]/messages">;

/** The guest's own messages: like photos, nobody else's. */
export async function GET(_request: Request, { params }: Context) {
  const event = getEventBySlug((await params).slug);
  if (!event) return apiError("not_found");
  const viewer = await getViewer();
  if (!canEnterEvent(event, viewer) || !event.guestbookEnabled)
    return apiError("forbidden");
  const asGuest = { guestId: viewer.guestId };
  return NextResponse.json(
    {
      messages: listMessages(event, asGuest).map((m) =>
        toMessageDto(m, asGuest),
      ),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

/** Multipart: `text` and/or `audio` (a recorded voice note), `seconds` its length. */
export async function POST(request: Request, context: Context) {
  if (!isSameOrigin(request)) return apiError("forbidden");
  const hold = uploadMemory.hold();
  try {
    return await post(request, context, hold);
  } finally {
    hold.release();
  }
}

async function post(request: Request, { params }: Context, hold: MemoryHold) {
  const event = getEventBySlug((await params).slug);
  if (!event) return apiError("not_found");
  if (!event.guestbookEnabled) return apiError("forbidden");

  const session = await getGuestSession();
  const guestId = ensureGuestId(session);
  await session.save();
  const viewer = { ...(await getViewer()), guestId };
  const state = uploadState(event, viewer, 0);
  if (!state.open)
    return apiError(state.reason === "locked" ? "forbidden" : "uploads_closed");
  if (countGuestMessages(event.id, guestId) >= MAX_MESSAGES_PER_GUEST)
    return apiError("quota_reached");
  const limit = limiters.message.consume(guestId);
  if (!limit.allowed) return rateLimited(limit.retryAfterMs);
  // The guest id is only a cookie: these two hold for a client that drops it.
  const ip = clientIp(request);
  for (const check of [
    limiters.messagePerEvent.consume(event.id),
    ip === "direct" ? null : limiters.messagePerIp.consume(ip),
  ]) {
    if (check && !check.allowed) return rateLimited(check.retryAfterMs);
  }
  if (await storageFull()) return apiError("storage_full");

  let text = "";
  let audio: Buffer | null = null;
  let seconds: number | null = null;
  try {
    const body = await readBodyCapped(request, MAX_AUDIO_BYTES + 64 * 1024, hold);
    const form = await new Response(body, {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }).formData();
    const rawText = form.get("text");
    text =
      typeof rawText === "string"
        ? rawText.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim()
        : "";
    const file = form.get("audio");
    if (file instanceof File && file.size > 0) {
      if (!event.guestbookVoice) return apiError("forbidden");
      if (file.size > MAX_AUDIO_BYTES) return apiError("too_large");
      audio = Buffer.from(await file.arrayBuffer());
      const s = Number(form.get("seconds"));
      seconds =
        Number.isFinite(s) && s > 0 ? Math.min(Math.round(s), 600) : null;
    }
  } catch (error) {
    if (error instanceof ServerBusyError) return rateLimited(2_000);
    return apiError(
      error instanceof BodyTooLargeError ? "too_large" : "bad_request",
    );
  }
  if (text.length > MAX_MESSAGE_LENGTH)
    return apiError("bad_request", { text: "too_long" });
  if (!text && !audio) return apiError("bad_request", { text: "required" });

  let audioExt: string | null = null;
  if (audio) {
    try {
      audioExt = await checkAudio(audio);
    } catch (error) {
      // Reuses `invalid_image` (415) with `details.audio` rather than growing the error vocabulary.
      if (error instanceof InvalidAudioError)
        return apiError("invalid_image", { audio: "unsupported" });
      throw error;
    }
  }

  const id = newId();
  const draft = { id, eventId: event.id, audioExt };
  if (audio && audioExt)
    await storage().put(audioKey(draft), audio, audioMime(audioExt));
  try {
    const message = insertMessage({
      ...draft,
      guestId,
      guestName: event.askGuestName ? (session.name ?? null) : null,
      text,
      audioBytes: audio?.length ?? null,
      audioSeconds: seconds,
      status: event.moderation === "pre" ? "pending" : "visible",
    });
    guestbookNotice(event, {
      guestName: message.guestName,
      text: message.text,
      hasAudio: Boolean(message.audioExt),
    });
    return NextResponse.json(
      { message: toMessageDto(message, viewer) },
      { status: 201 },
    );
  } catch (error) {
    if (audioExt) await storage().delete(audioKey(draft));
    throw error;
  }
}
