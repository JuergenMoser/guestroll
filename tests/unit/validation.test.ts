import { describe, expect, it } from "vitest";
import { parseEventInput, parseGuestName } from "@/lib/validation";

describe("parseEventInput", () => {
  it("requires a name on create but not on patch", () => {
    expect(parseEventInput({}, false).ok).toBe(false);
    expect(parseEventInput({}, true)).toEqual({ ok: true, value: {} });
  });

  it("returns only the keys present in a patch", () => {
    expect(parseEventInput({ uploadsOpen: false }, true)).toEqual({ ok: true, value: { uploadsOpen: false } });
  });

  it("takes the videos switch as a boolean only", () => {
    expect(parseEventInput({ allowVideos: true }, true)).toEqual({ ok: true, value: { allowVideos: true } });
    expect(parseEventInput({ allowVideos: "yes" }, true).ok).toBe(false);
  });

  it("rejects a short access code and accepts null to remove it", () => {
    const short = parseEventInput({ accessCode: "12345" }, true);
    expect(short.ok).toBe(false);
    expect(parseEventInput({ accessCode: null }, true)).toEqual({ ok: true, value: { accessCode: null } });
    expect(parseEventInput({ accessCode: " 123456 " }, true)).toEqual({ ok: true, value: { accessCode: "123456" } });
  });

  it("validates enums, colors, dates and the quota", () => {
    const result = parseEventInput(
      { moderation: "later", accentColor: "red", eventDate: "17/10/2026", maxPhotosPerGuest: -1, captureMode: "video" },
      true,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(["accentColor", "captureMode", "eventDate", "maxPhotosPerGuest", "moderation"]);
    }
  });

  it("normalises a valid create", () => {
    const result = parseEventInput({ name: "  Wedding  ", accentColor: "#ABCDEF", captureMode: "both" }, false);
    expect(result).toEqual({ ok: true, value: { name: "Wedding", description: "", accentColor: "#abcdef", captureMode: "both" } });
  });

  it("refuses non-object bodies", () => {
    expect(parseEventInput("hello", false).ok).toBe(false);
    expect(parseEventInput(null, true).ok).toBe(false);
  });
});

describe("parseGuestName", () => {
  it("strips control characters and trims to 40 chars", () => {
    expect(parseGuestName("Ca\u0000mi\nlle ")).toBe("Camille");
    expect(parseGuestName("x".repeat(60))).toHaveLength(40);
    expect(parseGuestName("   ")).toBeNull();
    expect(parseGuestName(42)).toBeNull();
  });
});

describe("parseShareLinkInput", () => {
  it("generates the password when none is given, and defaults to 30 days with downloads", async () => {
    const { parseShareLinkInput } = await import("@/lib/validation");
    expect(parseShareLinkInput({})).toEqual({ ok: true, value: { password: null, label: "", allowDownload: true, favoritesOnly: false, expiresInDays: 30 } });
  });

  it("refuses a short password and an out-of-range validity", async () => {
    const { parseShareLinkInput } = await import("@/lib/validation");
    const res = parseShareLinkInput({ password: "short", expiresInDays: -1 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(Object.keys(res.errors).sort()).toEqual(["expiresInDays", "password"]);
  });

  it("accepts the new event automation fields", async () => {
    const { parseEventInput } = await import("@/lib/validation");
    const res = parseEventInput({ collectGuestEmails: true, emailGuestsGallery: true, galleryLinkDays: 0, galleryMailIncludesPassword: false }, true);
    expect(res).toEqual({ ok: true, value: { collectGuestEmails: true, emailGuestsGallery: true, galleryLinkDays: 0, galleryMailIncludesPassword: false } });
    expect(parseEventInput({ galleryLinkDays: 99999 }, true).ok).toBe(false);
  });
});
