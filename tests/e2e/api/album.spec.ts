import { expect, test } from "@playwright/test";
import { admin, client, createEvent, joinAndUpload } from "../helpers";

test.describe("printable album", () => {
  test("a PDF of the visible photos, in each layout, or of the favorites", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host, { name: "Album à imprimer" });
    expect((await host.get(`/api/admin/events/${event.id}/album`)).status()).toBe(404);

    const guest = await client(baseURL!);
    await guest.post(`/api/e/${event.slug}/join`);
    await guest.post(`/api/e/${event.slug}/guest`, { data: { name: "Zoé" } });
    const ids = await joinAndUpload(guest, event.slug, 5);
    for (const layout of [1, 2, 4]) {
      const res = await host.get(`/api/admin/events/${event.id}/album?layout=${layout}`);
      expect(res.status()).toBe(200);
      expect(res.headers()["content-type"]).toBe("application/pdf");
      expect(res.headers()["content-disposition"]).toContain('filename="album-album-a-imprimer.pdf"');
      const pdf = (await res.body()).toString("latin1");
      expect(pdf.startsWith("%PDF-")).toBe(true);
      // The cover, then 5 photos at `layout` per page.
      expect(pdf.match(/\/Type \/Page\b/g)?.length).toBe(1 + Math.ceil(5 / layout));
    }

    await host.post(`/api/admin/events/${event.id}/photos`, { data: { ids: [ids[0]], action: "favorite" } });
    const favorites = (await (await host.get(`/api/admin/events/${event.id}/album?layout=1&scope=favorites`)).body()).toString("latin1");
    expect(favorites.match(/\/Type \/Page\b/g)?.length).toBe(2);
    // Guests can't print the album.
    expect((await guest.get(`/api/admin/events/${event.id}/album`)).status()).toBe(401);
  });
});
