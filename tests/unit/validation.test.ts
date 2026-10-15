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
