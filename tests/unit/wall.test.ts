import { describe, expect, it } from "vitest";
import { DEFAULT_WALL, parseWallStyle, readWallStyle } from "@/lib/wall";

describe("wall style", () => {
  it("falls back to the defaults for anything unknown", () => {
    expect(parseWallStyle(null)).toEqual(DEFAULT_WALL);
    expect(parseWallStyle({ layout: "carousel", showQr: "yes" })).toEqual(DEFAULT_WALL);
    expect(readWallStyle("{broken")).toEqual(DEFAULT_WALL);
  });

  it("keeps valid choices and clamps the pace", () => {
    expect(parseWallStyle({ layout: "mosaic", showQr: true, slideSeconds: 1 })).toMatchObject({ layout: "mosaic", showQr: true, slideSeconds: 3 });
    expect(parseWallStyle({ slideSeconds: 999 }).slideSeconds).toBe(30);
    expect(parseWallStyle({ slideSeconds: 7.6 }).slideSeconds).toBe(8);
  });
});
