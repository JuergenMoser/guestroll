import { expect, test } from "@playwright/test";
import { admin, client, createEvent, photo } from "../helpers";

test.describe("QR codes per table", () => {
  test("photos sent after scanning a table's code are tagged with it", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host);
    const other = await createEvent(host);
    const spot = (await (await host.post(`/api/admin/events/${event.id}/spots`, { data: { label: "Table 5" } })).json()).spot;
    const foreign = (await (await host.post(`/api/admin/events/${other.id}/spots`, { data: { label: "Elsewhere" } })).json()).spot;
    expect(spot.id).toMatch(/^[a-z0-9]{10}$/);

    const guest = await client(baseURL!);
    await guest.post(`/api/e/${event.slug}/join`);
    const send = async (at: string) =>
      (await (await guest.post(`/api/e/${event.slug}/photos?at=${at}`, { multipart: { photo: { name: "p.jpg", mimeType: "image/jpeg", buffer: await photo() } } })).json()).photo.id;
    const tagged = await send(spot.id);
    // Another event's code is ignored: the photo is kept, untagged.
    const untagged = await send(foreign.id);

    const filtered = (await (await host.get(`/api/admin/events/${event.id}/photos?spot=${spot.id}`)).json()).photos.map((p: { id: string }) => p.id);
    expect(filtered).toEqual([tagged]);
    expect(filtered).not.toContain(untagged);
    const listed = (await (await host.get(`/api/admin/events/${event.id}/spots`)).json()).spots;
    expect(listed).toEqual([{ id: spot.id, label: "Table 5", photos: 1 }]);

    // Its QR code, and none for a place of another event.
    const png = await host.get(`/api/admin/events/${event.id}/qr?spot=${spot.id}`);
    expect(png.status()).toBe(200);
    expect(png.headers()["content-type"]).toBe("image/png");
    expect((await host.get(`/api/admin/events/${event.id}/qr?spot=${foreign.id}`)).status()).toBe(404);
    expect(await (await host.get(`/api/admin/events/${event.id}/qr?spot=${spot.id}&format=svg`)).text()).toContain("Table 5");

    // Renamed, then deleted: its photos stay in the album.
    expect((await host.patch(`/api/admin/events/${event.id}/spots/${spot.id}`, { data: { label: "Table des mariés" } })).status()).toBe(200);
    expect((await host.patch(`/api/admin/events/${other.id}/spots/${spot.id}`, { data: { label: "Hijack" } })).status()).toBe(404);
    expect((await host.delete(`/api/admin/events/${event.id}/spots/${spot.id}`)).status()).toBe(200);
    const all = (await (await host.get(`/api/admin/events/${event.id}/photos`)).json()).photos.map((p: { id: string }) => p.id);
    expect(all).toEqual(expect.arrayContaining([tagged, untagged]));
  });

  test("a duplicated event gets the same places, with new codes", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host);
    const spot = (await (await host.post(`/api/admin/events/${event.id}/spots`, { data: { label: "Bar" } })).json()).spot;
    const copy = (await (await host.post(`/api/admin/events/${event.id}/duplicate`, { data: { name: "Next year" } })).json()).event;
    const spots = (await (await host.get(`/api/admin/events/${copy.id}/spots`)).json()).spots;
    expect(spots.map((s: { label: string }) => s.label)).toEqual(["Bar"]);
    expect(spots[0].id).not.toBe(spot.id);
  });
});
