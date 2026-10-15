import { createHmac } from "node:crypto";
import type { Notice } from "./types";
import type { Webhook } from "./settings";

export interface HttpRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
}

// Discord embed colors: amber for things to do, red for security, green otherwise.
const COLORS: Record<string, number> = { failed_logins: 0xd93025, storage: 0xd93025, photos_pending: 0xf59e0b };

/** Pure: turns a notice into the request each service expects. */
export function formatWebhook(webhook: Pick<Webhook, "type" | "url" | "secret">, notice: Notice, appName: string, now = Date.now()): HttpRequest {
  switch (webhook.type) {
    case "ntfy":
      // ntfy takes the message as the body and the rest as headers; non-ASCII titles must be RFC 2047-encoded.
      return {
        url: webhook.url,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          Title: `=?UTF-8?B?${Buffer.from(notice.title).toString("base64")}?=`,
          Click: notice.url,
          Tags: notice.kind === "failed_logins" || notice.kind === "storage" ? "warning" : "camera",
          Priority: notice.kind === "failed_logins" ? "high" : "default",
        },
        body: notice.message,
      };
    case "discord":
      return {
        url: webhook.url,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: appName,
          allowed_mentions: { parse: [] },
          embeds: [{ title: notice.title.slice(0, 256), description: notice.message.slice(0, 4000), url: notice.url, color: COLORS[notice.kind] ?? 0x16a34a }],
        }),
      };
    case "slack":
      return {
        url: webhook.url,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `*${notice.title}*\n${notice.message}\n<${notice.url}|Open>` }),
      };
    case "json": {
      const body = JSON.stringify({ app: appName, kind: notice.kind, title: notice.title, message: notice.message, url: notice.url, event: notice.event ?? null, data: notice.data ?? {}, sentAt: new Date(now).toISOString() });
      const headers: Record<string, string> = { "Content-Type": "application/json", "User-Agent": appName };
      // Lets the receiver check the request came from this instance: HMAC-SHA256 of the raw body.
      if (webhook.secret) headers["X-Guestroll-Signature"] = `sha256=${createHmac("sha256", webhook.secret).update(body).digest("hex")}`;
      return { url: webhook.url, headers, body };
    }
  }
}
