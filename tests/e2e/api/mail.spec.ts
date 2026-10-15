import { expect, test } from "@playwright/test";
import { simpleParser, type ParsedMail } from "mailparser";
import { SMTPServer } from "smtp-server";
import { SMTP_PORT } from "../../../playwright.config";
import { admin, client, createEvent, joinAndUpload } from "../helpers";

// A real SMTP server the app talks to: what's asserted is what a mailbox would receive.
const inbox: ParsedMail[] = [];
let sink: SMTPServer;

test.beforeAll(async () => {
  sink = new SMTPServer({
    authOptional: true,
    disabledCommands: ["STARTTLS", "AUTH"],
    onData(stream, _session, done) {
      simpleParser(stream).then((mail) => {
        inbox.push(mail);
        done();
      }, done);
    },
  });
  await new Promise<void>((resolve) => sink.listen(SMTP_PORT, "127.0.0.1", resolve));
});
test.afterAll(() => new Promise<void>((resolve) => sink.close(resolve)));

async function waitForMail(to: string, subject?: RegExp): Promise<ParsedMail> {
  const recipient = (m: ParsedMail) => [m.to].flat().some((a) => a?.text.includes(to));
  for (let i = 0; i < 50; i++) {
    const found = inbox.find((m) => recipient(m) && (!subject || subject.test(m.subject ?? "")));
    if (found) return found;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`no mail to ${to}`);
}

test.describe("email and gallery links", () => {
  test("the test email reaches the admin address", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const res = await host.post("/api/admin/mail/test", { data: {} });
    expect(await res.json()).toEqual({ ok: true, to: "host@example.test" });
    const mail = await waitForMail("host@example.test", /test email/);
    expect(mail.from?.text).toContain("photos@example.test");
    expect(mail.text).toContain("Your email settings work.");
  });

  test("the SMTP password can't be read back and the env settings win", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const state = await (await host.get("/api/admin/mail")).json();
    expect(state.smtp).toMatchObject({ source: "env", host: "127.0.0.1", port: SMTP_PORT });
    expect(JSON.stringify(state)).not.toMatch(/"password"/);
  });

  test("guests opt in, and at the end get the album link and its password", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host, { collectGuestEmails: true, emailGuestsGallery: true, galleryLinkDays: 7 });
    const guest = await client(baseURL!);
    await joinAndUpload(guest, event.slug, 2);

    expect((await guest.post(`/api/e/${event.slug}/contact`, { data: { email: "not-an-email" } })).status()).toBe(400);
    expect((await guest.post(`/api/e/${event.slug}/contact`, { data: { email: "Lea@Example.test" } })).status()).toBe(200);

    const ended = await host.post(`/api/admin/events/${event.id}/end`);
    expect((await ended.json()).result).toMatchObject({ summaryQueued: true, galleryRecipients: 1 });
    expect((await host.post(`/api/admin/events/${event.id}/end`)).status()).toBe(400);

    const summary = await waitForMail("host@example.test", new RegExp(`${event.name}: the event is over`));
    expect(summary.text).toContain("Photos: 2");

    const mail = await waitForMail("lea@example.test");
    const url = mail.text!.match(/https?:\/\/\S+\/g\/[A-Za-z0-9_-]+/)![0];
    const password = mail.text!.match(/Password: (\S+)/)![1];
    const token = url.split("/g/")[1];

    // The guest's own cookie gives no access to the album: only the link and its password do.
    const stranger = await client(baseURL!);
    expect((await stranger.get(`/api/g/${token}/photos`)).status()).toBe(403);
    expect((await stranger.post(`/api/g/${token}/unlock`, { data: { password: "wrong-password" } })).status()).toBe(401);
    expect((await stranger.post(`/api/g/${token}/unlock`, { data: { password } })).status()).toBe(200);
    const { photos } = await (await stranger.get(`/api/g/${token}/photos`)).json();
    expect(photos).toHaveLength(2);
    expect((await stranger.get(`/api/media/${photos[0].id}?v=original`)).status()).toBe(200);
    expect((await stranger.get(`/api/g/${token}/archive`)).headers()["content-type"]).toBe("application/zip");
  });

  test("a link without downloads shows photos but not the originals, and revoking it closes it", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host);
    await joinAndUpload(await client(baseURL!), event.slug, 1);

    expect((await host.post(`/api/admin/events/${event.id}/shares`, { data: { password: "short" } })).status()).toBe(400);
    const created = await host.post(`/api/admin/events/${event.id}/shares`, { data: { allowDownload: false, label: "Family" } });
    expect(created.status()).toBe(201);
    const { share, password } = await created.json();
    expect(password).toMatch(/^[a-z0-9]{4}(-[a-z0-9]{4}){3}$/);
    expect(share).not.toHaveProperty("passwordHash");

    const visitor = await client(baseURL!);
    await visitor.post(`/api/g/${share.token}/unlock`, { data: { password } });
    const { photos } = await (await visitor.get(`/api/g/${share.token}/photos`)).json();
    expect((await visitor.get(`/api/media/${photos[0].id}?v=display`)).status()).toBe(200);
    expect((await visitor.get(`/api/media/${photos[0].id}?v=original`)).status()).toBe(404);
    expect((await visitor.get(`/api/g/${share.token}/archive`)).status()).toBe(403);
    // A gallery link never lets anyone upload.
    expect((await visitor.post(`/api/e/${event.slug}/photos`, { multipart: { photo: { name: "p.jpg", mimeType: "image/jpeg", buffer: Buffer.from("x") } } })).status()).not.toBe(201);

    expect((await host.delete(`/api/admin/events/${event.id}/shares/${share.id}`)).status()).toBe(200);
    expect((await visitor.get(`/api/g/${share.token}/photos`)).status()).toBe(404);
  });

  test("guests can't leave an address when the hosts didn't ask for it", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host);
    const guest = await client(baseURL!);
    await guest.post(`/api/e/${event.slug}/join`);
    expect((await guest.post(`/api/e/${event.slug}/contact`, { data: { email: "a@b.test" } })).status()).toBe(403);
  });
});
