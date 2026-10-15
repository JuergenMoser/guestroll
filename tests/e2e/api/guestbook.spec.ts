import { expect, test, type APIRequestContext } from "@playwright/test";
import { admin, client, createEvent, voiceNote } from "../helpers";

async function leave(api: APIRequestContext, slug: string, parts: { text?: string; audio?: Buffer }) {
  return api.post(`/api/e/${slug}/messages`, {
    multipart: {
      ...(parts.text ? { text: parts.text } : {}),
      ...(parts.audio ? { audio: { name: "note.ogg", mimeType: "audio/ogg", buffer: parts.audio }, seconds: "12" } : {}),
    },
  });
}

test.describe("guestbook", () => {
  test("is off until the hosts turn it on", async ({ baseURL }) => {
    const event = await createEvent(await admin(baseURL!));
    const guest = await client(baseURL!);
    await guest.post(`/api/e/${event.slug}/join`);
    expect((await leave(guest, event.slug, { text: "Hello" })).status()).toBe(403);
  });

  test("guests leave words and voice notes, and only see their own", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host, { guestbookEnabled: true });
    const alice = await client(baseURL!);
    const bob = await client(baseURL!);
    for (const g of [alice, bob]) await g.post(`/api/e/${event.slug}/join`);

    const res = await leave(alice, event.slug, { text: "Félicitations ! 🎉", audio: voiceNote() });
    expect(res.status()).toBe(201);
    const { message } = await res.json();
    expect(message).toMatchObject({ text: "Félicitations ! 🎉", audioSeconds: 12, mine: true, status: "visible" });
    await leave(bob, event.slug, { text: "From Bob" });

    expect((await (await alice.get(`/api/e/${event.slug}/messages`)).json()).messages).toHaveLength(1);
    const audio = await alice.get(message.audio);
    expect(audio.headers()["content-type"]).toBe("audio/ogg");
    // Bob can't hear Alice's note, nor delete it.
    expect((await bob.get(message.audio)).status()).toBe(404);
    expect((await bob.delete(`/api/e/${event.slug}/messages/${message.id}`)).status()).toBe(404);

    const all = (await (await host.get(`/api/admin/events/${event.id}/messages`)).json()).messages;
    expect(all).toHaveLength(2);
    expect((await host.get(message.audio)).status()).toBe(200);

    const zip = await host.get(`/api/admin/events/${event.id}/messages/archive`);
    expect(zip.headers()["content-type"]).toBe("application/zip");
    expect((await zip.body()).includes(Buffer.from("guestbook.txt"))).toBe(true);

    expect((await alice.delete(`/api/e/${event.slug}/messages/${message.id}`)).status()).toBe(200);
    expect((await host.get(message.audio)).status()).toBe(404);
  });

  test("refuses empty, too long, non-audio files, and voice when the hosts said no", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host, { guestbookEnabled: true, guestbookVoice: false });
    const guest = await client(baseURL!);
    await guest.post(`/api/e/${event.slug}/join`);
    expect((await leave(guest, event.slug, {})).status()).toBe(400);
    expect((await leave(guest, event.slug, { text: "x".repeat(501) })).status()).toBe(400);
    expect((await leave(guest, event.slug, { audio: voiceNote() })).status()).toBe(403);

    await host.patch(`/api/admin/events/${event.id}`, { data: { guestbookVoice: true } });
    expect((await leave(guest, event.slug, { audio: Buffer.from("<script>alert(1)</script>".repeat(10)) })).status()).toBe(415);
  });

  test("follows moderation, and reaches gallery links only when shared", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host, { guestbookEnabled: true, moderation: "pre" });
    const guest = await client(baseURL!);
    await guest.post(`/api/e/${event.slug}/join`);
    const { message } = await (await leave(guest, event.slug, { text: "Pending first" })).json();
    expect(message.status).toBe("pending");

    const { share, password } = await (await host.post(`/api/admin/events/${event.id}/shares`, { data: {} })).json();
    const visitor = await client(baseURL!);
    await visitor.post(`/api/g/${share.token}/unlock`, { data: { password } });
    expect((await visitor.get(`/api/g/${share.token}/messages`)).status()).toBe(403);

    await host.patch(`/api/admin/events/${event.id}`, { data: { guestbookInGallery: true } });
    expect((await (await visitor.get(`/api/g/${share.token}/messages`)).json()).messages).toHaveLength(0);
    await host.post(`/api/admin/events/${event.id}/messages`, { data: { action: "approve", ids: [message.id] } });
    expect((await (await visitor.get(`/api/g/${share.token}/messages`)).json()).messages.map((m: { text: string }) => m.text)).toEqual(["Pending first"]);
  });
});
