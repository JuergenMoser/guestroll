/**
 * Every access decision about events and photos, as pure functions.
 * Routes ask this module and never re-derive a rule inline, so the security
 * model is readable in one place and covered by `tests/policy.test.ts`.
 */

export type PhotoVariant = "thumb" | "display" | "original";

export interface PolicyEvent {
  id: string;
  accessCodeHash: string | null;
  uploadsOpen: boolean;
  uploadsCloseAt: number | null;
  maxPhotosPerGuest: number;
}

export interface PolicyPhoto {
  eventId: string;
  guestId: string;
  status: "visible" | "pending" | "hidden";
}

/** A gallery link this browser unlocked with its password (still active). */
export interface ShareGrant {
  eventId: string;
  allowDownload: boolean;
}

export interface Viewer {
  isAdmin: boolean;
  guestId?: string;
  unlocked: readonly string[];
  shares?: readonly ShareGrant[];
}

const shareFor = (event: PolicyEvent, viewer: Viewer) => viewer.shares?.find((s) => s.eventId === event.id);

/**
 * Entering always requires the event in the guest cookie, even without an access
 * code: the guest page joins it automatically on first visit. A copied media URL
 * is therefore useless in a browser that never opened the event page itself.
 */
export function canEnterEvent(event: PolicyEvent, viewer: Viewer): boolean {
  return viewer.isAdmin || viewer.unlocked.includes(event.id);
}

/** Events without an access code are joined just by opening their page. */
export const canJoinFreely = (event: PolicyEvent): boolean => event.accessCodeHash === null;

export type UploadState = { open: true } | { open: false; reason: "closed" | "quota" | "locked" };

export function uploadState(event: PolicyEvent, viewer: Viewer, uploadedByGuest: number, now = Date.now()): UploadState {
  if (!canEnterEvent(event, viewer)) return { open: false, reason: "locked" };
  if (!event.uploadsOpen || (event.uploadsCloseAt !== null && now >= event.uploadsCloseAt)) {
    return { open: false, reason: "closed" };
  }
  if (event.maxPhotosPerGuest > 0 && uploadedByGuest >= event.maxPhotosPerGuest) {
    return { open: false, reason: "quota" };
  }
  return { open: true };
}

/**
 * Guests only ever see the photos they took themselves (pending moderation
 * included, hidden ones excluded). The rest of the album is the hosts': the
 * admin sees everything, and a gallery link the admin created (unlocked with
 * its password) shows the visible photos, originals only if it allows downloads.
 */
export function canViewPhoto(event: PolicyEvent, photo: PolicyPhoto, viewer: Viewer, variant: PhotoVariant): boolean {
  if (photo.eventId !== event.id) return false;
  if (viewer.isAdmin) return true;
  const share = shareFor(event, viewer);
  if (share && photo.status === "visible" && (variant !== "original" || share.allowDownload)) return true;
  if (!canEnterEvent(event, viewer) || photo.status === "hidden") return false;
  return viewer.guestId !== undefined && photo.guestId === viewer.guestId;
}

/** Whole-album ZIP: the admin, or a gallery link that allows downloads. */
export function canDownloadAlbum(event: PolicyEvent, viewer: Viewer): boolean {
  return viewer.isAdmin || Boolean(shareFor(event, viewer)?.allowDownload);
}
