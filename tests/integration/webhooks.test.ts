import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshEnv } from "../helpers/env";

let env: Awaited<ReturnType<typeof freshEnv>>;
beforeEach(async () => (env = await freshEnv({ ADMIN_EMAIL: "" })));
afterEach(() => env.cleanup());

async function mods() {
  return { settings: await import("@/lib/webhooks/settings"), queue: await import("@/lib/webhooks/queue") };
}

describe("webhooks", () => {
  it("keep their URL and secret sealed at rest", async () => {
    const { settings } = await mods();
    const { readSetting } = await import("@/lib/settings");
    const hook = settings.saveWebhook(null, { name: "Phone", type: "json", url: "https://example.test/hook/abc123", secret: "top-secret", kinds: ["event_ended"] });
    expect(typeof hook).toBe("object");
    const raw = readSetting("webhooks")!;
    expect(raw).not.toContain("abc123");
    expect(raw).not.toContain("top-secret");
    const dto = settings.toWebhookDto(settings.listWebhooks()[0]);
    expect(dto).toMatchObject({ urlHint: "https://example.test/…", hasSecret: true });
    expect(JSON.stringify(dto)).not.toContain("top-secret");
  });

  it("validate URLs and kinds", async () => {
    const { settings } = await mods();
    expect(settings.parseWebhookInput({ name: "x", type: "ntfy", url: "javascript:alert(1)", kinds: [] }, false).ok).toBe(false);
    expect(settings.parseWebhookInput({ name: "x", type: "fax", url: "https://a.test", kinds: [] }, false).ok).toBe(false);
    const ok = settings.parseWebhookInput({ name: "x", type: "ntfy", url: "https://a.test", kinds: ["storage", "bogus", "storage"] }, false);
    expect(ok.ok && ok.value.kinds).toEqual(["storage"]);
  });

  it("queue a notice once per subscribed webhook, retry, and drop deliveries of deleted ones", async () => {
    const { settings, queue } = await mods();
    const a = settings.saveWebhook(null, { name: "A", type: "json", url: "https://a.test", kinds: ["storage"] }) as { id: string };
    settings.saveWebhook(null, { name: "B", type: "ntfy", url: "https://b.test", kinds: ["event_ended"] });
    settings.saveWebhook(null, { name: "C", type: "slack", url: "https://c.test", kinds: ["storage"], enabled: false });
    const notice = { kind: "storage" as const, title: "Disk", message: "90%", url: "https://x.test" };
    expect(queue.notify(notice, "storage:1")).toBe(1);
    expect(queue.notify(notice, "storage:1")).toBe(0);

    const send = vi.fn().mockRejectedValueOnce(new Error("HTTP 500")).mockResolvedValue(undefined);
    const t0 = Date.now();
    expect(await queue.processWebhooks(send, t0)).toEqual({ sent: 0, failed: 1 });
    expect(await queue.processWebhooks(send, t0 + 120_000)).toEqual({ sent: 1, failed: 0 });
    expect(send.mock.calls[1][0].url).toBe("https://a.test");

    queue.notify({ ...notice }, "storage:2");
    settings.deleteWebhook(a.id);
    await queue.processWebhooks(send, t0 + 200_000);
    expect(queue.recentDeliveries()[0]).toMatchObject({ status: "failed", lastError: "Webhook deleted" });
  });

  it("let alerts go out by webhook alone, without any email address", async () => {
    const { settings } = await mods();
    settings.saveWebhook(null, { name: "A", type: "json", url: "https://a.test", kinds: ["failed_logins"] });
    const { track } = await import("@/lib/activity");
    const { failedLoginAlert } = await import("@/lib/mail/automation");
    for (let i = 0; i < 10; i++) track("login_failed", null);
    expect(failedLoginAlert()).toBe(true);
    expect(failedLoginAlert()).toBe(false);
  });

  it("announce the end of an event", async () => {
    const { settings, queue } = await mods();
    settings.saveWebhook(null, { name: "A", type: "json", url: "https://a.test", kinds: ["event_ended"] });
    const events = await import("@/lib/events");
    const { endEvent } = await import("@/lib/mail/automation");
    const event = events.createEvent({ name: "Party" });
    endEvent(event);
    const send = vi.fn().mockResolvedValue(undefined);
    await queue.processWebhooks(send);
    expect(JSON.parse(send.mock.calls[0][0].body)).toMatchObject({ kind: "event_ended", event: { name: "Party" }, data: { photos: 0 } });
  });
});
