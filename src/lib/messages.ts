import "server-only";
import { fileTypeFromBuffer } from "file-type";
import { and, count, desc, eq, inArray, lt, ne, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { messages, type EventRow, type MessageRow } from "@/lib/db/schema";
import { isEventAdmin, type Viewer } from "@/lib/policy";
import { storage } from "@/lib/storage";

export const MAX_MESSAGE_LENGTH = 500;
export const MAX_AUDIO_BYTES = 3 * 1024 * 1024;
export const MAX_MESSAGES_PER_GUEST = 20;

/** What the browser may know: `audio` is a URL back through the access-checked route. */
export interface MessageDto {
  id: string;
  guestName: string | null;
  text: string;
  audio: string | null;
  audioSeconds: number | null;
  status: MessageRow["status"];
  mine: boolean;
  createdAt: number;
}

export function toMessageDto(message: MessageRow, viewer: Pick<Viewer, "guestId">): MessageDto {
  return {
    id: message.id,
    guestName: message.guestName,
    text: message.text,
    audio: message.audioExt ? `/api/messages/${message.id}/audio` : null,
    audioSeconds: message.audioSeconds,
    status: message.status,
    mine: viewer.guestId !== undefined && message.guestId === viewer.guestId,
    createdAt: message.createdAt,
  };
}

// Containers browsers' MediaRecorder produce (webm/ogg on Chrome and Firefox,
// mp4 on Safari), plus mp3 for files picked from a phone.
const AUDIO: Record<string, { ext: string; mime: string }> = {
  webm: { ext: "webm", mime: "audio/webm" },
  ogg: { ext: "ogg", mime: "audio/ogg" },
  opus: { ext: "ogg", mime: "audio/ogg" },
  m4a: { ext: "m4a", mime: "audio/mp4" },
  mp4: { ext: "m4a", mime: "audio/mp4" },
  mp3: { ext: "mp3", mime: "audio/mpeg" },
};
export const audioMime = (ext: string) => Object.values(AUDIO).find((a) => a.ext === ext)?.mime ?? "application/octet-stream";

export class InvalidAudioError extends Error {}

/**
 * Identifies the container by its bytes. The audio is stored as recorded, not
 * re-encoded (that would need ffmpeg in the image): it is only ever served
 * with an audio type, as an attachment or to an <audio> element, under a
 * sandboxing CSP.
 */
export async function checkAudio(buffer: Buffer): Promise<string> {
  const type = await fileTypeFromBuffer(buffer);
  const known = type && AUDIO[type.ext];
  if (!known) throw new InvalidAudioError("Unsupported audio");
  return known.ext;
}

const SAFE_ID = /^[0-9a-f-]{36}$/;
export function audioKey(message: Pick<MessageRow, "id" | "eventId" | "audioExt">): string {
  if (!SAFE_ID.test(message.id) || !SAFE_ID.test(message.eventId) || !message.audioExt || !/^[a-z0-9]{2,4}$/.test(message.audioExt)) {
    throw new Error("Invalid storage id");
  }
  return `${message.eventId}/messages/${message.id}.${message.audioExt}`;
}

export function insertMessage(message: Omit<MessageRow, "createdAt">): MessageRow {
  return getDb().insert(messages).values(message).returning().get();
}

export const getMessage = (id: string) => getDb().select().from(messages).where(eq(messages.id, id)).get();

export function countGuestMessages(eventId: string, guestId: string): number {
  return getDb().select({ n: count() }).from(messages).where(and(eq(messages.eventId, eventId), eq(messages.guestId, guestId))).get()?.n ?? 0;
}

export function countMessages(eventId: string): number {
  return getDb().select({ n: count() }).from(messages).where(and(eq(messages.eventId, eventId), ne(messages.status, "hidden"))).get()?.n ?? 0;
}

/** `"book"`: the whole guestbook (admins, or a link with `status: "visible"`); a guest id: that guest's own, hidden excluded. */
export function listMessages(event: EventRow, who: "book" | { guestId?: string }, options: { status?: MessageRow["status"]; before?: number; limit?: number } = {}): MessageRow[] {
  const filters: SQL[] = [eq(messages.eventId, event.id)];
  if (who === "book") {
    if (options.status) filters.push(eq(messages.status, options.status));
  } else {
    if (!who.guestId) return [];
    filters.push(eq(messages.guestId, who.guestId), ne(messages.status, "hidden"));
  }
  if (options.before) filters.push(lt(messages.createdAt, options.before));
  return getDb()
    .select()
    .from(messages)
    .where(and(...filters))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(Math.min(Math.max(options.limit ?? 50, 1), 500))
    .all();
}

export function setMessageStatus(ids: string[], eventId: string, status: MessageRow["status"]): number {
  if (!ids.length) return 0;
  return getDb().update(messages).set({ status }).where(and(eq(messages.eventId, eventId), inArray(messages.id, ids))).run().changes;
}

export async function deleteMessages(ids: string[], eventId: string, guestId?: string): Promise<number> {
  if (!ids.length) return 0;
  const filters: SQL[] = [eq(messages.eventId, eventId), inArray(messages.id, ids)];
  if (guestId) filters.push(eq(messages.guestId, guestId));
  const deleted = getDb().delete(messages).where(and(...filters)).returning().all();
  await Promise.all(deleted.filter((m) => m.audioExt).map((m) => storage().delete(audioKey(m))));
  return deleted.length;
}

/**
 * Same rule as photos: guests hear their own notes, the event's admins all of
 * them, and a gallery link the visible ones when the hosts share the guestbook.
 */
export function canViewMessage(event: Pick<EventRow, "id" | "guestbookInGallery">, message: MessageRow, viewer: Viewer): boolean {
  if (message.eventId !== event.id) return false;
  if (isEventAdmin(event.id, viewer)) return true;
  if (message.status === "visible" && event.guestbookInGallery && viewer.shares?.some((s) => s.eventId === event.id)) return true;
  if (message.status === "hidden" || !viewer.unlocked.includes(event.id)) return false;
  return viewer.guestId !== undefined && message.guestId === viewer.guestId;
}
