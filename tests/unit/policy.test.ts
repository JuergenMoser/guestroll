import { describe, expect, it } from "vitest";
import {
  albumShared,
  isEventAdmin,
  shareShows,
  canDownloadAlbum,
  canEnterEvent,
  canJoinFreely,
  canViewPhoto,
  uploadState,
  type PolicyEvent,
  type PolicyPhoto,
  type Viewer,
} from "@/lib/policy";

const event = (overrides: Partial<PolicyEvent> = {}): PolicyEvent => ({
  id: "event-1",
  accessCodeHash: null,
  uploadsOpen: true,
  uploadsCloseAt: null,
  maxPhotosPerGuest: 0,
  ...overrides,
});

const admin: Viewer = { admin: { all: true }, unlocked: [] };
const stranger: Viewer = { unlocked: [] };
const guest = (id = "guest-1"): Viewer => ({ guestId: id, unlocked: ["event-1"] });
const photo = (overrides: Partial<PolicyPhoto> = {}): PolicyPhoto => ({ eventId: "event-1", guestId: "guest-2", status: "visible", ...overrides });

describe("canEnterEvent", () => {
  it("requires joining even when the event has no code", () => {
    expect(canEnterEvent(event(), stranger)).toBe(false);
    expect(canJoinFreely(event())).toBe(true);
    expect(canEnterEvent(event(), guest())).toBe(true);
  });

  it("can't be joined freely once a code is set", () => {
    expect(canJoinFreely(event({ accessCodeHash: "hash" }))).toBe(false);
  });

  it("always lets the admin in", () => {
    expect(canEnterEvent(event({ accessCodeHash: "hash" }), admin)).toBe(true);
  });
});

describe("uploadState", () => {
  it("is locked for a viewer who hasn't joined", () => {
    expect(uploadState(event(), stranger, 0)).toEqual({ open: false, reason: "locked" });
  });

  it("closes manually and on schedule", () => {
    expect(uploadState(event({ uploadsOpen: false }), guest(), 0)).toEqual({ open: false, reason: "closed" });
    expect(uploadState(event({ uploadsCloseAt: 1_000 }), guest(), 0, 1_000)).toEqual({ open: false, reason: "closed" });
    expect(uploadState(event({ uploadsCloseAt: 1_000 }), guest(), 0, 999)).toEqual({ open: true });
  });

  it("enforces the per-guest quota, 0 meaning unlimited", () => {
    expect(uploadState(event({ maxPhotosPerGuest: 3 }), guest(), 3)).toEqual({ open: false, reason: "quota" });
    expect(uploadState(event({ maxPhotosPerGuest: 3 }), guest(), 2)).toEqual({ open: true });
    expect(uploadState(event(), guest(), 10_000)).toEqual({ open: true });
  });
});

describe("canViewPhoto", () => {
  it("never serves a photo through another event", () => {
    expect(canViewPhoto(event(), photo({ eventId: "event-2" }), admin, "thumb")).toBe(false);
  });

  it("never shows a guest another guest's photo, in any size or status", () => {
    for (const status of ["visible", "pending", "hidden"] as const) {
      for (const variant of ["thumb", "display", "original"] as const) {
        expect(canViewPhoto(event(), photo({ status }), guest(), variant)).toBe(false);
      }
    }
  });

  it("shows guests their own photos, pending included, in full size", () => {
    expect(canViewPhoto(event(), photo({ guestId: "guest-1", status: "pending" }), guest(), "original")).toBe(true);
    expect(canViewPhoto(event(), photo({ guestId: "guest-1" }), guest(), "thumb")).toBe(true);
  });

  it("hides a guest's own photo once the admin hid it", () => {
    expect(canViewPhoto(event(), photo({ guestId: "guest-1", status: "hidden" }), guest(), "thumb")).toBe(false);
  });

  it("gives nothing to a browser that never joined, even with a matching guest id", () => {
    expect(canViewPhoto(event(), photo({ guestId: "guest-1" }), { ...stranger, guestId: "guest-1" }, "thumb")).toBe(false);
  });

  it("lets the admin see everything, hidden included", () => {
    expect(canViewPhoto(event(), photo({ status: "hidden" }), admin, "original")).toBe(true);
  });
});

describe("gallery links", () => {
  const link = (allowDownload: boolean): Viewer => ({ unlocked: [], shares: [{ shareId: "s1", eventId: "event-1", allowDownload, favoritesOnly: false }] });

  it("show the visible photos of their event only", () => {
    expect(canViewPhoto(event(), photo(), link(false), "display")).toBe(true);
    expect(canViewPhoto(event(), photo({ status: "pending" }), link(true), "thumb")).toBe(false);
    expect(canViewPhoto(event(), photo({ status: "hidden" }), link(true), "thumb")).toBe(false);
    expect(canViewPhoto(event({ id: "event-2" }), photo({ eventId: "event-2" }), link(true), "thumb")).toBe(false);
  });

  it("play videos whatever their download setting, and play nothing else", () => {
    const video = photo({ mediaType: "video/mp4" });
    expect(canViewPhoto(event(), video, link(false), "play")).toBe(true);
    expect(canViewPhoto(event(), video, link(false), "original")).toBe(false);
    expect(canViewPhoto(event(), photo(), link(true), "play")).toBe(false);
    expect(canViewPhoto(event(), photo({ mediaType: "video/mp4", status: "pending" }), link(true), "play")).toBe(false);
  });

  it("serve originals and the ZIP only when downloads are allowed", () => {
    expect(canViewPhoto(event(), photo(), link(false), "original")).toBe(false);
    expect(canViewPhoto(event(), photo(), link(true), "original")).toBe(true);
    expect(canDownloadAlbum(event(), link(false), link(false).shares![0])).toBe(false);
    expect(canDownloadAlbum(event(), link(true), link(true).shares![0])).toBe(true);
    // A grant the browser doesn't hold proves nothing.
    expect(canDownloadAlbum(event(), link(true), { shareId: "other", eventId: "event-1", allowDownload: true, favoritesOnly: false })).toBe(false);
    expect(canDownloadAlbum(event(), guest())).toBe(false);
  });

  it("don't let a guest join or upload", () => {
    expect(canEnterEvent(event(), link(true))).toBe(false);
  });
});

