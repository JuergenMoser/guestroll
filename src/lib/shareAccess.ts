import "server-only";
import type { EventRow, ShareLinkRow } from "@/lib/db/schema";
import { getViewer } from "@/lib/auth/viewer";
import { getEventById } from "@/lib/events";
import type { Viewer } from "@/lib/policy";
import { getShareByToken, isShareActive } from "@/lib/shares";

/**
 * Resolves a gallery link for a request: the link must exist, be active, and
 * have been unlocked by this browser (its id in the share cookie).
 */
export async function resolveShare(token: string): Promise<
  { status: "missing" } | { status: "locked"; share: ShareLinkRow; event: EventRow } | { status: "open"; share: ShareLinkRow; event: EventRow; viewer: Viewer }
> {
  const share = getShareByToken(token);
  const event = share && isShareActive(share) ? getEventById(share.eventId) : undefined;
  if (!share || !event) return { status: "missing" };
  const viewer = await getViewer();
  const unlocked = viewer.shares?.some((s) => s.eventId === event.id) ?? false;
  return unlocked ? { status: "open", share, event, viewer } : { status: "locked", share, event };
}
