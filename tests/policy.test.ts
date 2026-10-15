import { describe, expect, it } from "vitest";
import {
  canBrowseGallery,
  canDownloadArchive,
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
  galleryVisibility: "private",
  guestDownload: false,
  maxPhotosPerGuest: 0,
  ...overrides,
});

const admin: Viewer = { isAdmin: true, unlocked: [] };
const stranger: Viewer = { isAdmin: false, unlocked: [] };
const guest = (id = "guest-1"): Viewer => ({ isAdmin: false, guestId: id, unlocked: ["event-1"] });
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

  it("hides other guests' photos while the gallery is private", () => {
    expect(canViewPhoto(event(), photo(), guest(), "thumb")).toBe(false);
    expect(canBrowseGallery(event(), guest())).toBe(false);
  });

  it("always shows guests their own photos, pending included, in full size", () => {
    expect(canViewPhoto(event(), photo({ guestId: "guest-1", status: "pending" }), guest(), "original")).toBe(true);
  });

  it("hides a guest's own photo once the admin hid it", () => {
    expect(canViewPhoto(event(), photo({ guestId: "guest-1", status: "hidden" }), guest(), "thumb")).toBe(false);
  });

  it("shows only visible photos of others in a shared gallery", () => {
    const shared = event({ galleryVisibility: "guests" });
    expect(canViewPhoto(shared, photo(), guest(), "display")).toBe(true);
    expect(canViewPhoto(shared, photo({ status: "pending" }), guest(), "display")).toBe(false);
    expect(canViewPhoto(shared, photo({ status: "hidden" }), guest(), "display")).toBe(false);
  });

  it("serves originals of others only when downloads are allowed", () => {
    expect(canViewPhoto(event({ galleryVisibility: "guests" }), photo(), guest(), "original")).toBe(false);
    expect(canViewPhoto(event({ galleryVisibility: "guests", guestDownload: true }), photo(), guest(), "original")).toBe(true);
  });

  it("gives nothing to someone who never joined, whatever the settings", () => {
    const open = event({ galleryVisibility: "guests", guestDownload: true });
    expect(canViewPhoto(open, photo(), stranger, "thumb")).toBe(false);
    expect(canViewPhoto(open, photo({ guestId: "guest-1" }), { ...stranger, guestId: "guest-1" }, "thumb")).toBe(false);
  });

  it("lets the admin see everything, hidden included", () => {
    expect(canViewPhoto(event(), photo({ status: "hidden" }), admin, "original")).toBe(true);
  });
});

describe("canDownloadArchive", () => {
  it("requires a shared gallery with downloads enabled", () => {
    expect(canDownloadArchive(event({ guestDownload: true }), guest())).toBe(false);
    expect(canDownloadArchive(event({ galleryVisibility: "guests" }), guest())).toBe(false);
    expect(canDownloadArchive(event({ galleryVisibility: "guests", guestDownload: true }), guest())).toBe(true);
    expect(canDownloadArchive(event(), admin)).toBe(true);
  });
});
