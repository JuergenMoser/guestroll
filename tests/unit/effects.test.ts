import { describe, expect, it } from "vitest";
import { applyFilter, frameLayout, FILTERS } from "@/lib/effects";

const pixel = (r: number, g: number, b: number) => new Uint8ClampedArray([r, g, b, 255]);

describe("filters", () => {
  it("leave the photo alone with none, and never touch alpha", () => {
    for (const f of FILTERS) {
      const p = pixel(200, 120, 40);
      applyFilter(p, f);
      expect(p[3]).toBe(255);
      if (f === "none") expect([...p]).toEqual([200, 120, 40, 255]);
    }
  });

  it("black & white is grey, warm is warmer, vivid is more saturated", () => {
    const bw = pixel(200, 120, 40);
    applyFilter(bw, "bw");
    expect(bw[0]).toBe(bw[1]);
    expect(bw[1]).toBe(bw[2]);

    const warm = pixel(120, 120, 120);
    applyFilter(warm, "warm");
    expect(warm[0]).toBeGreaterThan(warm[2]);

    const vivid = pixel(150, 120, 100);
    applyFilter(vivid, "vivid");
    expect(vivid[0] - vivid[2]).toBeGreaterThan(50);
  });

  it("vintage lifts the blacks", () => {
    const black = pixel(0, 0, 0);
    applyFilter(black, "vintage");
    expect(Math.min(black[0], black[1], black[2])).toBeGreaterThan(10);
  });
});

describe("frames", () => {
  it("add a deeper bottom for the caption, sized on the short side", () => {
    const print = frameLayout("print", 1000, 800);
    expect(print).toMatchObject({ x: 44, y: 44, width: 1088, height: 1004, captionHeight: 160 });
    expect(frameLayout("none", 1000, 800)).toEqual({ width: 1000, height: 800, x: 0, y: 0, captionHeight: 0 });
    expect(frameLayout("stamp", 1000, 800).width).toBe(1000);
  });
});