describe("organizers", () => {
  const organizer = (eventIds: string[]): Viewer => ({ admin: { all: false, eventIds }, unlocked: [] });

  it("manage their own events like an owner", () => {
    expect(isEventAdmin("event-1", organizer(["event-1"]))).toBe(true);
    expect(canEnterEvent(event(), organizer(["event-1"]))).toBe(true);
    expect(canViewPhoto(event(), photo({ status: "hidden", guestId: "someone" }), organizer(["event-1"]), "original")).toBe(true);
    expect(canDownloadAlbum(event(), organizer(["event-1"]))).toBe(true);
  });

  it("are strangers to every other event", () => {
    const other = organizer(["event-2"]);
    expect(isEventAdmin("event-1", other)).toBe(false);
    expect(canEnterEvent(event(), other)).toBe(false);
    expect(canViewPhoto(event(), photo(), other, "thumb")).toBe(false);
    expect(canDownloadAlbum(event(), other)).toBe(false);
    expect(isEventAdmin("event-1", organizer([]))).toBe(false);
  });

  it("owners manage every event", () => {
    expect(isEventAdmin("anything", admin)).toBe(true);
    expect(isEventAdmin("event-1", stranger)).toBe(false);
  });
});

describe("favorites-only links", () => {
  const favLink: Viewer = { unlocked: [], shares: [{ shareId: "f", eventId: "event-1", allowDownload: true, favoritesOnly: true }] };

  it("show the visible favorites and nothing else", () => {
    expect(canViewPhoto(event(), photo({ favorite: true }), favLink, "original")).toBe(true);
    expect(canViewPhoto(event(), photo({ favorite: false }), favLink, "thumb")).toBe(false);
    expect(canViewPhoto(event(), photo({ favorite: true, status: "hidden" }), favLink, "thumb")).toBe(false);
    expect(shareShows({ favoritesOnly: false }, { status: "visible", favorite: false })).toBe(true);
  });

  it("add up with a whole-album link unlocked in the same browser", () => {
    const both: Viewer = { unlocked: [], shares: [...favLink.shares!, { shareId: "a", eventId: "event-1", allowDownload: false, favoritesOnly: false }] };
    expect(canViewPhoto(event(), photo({ favorite: false }), both, "display")).toBe(true);
    expect(canViewPhoto(event(), photo({ favorite: false }), both, "original")).toBe(false);
    expect(canViewPhoto(event(), photo({ favorite: true }), both, "original")).toBe(true);
  });
});

describe("shared album", () => {
  const during = event({ sharedAlbum: "during" });

  it("is off unless the hosts turn it on: the private album stays the default", () => {
    expect(albumShared(event())).toBe(false);
    expect(albumShared(event({ sharedAlbum: "off" }))).toBe(false);
    expect(canViewPhoto(event(), photo(), guest(), "thumb")).toBe(false);
  });

  it("shows guests the others' visible photos, never their originals", () => {
    expect(canViewPhoto(during, photo(), guest(), "thumb")).toBe(true);
    expect(canViewPhoto(during, photo(), guest(), "display")).toBe(true);
    expect(canViewPhoto(during, photo(), guest(), "original")).toBe(false);
    // Their own originals stay theirs to download.
    expect(canViewPhoto(during, photo({ guestId: "guest-1" }), guest(), "original")).toBe(true);
  });

  it("never shows the others' pending or hidden photos", () => {
    expect(canViewPhoto(during, photo({ status: "pending" }), guest(), "thumb")).toBe(false);
    expect(canViewPhoto(during, photo({ status: "hidden" }), guest(), "thumb")).toBe(false);
  });

  it("still needs the event joined, and stays within its event", () => {
    expect(canViewPhoto(during, photo(), stranger, "thumb")).toBe(false);
    expect(canViewPhoto(during, photo({ eventId: "event-2" }), guest(), "thumb")).toBe(false);
  });

  it("with `after`, opens once the event has ended, by hand or past its closing time", () => {
    const now = 1_000_000;
    expect(albumShared(event({ sharedAlbum: "after" }), now)).toBe(false);
    expect(albumShared(event({ sharedAlbum: "after", endedAt: now - 1 }), now)).toBe(true);
    expect(albumShared(event({ sharedAlbum: "after", uploadsCloseAt: now - 1 }), now)).toBe(true);
    expect(albumShared(event({ sharedAlbum: "after", uploadsCloseAt: now + 1 }), now)).toBe(false);
  });
});
