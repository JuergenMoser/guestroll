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
  favorite?: boolean;
}

/** A gallery link this browser unlocked with its password (still active). */
export interface ShareGrant {
  shareId: string;
  eventId: string;
  allowDownload: boolean;
  /** Limited to the photos the hosts marked as favorites. */
  favoritesOnly: boolean;
}

/** What one gallery link shows: visible photos, only the favorites if it says so. */
export function shareShows(grant: Pick<ShareGrant, "favoritesOnly">, photo: Pick<PolicyPhoto, "status" | "favorite">): boolean {
  return photo.status === "visible" && (!grant.favoritesOnly || photo.favorite === true);
}

/** Which events a signed-in admin manages: owners all of them, organizers their own. */
export type AdminScope = { all: true } | { all: false; eventIds: readonly string[] };

export interface Viewer {
  admin?: AdminScope;
  guestId?: string;
  unlocked: readonly string[];
  shares?: readonly ShareGrant[];
}

export function isEventAdmin(eventId: string, viewer: Pick<Viewer, "admin">): boolean {
  const scope = viewer.admin;
  return Boolean(scope && (scope.all || scope.eventIds.includes(eventId)));
}

const sharesFor = (event: PolicyEvent, viewer: Viewer) => viewer.shares?.filter((s) => s.eventId === event.id) ?? [];

/**
 * Entering always requires the event in the guest cookie, even without an access
 * code: the guest page joins it automatically on first visit. A copied media URL
 * is therefore useless in a browser that never opened the event page itself.
 */
export function canEnterEvent(event: PolicyEvent, viewer: Viewer): boolean {
  return isEventAdmin(event.id, viewer) || viewer.unlocked.includes(event.id);
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
 * event's admins see everything, and a gallery link the admin created (unlocked with
 * its password) shows the visible photos, originals only if it allows downloads.
 */
export function canViewPhoto(event: PolicyEvent, photo: PolicyPhoto, viewer: Viewer, variant: PhotoVariant): boolean {
  if (photo.eventId !== event.id) return false;
  if (isEventAdmin(event.id, viewer)) return true;
  // Several links to one event can be unlocked in one browser: any of them may grant the photo.
  if (sharesFor(event, viewer).some((s) => shareShows(s, photo) && (variant !== "original" || s.allowDownload))) return true;
  if (!canEnterEvent(event, viewer) || photo.status === "hidden") return false;
  return viewer.guestId !== undefined && photo.guestId === viewer.guestId;
}

/** Album ZIP: the admin, or a gallery link that allows downloads (its ZIP holds what the link shows). */
export function canDownloadAlbum(event: PolicyEvent, viewer: Viewer, grant?: ShareGrant): boolean {
  if (isEventAdmin(event.id, viewer)) return true;
  return grant ? grant.eventId === event.id && grant.allowDownload && sharesFor(event, viewer).some((s) => s.shareId === grant.shareId) : false;
}
