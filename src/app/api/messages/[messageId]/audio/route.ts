import { Readable } from "node:stream";
import { getViewer } from "@/lib/auth/viewer";
import { getEventById } from "@/lib/events";
import { apiError } from "@/lib/http";
import { audioKey, audioMime, canViewMessage, getMessage } from "@/lib/messages";
import { storage } from "@/lib/storage";

/** The only way a voice note leaves the server, checked on every request like photos. */
export async function GET(request: Request, { params }: RouteContext<"/api/messages/[messageId]/audio">) {
  const message = getMessage((await params).messageId);
  const event = message && getEventById(message.eventId);
  if (!message?.audioExt || !event) return apiError("not_found");
  if (!canViewMessage(event, message, await getViewer())) return apiError("not_found");
  const opened = await storage().open(audioKey(message));
  if (!opened) return apiError("not_found");
  const download = new URL(request.url).searchParams.get("download") === "1";
  return new Response(Readable.toWeb(opened.stream) as ReadableStream, {
    headers: {
      "Content-Type": audioMime(message.audioExt),
      "Content-Length": String(opened.size),
      "Cache-Control": "private, no-store",
      "Content-Disposition": download ? `attachment; filename="message-${message.id.slice(0, 8)}.${message.audioExt}"` : "inline",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
