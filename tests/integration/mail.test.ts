import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshEnv } from "../helpers/env";

let env: Awaited<ReturnType<typeof freshEnv>>;
beforeEach(async () => {
  env = await freshEnv({ PUBLIC_URL: "https://photos.example.com", ADMIN_EMAIL: "admin@example.com", SMTP_HOST: "" });
});
afterEach(() => env.cleanup());

const rendered = { subject: "Hi", html: "<p>Hi</p>", text: "Hi" };

describe("outbox", () => {
  it("queues once per dedupe key", async () => {
    const { enqueueMail, outboxSummary } = await import("@/lib/mail/outbox");
    expect(enqueueMail({ to: "a@x.test", mail: rendered, kind: "t", dedupeKey: "k" })).toBe(true);
    expect(enqueueMail({ to: "a@x.test", mail: rendered, kind: "t", dedupeKey: "k" })).toBe(false);
    expect(outboxSummary().pending).toBe(1);
  });

  it("sends what's due, retries failures with backoff, and gives up after six attempts", async () => {
    const { enqueueMail, outboxSummary, processOutbox, retryFailedMails } = await import("@/lib/mail/outbox");
    enqueueMail({ to: "ok@x.test", mail: rendered, kind: "t" });
    enqueueMail({ to: "bad@x.test", mail: rendered, kind: "t" });
    const send = vi.fn(async ({ to }: { to: string }) => {
      if (to === "bad@x.test") throw new Error("550 mailbox unavailable");
    });

    const t0 = Date.now();
    expect(await processOutbox(send, t0)).toEqual({ sent: 1, failed: 1 });
    // Not retried before its backoff.
    expect(await processOutbox(send, t0 + 1_000)).toEqual({ sent: 0, failed: 0 });

    let now = t0;
    for (let i = 0; i < 5; i++) {
      now += 7 * 3_600_000;
      await processOutbox(send, now);
    }
    const summary = outboxSummary();
    expect(summary.failed).toBe(1);
    expect(summary.recent.find((m) => m.to === "bad@x.test")).toMatchObject({ status: "failed", attempts: 6, lastError: "550 mailbox unavailable" });

    expect(retryFailedMails()).toBe(1);
    expect(outboxSummary().pending).toBe(1);
  });
});

describe("mail settings", () => {
  it("seals the SMTP password and keeps it when the form sends an empty one", async () => {
    const { getSmtpSettings, saveSmtpSettings, smtpSettingsForForm } = await import("@/lib/mail/settings");
    const { readSetting } = await import("@/lib/settings");
    saveSmtpSettings({ host: "smtp.x.test", port: 587, secure: false, user: "u", password: "s3cret-pass", from: "" });
    expect(readSetting("smtp")).not.toContain("s3cret-pass");
    expect(getSmtpSettings()?.password).toBe("s3cret-pass");
    saveSmtpSettings({ host: "smtp2.x.test", port: 465, secure: true, user: "u", password: "", from: "" });
    expect(getSmtpSettings()).toMatchObject({ host: "smtp2.x.test", password: "s3cret-pass" });
    expect(smtpSettingsForForm()).not.toHaveProperty("password");
  });

  it("lets the environment win over the admin's settings", async () => {
    env.cleanup();
    env = await freshEnv({ SMTP_HOST: "env.x.test", SMTP_PORT: "2525", SMTP_PASSWORD: "from-env" });
    const { getSmtpSettings, saveSmtpSettings, smtpSource } = await import("@/lib/mail/settings");
    saveSmtpSettings({ host: "admin.x.test", port: 587, secure: false, user: "", password: "p", from: "" });
    expect(smtpSource()).toBe("env");
    expect(getSmtpSettings()).toMatchObject({ host: "env.x.test", port: 2525, password: "from-env" });
  });
});

describe("secret box", () => {
  it("round-trips and rejects tampering", async () => {
    const { open, seal } = await import("@/lib/crypto/secretBox");
    const sealed = seal("hello");
    expect(open(sealed)).toBe("hello");
    expect(seal("hello")).not.toBe(sealed);
    const [v, iv, tag, body] = sealed.split(".");
    expect(open([v, iv, tag, body.slice(0, -2) + "AA"].join("."))).toBeNull();
    expect(open("garbage")).toBeNull();
  });
});

