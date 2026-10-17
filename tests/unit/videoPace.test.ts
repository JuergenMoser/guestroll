import { describe, expect, it } from "vitest";
import { tooSlow } from "@/lib/video/receive";

describe("tooSlow", () => {
  it("leaves a slow start alone for its first minute", () => {
    expect(tooSlow(1, 59_000)).toBe(false);
  });

  it("cuts a trickle off once past it, whatever the idle timer says", () => {
    // One byte every 29 seconds for ten minutes.
    expect(tooSlow(20, 600_000)).toBe(true);
    expect(tooSlow(32 * 1024 * 61, 61_000)).toBe(false);
  });

  it("ends any upload after half an hour", () => {
    expect(tooSlow(10 * 1024 * 1024 * 1024, 31 * 60_000)).toBe(true);
  });
});
