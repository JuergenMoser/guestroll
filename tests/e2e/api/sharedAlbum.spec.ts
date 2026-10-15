import { expect, test } from "@playwright/test";
import { admin, client, createEvent, joinAndUpload } from "../helpers";

test.describe("shared album", () => {
  test("guests see each other's visible photos only when the hosts share the album", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host, { moderation: "pre" });
    const alice = await client(baseURL!);
    const bob = await client(baseURL!);
    const [approved, waiting] = await joinAndUpload(alice, event.slug, 2);
    expect((await host.post(`/api/admin/events/${event.id}/photos`, { data: { ids: [approved], action: "approve" } })).status()).toBe(200);
    await joinAndUpload(bob, event.slug, 1);

    const albumOf = async (who: typeof alice) =>
      ((await (await who.get(`/api/e/${event.slug}/photos?scope=all`)).json()).photos as { id: string }[]).map((p) => p.id);

    // Off (the default): scope=all changes nothing, Bob sees only his own.
    expect(await albumOf(bob)).not.toContain(approved);
    expect((await bob.get(`/api/media/${approved}?v=thumb`)).status()).toBe(404);

    await host.patch(`/api/admin/events/${event.id}`, { data: { sharedAlbum: "during" } });
    const seen = await albumOf(bob);
    expect(seen).toContain(approved);
    expect(seen).not.toContain(waiting);
    expect((await bob.get(`/api/media/${approved}?v=display`)).status()).toBe(200);
    expect((await bob.get(`/api/media/${approved}?v=original`)).status()).toBe(404);
    expect((await bob.get(`/api/media/${waiting}?v=thumb`)).status()).toBe(404);
    // Alice still gets her own pending photo in her album view.
    expect(await albumOf(alice)).toEqual(expect.arrayContaining([approved, waiting]));

    // `after`: closed again until the event ends.
    await host.patch(`/api/admin/events/${event.id}`, { data: { sharedAlbum: "after" } });
    expect(await albumOf(bob)).not.toContain(approved);
    await host.post(`/api/admin/events/${event.id}/end`);
    expect(await albumOf(bob)).toContain(approved);
  });
});