describe("end of event", () => {
  async function setup(over: Record<string, unknown> = {}) {
    const events = await import("@/lib/events");
    const contacts = await import("@/lib/contacts");
    const event = events.createEvent({ name: "Party", emailGuestsGallery: true, collectGuestEmails: true, galleryLinkDays: 14, ...over });
    contacts.saveGuestContact(event.id, "g1", "lea@x.test", "fr");
    contacts.saveGuestContact(event.id, "g2", "nora@x.test", "en");
    // Same person on a second phone: one email, not two.
    contacts.saveGuestContact(event.id, "g3", "lea@x.test", "fr");
    return { event: events.getEventById(event.id)!, events };
  }

  it("sends the admin summary and one gallery email per address, with a working link", async () => {
    const { event } = await setup();
    const { endEvent } = await import("@/lib/mail/automation");
    const { outboxSummary } = await import("@/lib/mail/outbox");
    const shares = await import("@/lib/shares");

    const result = endEvent(event, Date.UTC(2026, 9, 18))!;
    expect(result).toMatchObject({ summaryQueued: true, galleryRecipients: 2 });
    const queued = outboxSummary().recent;
    expect(queued.map((m) => m.to).sort()).toEqual(["admin@example.com", "lea@x.test", "nora@x.test"]);
    expect(queued.find((m) => m.to === "lea@x.test")?.subject).toBe("Les photos de « Party » sont là");

    const share = shares.getShareById(result.shareId!)!;
    expect(share.expiresAt).toBe(Date.UTC(2026, 9, 18) + 14 * 86_400_000);
    expect(share.allowDownload).toBe(true);
  });

  it("runs once, however many times it is called", async () => {
    const { event } = await setup();
    const { endEvent } = await import("@/lib/mail/automation");
    const { outboxSummary } = await import("@/lib/mail/outbox");
    expect(endEvent(event)).not.toBeNull();
    expect(endEvent(event)).toBeNull();
    expect(outboxSummary().pending).toBe(3);
  });

  it("does nothing the hosts didn't ask for", async () => {
    const { event } = await setup({ emailGuestsGallery: false, notifyAdminSummary: false });
    const { endEvent } = await import("@/lib/mail/automation");
    const { outboxSummary } = await import("@/lib/mail/outbox");
    expect(endEvent(event)).toEqual({ summaryQueued: false, galleryRecipients: 0, shareId: null, galleryPassword: null });
    expect(outboxSummary().pending).toBe(0);
  });

  it("is triggered by the scheduled closing time, and only once it passed", async () => {
    const events = await import("@/lib/events");
    const { eventsToEnd } = await import("@/lib/mail/automation");
    const now = Date.now();
    const past = events.createEvent({ name: "Past", uploadsCloseAt: now - 1_000 });
    events.createEvent({ name: "Future", uploadsCloseAt: now + 3_600_000 });
    events.createEvent({ name: "Open-ended" });
    expect(eventsToEnd(now).map((e) => e.id)).toEqual([past.id]);
  });
});

