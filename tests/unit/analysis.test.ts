import { describe, expect, it } from "vitest";
import { blurryThreshold, differenceHash, findDuplicate, hammingDistance, laplacianVariance } from "@/lib/images/analysis";

describe("image analysis", () => {
  it("scores a flat image 0 and a sharp checkerboard high", () => {
    const flat = new Uint8Array(64 * 64).fill(128);
    const checker = new Uint8Array(64 * 64).map((_, i) => ((i % 64) + Math.floor(i / 64)) % 2 ? 255 : 0);
    expect(laplacianVariance(flat, 64, 64)).toBe(0);
    expect(laplacianVariance(checker, 64, 64)).toBeGreaterThan(10_000);
  });

  it("hashes brightness steps, and counts differing bits", () => {
    const rising = new Uint8Array(72).map((_, i) => (i % 9) * 20);
    expect(differenceHash(rising)).toBe("0000000000000000");
    const falling = new Uint8Array(72).map((_, i) => 200 - (i % 9) * 20);
    expect(differenceHash(falling)).toBe("ffffffffffffffff");
    expect(hammingDistance("0000000000000000", "ffffffffffffffff")).toBe(64);
    expect(hammingDistance("00000000000000ff", "000000000000000f")).toBe(4);
  });

  it("flags blur against the event's own median, never above the absolute ceiling", () => {
    expect(blurryThreshold([])).toBe(40);
    // A sharp party: the absolute ceiling applies.
    expect(blurryThreshold([300, 500, 800, 20, 450])).toBe(40);
    // Soft photos all night (or bokeh): only the really flat ones stand out.
    expect(blurryThreshold([3, 2, 4, 3, 2, 3])).toBeCloseTo(1.05);
  });

  it("points a duplicate at the first close-enough photo", () => {
    const earlier = [
      { id: "a", hash: "ffff000000000000" },
      { id: "b", hash: "0000000000000000" },
      { id: "c", hash: "0000000000000001" },
      { id: "d", hash: null },
    ];
    expect(findDuplicate("00000000000000ff", earlier)).toBe("b");
    expect(findDuplicate("f0f0f0f0f0f0f0f0", earlier)).toBeNull();
  });
});
