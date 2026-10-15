import { describe, expect, it } from "vitest";
import { containRect, coverRect, fitsByCover, FADE_SECONDS, MAX_PHOTOS, shotAt, timeline, TITLE_SECONDS } from "@/lib/slideshow";

describe("slideshow timing", () => {
  const tl = timeline(3, 4);

  it("is a title, each photo in turn, then the title again", () => {
    expect(tl.duration).toBe(TITLE_SECONDS * 2 + 12);
    expect(shotAt(0.2, tl)).toMatchObject({ kind: "title" });
    expect(shotAt(TITLE_SECONDS + 0.1, tl)).toMatchObject({ kind: "photo", index: 0 });
    expect(shotAt(TITLE_SECONDS + 5, tl)).toMatchObject({ kind: "photo", index: 1 });
    expect(shotAt(TITLE_SECONDS + 12.5, tl)).toMatchObject({ kind: "title" });
  });

  it("fades into the next photo at the end of each, never after the last", () => {
    const fading = shotAt(TITLE_SECONDS + 4 - FADE_SECONDS / 2, tl);
    expect(fading.kind === "photo" && fading.next?.index).toBe(1);
    expect(fading.kind === "photo" && fading.next!.mix).toBeCloseTo(0.5);
    const last = shotAt(TITLE_SECONDS + 12 - 0.1, tl);
    expect(last.kind === "photo" && last.next).toBeUndefined();
  });

  it("caps very long albums", () => {
    expect(timeline(1000, 2).photos).toBe(MAX_PHOTOS);
    expect(shotAt(5, timeline(0, 4))).toMatchObject({ kind: "title" });
  });

  it("always covers the frame while zooming", () => {
    for (const p of [0, 0.5, 1]) {
      const r = coverRect(800, 1200, 1920, 1080, p, 3);
      expect(r.w).toBeGreaterThanOrEqual(1920);
      expect(r.h).toBeGreaterThanOrEqual(1080);
      expect(r.x).toBeLessThanOrEqual(0);
      expect(r.x + r.w).toBeGreaterThanOrEqual(1920);
    }
  });
});

describe("photo placement", () => {
  it("crops photos close to the frame's shape, shows the others whole", () => {
    expect(fitsByCover(4000, 3000, 1920, 1080)).toBe(true);
    expect(fitsByCover(3000, 4000, 1920, 1080)).toBe(false);
    expect(fitsByCover(3000, 4000, 1080, 1920)).toBe(true);
    const r = containRect(3000, 4000, 1920, 1080, 1);
    expect(r.h).toBeLessThanOrEqual(1080);
    expect(r.x).toBeGreaterThan(0);
  });
});
