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
  galleryVisibility: "private" | "guests";
  guestDownload: boolean;
  maxPhotosPerGuest: number;
}

export interface PolicyPhoto {
  eventId: string;
  guestId: string;
  status: "visible" | "pending" | "hidden";
}

export interface Viewer {
  isAdmin: boolean;
  guestId?: string;
  unlocked: readonly string[];
}

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

export function canBrowseGallery(event: PolicyEvent, viewer: Viewer): boolean {
  if (viewer.isAdmin) return true;
  return canEnterEvent(event, viewer) && event.galleryVisibility === "guests";
}

/**
 * A guest always sees their own pictures (even pending moderation), sees other
 * people's only once they are visible and the gallery is shared, and gets the
 * full-resolution file only when the organiser allowed downloads — or when it
 * is a picture they took themselves.
 */
export function canViewPhoto(event: PolicyEvent, photo: PolicyPhoto, viewer: Viewer, variant: PhotoVariant): boolean {
  if (photo.eventId !== event.id) return false;
  if (viewer.isAdmin) return true;
  if (!canEnterEvent(event, viewer) || photo.status === "hidden") return false;

  const own = viewer.guestId !== undefined && photo.guestId === viewer.guestId;
  if (own) return true;

  if (photo.status !== "visible" || event.galleryVisibility !== "guests") return false;
  return variant !== "original" || event.guestDownload;
}

export function canDownloadArchive(event: PolicyEvent, viewer: Viewer): boolean {
  return viewer.isAdmin || (canBrowseGallery(event, viewer) && event.guestDownload);
}
