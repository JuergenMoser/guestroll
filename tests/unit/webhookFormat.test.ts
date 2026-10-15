import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { formatWebhook } from "@/lib/webhooks/format";
import type { Notice } from "@/lib/webhooks/types";

const notice: Notice = {
  kind: "photos_pending",
  title: "Fête d'été: 3 photos waiting",
  message: "Approve them.",
  url: "https://photos.example.com/admin/events/1",
  event: { id: "1", name: "Fête d'été" },
  data: { pending: 3 },
};

describe("webhook formats", () => {
  it("ntfy: message as body, encoded title and a click-through", () => {
    const req = formatWebhook({ type: "ntfy", url: "https://ntfy.sh/topic", secret: null }, notice, "Guestroll");
    expect(req.body).toBe("Approve them.");
    expect(req.headers.Click).toBe(notice.url);
    expect(Buffer.from(req.headers.Title.slice(10, -2), "base64").toString()).toBe(notice.title);
  });

  it("discord: one embed, no mentions possible", () => {
    const body = JSON.parse(formatWebhook({ type: "discord", url: "https://discord.com/api/webhooks/x", secret: null }, notice, "Guestroll").body);
    expect(body.allowed_mentions).toEqual({ parse: [] });
    // Discord shows escaped characters without their backslash.
    expect(body.embeds[0]).toMatchObject({ title: "Fête d'été\\: 3 photos waiting", url: notice.url, description: "Approve them." });
  });

  it("slack: a text with the link", () => {
    expect(JSON.parse(formatWebhook({ type: "slack", url: "https://hooks.slack.com/x", secret: null }, notice, "G").body).text).toContain(`<${notice.url}|Open>`);
  });

  it("json: the notice as data, signed when there's a secret", () => {
    const req = formatWebhook({ type: "json", url: "https://ha.local/api/webhook/x", secret: "s3cret" }, notice, "Guestroll", Date.UTC(2026, 9, 18));
    const body = JSON.parse(req.body);
    expect(body).toMatchObject({ kind: "photos_pending", data: { pending: 3 }, event: { name: "Fête d'été" }, sentAt: "2026-10-18T00:00:00.000Z" });
    expect(req.headers["X-Guestroll-Signature"]).toBe(`sha256=${createHmac("sha256", "s3cret").update(req.body).digest("hex")}`);
    expect(formatWebhook({ type: "json", url: "https://x", secret: null }, notice, "G").headers).not.toHaveProperty("X-Guestroll-Signature");
  });
});

describe("guest text in webhooks", () => {
  const hostile: Notice = {
    kind: "guestbook_message",
    title: "Party: a new guestbook message",
    message: "<!channel> <@U123> <https://evil.test|your album> [your album](https://evil.test) @everyone **bold**",
    url: "https://photos.example.com/admin/events/1?tab=guestbook",
  };

  it("can't ping or link from Slack", () => {
    const text = JSON.parse(formatWebhook({ type: "slack", url: "https://hooks.slack.com/x", secret: null }, hostile, "G").body).text as string;
    expect(text).not.toMatch(/<!channel>|<@U123>|<https:\/\/evil/);
    expect(text).toContain("&lt;!channel&gt;");
    // The server-built link still works.
    expect(text).toContain(`<${hostile.url}|Open>`);
  });

  it("can't render a link or a mention in Discord", () => {
    const { embeds, allowed_mentions } = JSON.parse(formatWebhook({ type: "discord", url: "https://discord.com/api/webhooks/x", secret: null }, hostile, "G").body);
    expect(allowed_mentions).toEqual({ parse: [] });
    expect(embeds[0].description).not.toContain("[your album](https://evil.test)");
    expect(embeds[0].description).toContain("\\[your album\\]\\(https\\:");
    expect(embeds[0].description).not.toContain("@everyone");
    expect(embeds[0].url).toBe(hostile.url);
  });

  it("leaves JSON as data for the receiver to handle", () => {
    expect(JSON.parse(formatWebhook({ type: "json", url: "https://x.test", secret: null }, hostile, "G").body).message).toBe(hostile.message);
  });
});
