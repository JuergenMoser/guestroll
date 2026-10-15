import { expect, test, type APIRequestContext } from "@playwright/test";
import { admin, client, createEvent, photo } from "../helpers";

async function upload(api: APIRequestContext, slug: string, challenge?: string) {
  const res = await api.post(`/api/e/${slug}/photos`, {
    multipart: { photo: { name: "p.jpg", mimeType: "image/jpeg", buffer: await photo() }, ...(challenge ? { challenge } : {}) },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).photo;
}

test.describe("challenges", () => {
  test("tag photos, filter the album and count in the stats", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host, { challenges: ["The dance floor", { label: "With a stranger" }] });
    const created = (await (await host.get(`/api/admin/events/${event.id}`)).json()).event;
    const [dance, stranger] = created.challenges;
    expect(dance).toMatchObject({ label: "The dance floor", id: expect.stringMatching(/^[a-z0-9]{8}$/) });

    const guest = await client(baseURL!);
    await guest.post(`/api/e/${event.slug}/join`);
    expect((await upload(guest, event.slug, dance.id)).challengeId).toBe(dance.id);
    await upload(guest, event.slug, dance.id);
    // An unknown challenge doesn't cost the guest their photo.
    expect((await upload(guest, event.slug, "zzzzzzzz")).challengeId).toBeNull();
    await upload(guest, event.slug);

    const filtered = (await (await host.get(`/api/admin/events/${event.id}/photos?challenge=${dance.id}`)).json()).photos;
    expect(filtered).toHaveLength(2);
    const stats = await (await host.get(`/api/admin/stats?eventId=${event.id}`)).json();
    expect(stats.challenges).toEqual([{ id: dance.id, photos: 2 }]);

    // Renaming keeps the id, so photos stay attached.
    await host.patch(`/api/admin/events/${event.id}`, { data: { challenges: [{ id: dance.id, label: "Dancing" }, stranger] } });
    const renamed = (await (await host.get(`/api/admin/events/${event.id}`)).json()).event.challenges;
    expect(renamed[0]).toEqual({ id: dance.id, label: "Dancing" });

    const { share, password } = await (await host.post(`/api/admin/events/${event.id}/shares`, { data: {} })).json();
    const visitor = await client(baseURL!);
    await visitor.post(`/api/g/${share.token}/unlock`, { data: { password } });
    expect((await (await visitor.get(`/api/g/${share.token}/photos?challenge=${dance.id}`)).json()).photos).toHaveLength(2);
    expect((await (await visitor.get(`/api/g/${share.token}/photos`)).json()).photos).toHaveLength(4);
  });

  test("are validated", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const res = await host.post("/api/admin/events", { data: { name: "Too many", challenges: Array.from({ length: 31 }, (_, i) => `c${i}`) } });
    expect(res.status()).toBe(400);
    expect((await res.json()).details).toHaveProperty("challenges");
  });
});