describe("alerts", () => {
  it("sends a pending-photos digest only when the count grows, at most every 30 minutes", async () => {
    const events = await import("@/lib/events");
    const photos = await import("@/lib/photos");
    const { newId } = await import("@/lib/security/ids");
    const { pendingPhotoAlerts } = await import("@/lib/mail/automation");
    const event = events.createEvent({ name: "Moderated", moderation: "pre" });
    const add = () =>
      photos.insertPhoto({ id: newId(), eventId: event.id, guestId: "g", guestName: null, width: 1, height: 1, bytes: 1, status: "pending" });
    add();
    const t0 = Date.now();
    expect(pendingPhotoAlerts(t0)).toBe(1);
    add();
    expect(pendingPhotoAlerts(t0 + 60_000)).toBe(0);
    expect(pendingPhotoAlerts(t0 + 31 * 60_000)).toBe(1);
    expect(pendingPhotoAlerts(t0 + 70 * 60_000)).toBe(0);
  });

  it("warns once per hour about a burst of failed admin logins", async () => {
    const { track } = await import("@/lib/activity");
    const { failedLoginAlert } = await import("@/lib/mail/automation");
    for (let i = 0; i < 9; i++) track("login_failed", null);
    expect(failedLoginAlert()).toBe(false);
    track("login_failed", null);
    expect(failedLoginAlert()).toBe(true);
    expect(failedLoginAlert()).toBe(false);
  });

  it("stays silent without an admin address", async () => {
    env.cleanup();
    env = await freshEnv({ ADMIN_EMAIL: "" });
    const { track } = await import("@/lib/activity");
    const { failedLoginAlert } = await import("@/lib/mail/automation");
    for (let i = 0; i < 12; i++) track("login_failed", null);
    expect(failedLoginAlert()).toBe(false);
  });
});

describe("guest contacts and gallery links", () => {
  it("validates and normalises addresses", async () => {
    const { parseEmail } = await import("@/lib/contacts");
    expect(parseEmail("  Lea@Example.COM ")).toBe("lea@example.com");
    for (const bad of ["", "lea", "lea@", "a b@x.io", "<x>@x.io", 42, null]) expect(parseEmail(bad)).toBeNull();
  });

  it("checks passwords, expiry and revocation", async () => {
    const events = await import("@/lib/events");
    const shares = await import("@/lib/shares");
    const event = events.createEvent({ name: "Shared" });
    const link = shares.createShareLink({ eventId: event.id, password: "correct-horse", allowDownload: false, expiresAt: Date.now() + 60_000 });
    expect(link.token).toMatch(shares.SHARE_TOKEN_PATTERN);
    expect(link.passwordHash).not.toContain("correct-horse");
    expect(await shares.checkSharePassword(link, "correct-horse")).toBe(true);
    expect(await shares.checkSharePassword(link, "wrong")).toBe(false);
    expect(shares.isShareActive(link)).toBe(true);
    expect(shares.isShareActive(link, Date.now() + 120_000)).toBe(false);
    expect(shares.revokeShareLink(link.id, event.id)).toBe(true);
    expect(shares.isShareActive(shares.getShareById(link.id)!)).toBe(false);
    expect(shares.toShareDto(link)).not.toHaveProperty("passwordHash");
    expect(shares.generateSharePassword()).toMatch(/^[a-z0-9]{4}(-[a-z0-9]{4}){3}$/);
  });
});

describe("password kept out of the guests' email", () => {
  it("goes to the admin instead, even with summaries turned off", async () => {
    const events = await import("@/lib/events");
    const contacts = await import("@/lib/contacts");
    const { endEvent } = await import("@/lib/mail/automation");
    const { outboxSummary } = await import("@/lib/mail/outbox");
    const shares = await import("@/lib/shares");
    const created = events.createEvent({ name: "Quiet", collectGuestEmails: true, emailGuestsGallery: true, galleryMailIncludesPassword: false, notifyAdminSummary: false });
    contacts.saveGuestContact(created.id, "g1", "lea@x.test", "en");

    const result = endEvent(events.getEventById(created.id)!)!;
    expect(result.galleryPassword).toMatch(/^[a-z0-9]{4}(-[a-z0-9]{4}){3}$/);
    expect(await shares.checkSharePassword(shares.getShareById(result.shareId!)!, result.galleryPassword!)).toBe(true);
    expect(result.summaryQueued).toBe(true);

    const { getDb } = await import("@/lib/db/client");
    const { outbox } = await import("@/lib/db/schema");
    const mails = getDb().select().from(outbox).all();
    expect(mails.find((m) => m.to === "lea@x.test")?.text).not.toContain(result.galleryPassword);
    expect(mails.find((m) => m.to === "admin@example.com")?.text).toContain(result.galleryPassword);
    expect(outboxSummary().pending).toBe(2);
  });
});
