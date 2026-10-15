import { describe, expect, it } from "vitest";
import {
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
  const link = (allowDownload: boolean): Viewer => ({ isAdmin: false, unlocked: [], shares: [{ eventId: "event-1", allowDownload }] });

  it("show the visible photos of their event only", () => {
    expect(canViewPhoto(event(), photo(), link(false), "display")).toBe(true);
    expect(canViewPhoto(event(), photo({ status: "pending" }), link(true), "thumb")).toBe(false);
    expect(canViewPhoto(event(), photo({ status: "hidden" }), link(true), "thumb")).toBe(false);
    expect(canViewPhoto(event({ id: "event-2" }), photo({ eventId: "event-2" }), link(true), "thumb")).toBe(false);
  });

  it("serve originals and the ZIP only when downloads are allowed", () => {
    expect(canViewPhoto(event(), photo(), link(false), "original")).toBe(false);
    expect(canViewPhoto(event(), photo(), link(true), "original")).toBe(true);
    expect(canDownloadAlbum(event(), link(false))).toBe(false);
    expect(canDownloadAlbum(event(), link(true))).toBe(true);
    expect(canDownloadAlbum(event(), guest())).toBe(false);
  });

  it("don't let a guest join or upload", () => {
    expect(canEnterEvent(event(), link(true))).toBe(false);
  });
});
