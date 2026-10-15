import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { freshEnv } from "../helpers/env";

let env: Awaited<ReturnType<typeof freshEnv>> | undefined;
afterEach(() => env?.cleanup());

// Like a photo: large shapes (what the hash sees) and fine detail (what blur erases).
const sharpPhoto = (seed: number) => {
  const stripes = Array.from({ length: 150 }, (_, i) => `<rect x="${i * 8}" y="0" width="3" height="900" fill="#222" opacity="0.5"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900">
    <rect width="1200" height="900" fill="#d8c3a5"/>
    <circle cx="${300 + seed * 40}" cy="380" r="260" fill="#8e5d3b"/>
    <rect x="700" y="420" width="420" height="420" fill="#2f4858"/>
    ${stripes}
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
};

describe("photo analysis", () => {
  it("tells a sharp photo from a blurred one, and a re-take from a new shot", async () => {
    const { analyze, hammingDistance, BLURRY_BELOW, DUPLICATE_DISTANCE } = await import("@/lib/images/analysis");
    const original = await sharpPhoto(0);
    const blurred = await sharp(original).blur(6).jpeg().toBuffer();
    const a = await analyze(original);
    expect(a.sharpness).toBeGreaterThan(BLURRY_BELOW * 10);
    expect((await analyze(blurred)).sharpness).toBeLessThan(BLURRY_BELOW);

    const recompressed = await sharp(original).resize(1000).jpeg({ quality: 60 }).toBuffer();
    expect(hammingDistance(a.hash, (await analyze(recompressed)).hash)).toBeLessThanOrEqual(DUPLICATE_DISTANCE);
    const gradient = await sharp({ create: { width: 900, height: 900, channels: 3, background: "#ffffff" } })
      .composite([{ input: Buffer.from('<svg width="900" height="900"><rect width="450" height="900" fill="black"/></svg>') }])
      .jpeg()
      .toBuffer();
    expect(hammingDistance(a.hash, (await analyze(gradient)).hash)).toBeGreaterThan(DUPLICATE_DISTANCE);
  });

  it("marks the second copy of a photo, and lets it go when the first is deleted", async () => {
    env = await freshEnv();
    const events = await import("@/lib/events");
    const photos = await import("@/lib/photos");
    const { processPhoto } = await import("@/lib/images/process");
    const event = events.createEvent({ name: "Burst" });
    const shot = await sharpPhoto(1);
    const insert = async (id: string, input: Buffer) => {
      const p = await processPhoto(input);
      return photos.insertPhoto({ id, eventId: event.id, guestId: "g", guestName: null, width: p.width, height: p.height, bytes: 1, status: "visible", analysis: p.analysis });
    };
    const first = await insert("11111111-1111-4111-8111-111111111111", shot);
    const again = await insert("22222222-2222-4222-8222-222222222222", await sharp(shot).jpeg({ quality: 70 }).toBuffer());
    expect(first.duplicateOf).toBeNull();
    expect(again.duplicateOf).toBe(first.id);

    const listed = photos.listPhotos(events.getEventById(event.id)!, "album", { duplicates: true });
    expect(listed.map((p) => p.id)).toEqual([again.id]);
    await photos.deletePhotos([first.id], event.id);
    expect(photos.getPhoto(again.id)!.duplicateOf).toBeNull();
  });

  it("analyses photos sent before the analysis existed, oldest first", async () => {
    env = await freshEnv();
    const events = await import("@/lib/events");
    const photos = await import("@/lib/photos");
    const { processPhoto } = await import("@/lib/images/process");
    const { writePhotoFiles } = await import("@/lib/storage/files");
    const { analysePending } = await import("@/lib/images/backfill");
    const event = events.createEvent({ name: "Old album" });
    const shot = await sharpPhoto(2);
    for (const [i, id] of ["33333333-3333-4333-8333-333333333333", "44444444-4444-4444-8444-444444444444"].entries()) {
      const p = await processPhoto(shot);
      await writePhotoFiles(event.id, id, p.files);
      // As an older version stored them: no analysis.
      photos.insertPhoto({ id, eventId: event.id, guestId: `g${i}`, guestName: null, width: p.width, height: p.height, bytes: 1, status: "visible" });
      await new Promise((r) => setTimeout(r, 5));
    }
    // One with its files gone: marked as done, never retried.
    photos.insertPhoto({ id: "55555555-5555-4555-8555-555555555555", eventId: event.id, guestId: "g", guestName: null, width: 1, height: 1, bytes: 1, status: "visible" });

    expect(await analysePending()).toBe(3);
    expect(await analysePending()).toBe(0);
    const [a, b] = ["33333333-3333-4333-8333-333333333333", "44444444-4444-4444-8444-444444444444"].map((id) => photos.getPhoto(id)!);
    expect(a.sharpness).toBeGreaterThan(0);
    expect(a.duplicateOf).toBeNull();
    expect(b.duplicateOf).toBe(a.id);
    expect(photos.getPhoto("55555555-5555-4555-8555-555555555555")!.hash).toBe("");
  });
});
