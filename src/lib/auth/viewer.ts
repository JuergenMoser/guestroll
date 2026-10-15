import "server-only";
import type { ShareGrant, Viewer } from "@/lib/policy";
import { getShareById, isShareActive } from "@/lib/shares";
import { getAdmin } from "./admin";
import { getGuestSession, getShareSession } from "./session";

export async function getViewer(): Promise<Viewer> {
  const [admin, guest, share] = await Promise.all([getAdmin(), getGuestSession(), getShareSession()]);
  // Re-read on every request: a revoked or expired link stops working at once.
  const shares: ShareGrant[] = (share.shares ?? [])
    .map((id) => getShareById(id))
    .filter((s) => s !== undefined && isShareActive(s))
    .map((s) => ({ shareId: s!.id, eventId: s!.eventId, allowDownload: s!.allowDownload, favoritesOnly: s!.favoritesOnly }));
  return { admin: admin?.scope, guestId: guest.guestId, unlocked: guest.unlocked ?? [], shares };
}
