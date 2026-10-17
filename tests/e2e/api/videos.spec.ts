import fs from "node:fs";
import path from "node:path";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { admin, client, createEvent, photo } from "../helpers";

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, "../../fixtures", name));

/** The body the guest page sends: the poster frame, then the video (see lib/video/receive.ts). */
function sendVideo(api: APIRequestContext, slug: string, video: Buffer, poster?: Buffer, query = "") {
  return (async () => {
    const frame = poster ?? (await photo());
    return api.post(`/api/e/${slug}/photos${query}`, {
      headers: { "Content-Type": "application/vnd.guestroll.video", "X-Poster-Bytes": String(frame.length) },
      data: Buffer.concat([frame, video]),
    });
  })();
}

test.describe("videos", () => {
  test("are refused unless the event takes them", async ({ baseURL }) => {
    const event = await createEvent(await admin(baseURL!));
    const guest = await client(baseURL!);
    await guest.post(`/api/e/${event.slug}/join`);
    const res = await sendVideo(guest, event.slug, fixture("clip.webm"));
    expect(res.status()).toBe(403);
    expect((await res.json()).error).toBe("videos_off");
  });

  test("a guest sends one, and it plays, seeks and downloads as filmed", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host, { allowVideos: true });
    const guest = await client(baseURL!);
    await guest.post(`/api/e/${event.slug}/join`);
    const clip = fixture("clip.mov");

    const res = await sendVideo(guest, event.slug, clip);
    expect(res.status()).toBe(201);
    const { photo: dto } = await res.json();
    expect(dto.video.durationMs).toBeGreaterThan(1400);
    expect(dto.video.durationMs).toBeLessThan(1600);

    // The grid shows its poster, like any photo.
    const thumb = await guest.get(`/api/media/${dto.id}?v=thumb`);
    expect(thumb.headers()["content-type"]).toBe("image/webp");

    const whole = await guest.get(`/api/media/${dto.id}?v=play`);
    expect(whole.status()).toBe(200);
    expect(whole.headers()["content-type"]).toBe("video/quicktime");
    expect(whole.headers()["accept-ranges"]).toBe("bytes");
    expect(Buffer.compare(await whole.body(), clip)).toBe(0);

    const slice = await guest.get(`/api/media/${dto.id}?v=play`, { headers: { Range: "bytes=10-19" } });
    expect(slice.status()).toBe(206);
    expect(slice.headers()["content-range"]).toBe(`bytes 10-19/${clip.length}`);
    expect(Buffer.compare(await slice.body(), clip.subarray(10, 20))).toBe(0);
    expect((await guest.get(`/api/media/${dto.id}?v=play`, { headers: { Range: `bytes=${clip.length}-` } })).status()).toBe(416);

    const download = await host.get(`/api/media/${dto.id}?v=original&download=1`);
    expect(download.headers()["content-disposition"]).toContain(`${dto.id}.mov`);

    // A photo has nothing to play.
    const [photoId] = await (async () => {
      const r = await guest.post(`/api/e/${event.slug}/photos`, { multipart: { photo: { name: "p.jpg", mimeType: "image/jpeg", buffer: await photo() } } });
      return [(await r.json()).photo.id as string];
    })();
    expect((await guest.get(`/api/media/${photoId}?v=play`)).status()).toBe(404);

    // Another guest, without a shared album, gets nothing of it.
    const other = await client(baseURL!);
    await other.post(`/api/e/${event.slug}/join`);
    expect((await other.get(`/api/media/${dto.id}?v=play`)).status()).toBe(404);

    // Taken back by its guest: gone, files included.
    expect((await guest.delete(`/api/e/${event.slug}/photos/${dto.id}`)).status()).toBeLessThan(300);
    expect((await host.get(`/api/media/${dto.id}?v=original`)).status()).toBe(404);
  });

  test("too long, not a video, or a broken body are refused", async ({ baseURL }) => {
    const event = await createEvent(await admin(baseURL!), { allowVideos: true });
    const guest = await client(baseURL!);
    await guest.post(`/api/e/${event.slug}/join`);

    const long = await sendVideo(guest, event.slug, fixture("clip.mp4"));
    expect((await long.json()).error).toBe("video_too_long");

    const fake = await sendVideo(guest, event.slug, Buffer.from("this is not a video, only its name says so"));
    expect((await fake.json()).error).toBe("invalid_video");

    const noPoster = await guest.post(`/api/e/${event.slug}/photos`, {
      headers: { "Content-Type": "application/vnd.guestroll.video" },
      data: fixture("clip.webm"),
    });
    expect(noPoster.status()).toBe(400);

    // Nothing was kept from the refused ones.
    expect((await (await guest.get(`/api/e/${event.slug}/photos`)).json()).photos).toHaveLength(0);
  });

  test("the album ZIP holds the video with its own extension", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host, { allowVideos: true });
    const guest = await client(baseURL!);
    await guest.post(`/api/e/${event.slug}/join`);
    expect((await sendVideo(guest, event.slug, fixture("clip.webm"))).status()).toBe(201);
    const zip = await host.get(`/api/admin/events/${event.id}/archive`);
    expect(zip.status()).toBe(200);
    expect((await zip.body()).toString("latin1")).toMatch(/0001-guest-[0-9a-f]{8}\.webm/);
  });
});
