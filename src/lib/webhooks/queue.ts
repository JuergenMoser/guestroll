import "server-only";
import { and, asc, desc, eq, lte } from "drizzle-orm";
import { config } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import { webhookDeliveries, type WebhookDeliveryRow } from "@/lib/db/schema";
import { newId } from "@/lib/security/ids";
import { formatWebhook, type HttpRequest } from "./format";
import { getWebhook, webhooksFor, type Webhook } from "./settings";
import type { Notice } from "./types";

const BACKOFF_MS = [60_000, 300_000, 900_000, 3_600_000, 21_600_000];
const MAX_ATTEMPTS = BACKOFF_MS.length + 1;

export type HttpSend = (request: HttpRequest) => Promise<void>;

export const httpSend: HttpSend = async ({ url, headers, body }) => {
  const res = await fetch(url, { method: "POST", headers, body, redirect: "error", signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""}`);
};

/**
 * Queues the notice for every enabled webhook subscribed to its kind. With a
 * dedupe key, the same notice is queued once per webhook however often the
 * scheduler sees the condition.
 */
export function notify(notice: Notice, dedupeKey?: string): number {
  let queued = 0;
  for (const webhook of webhooksFor(notice.kind)) {
    const result = getDb()
      .insert(webhookDeliveries)
      .values({ id: newId(), webhookId: webhook.id, kind: notice.kind, payload: JSON.stringify(notice), dedupeKey: dedupeKey ? `${dedupeKey}:${webhook.id}` : null })
      .onConflictDoNothing({ target: webhookDeliveries.dedupeKey })
      .run();
    queued += result.changes;
  }
  return queued;
}

/** Sends right away, for the settings' Test button: the admin wants the service's answer now. */
export function sendNow(webhook: Webhook, notice: Notice, send: HttpSend = httpSend): Promise<void> {
  return send(formatWebhook(webhook, notice, config.appName));
}

const globalForQueue = globalThis as unknown as { guestrollWebhooksRunning?: boolean };

export async function processWebhooks(send: HttpSend = httpSend, now = Date.now()): Promise<{ sent: number; failed: number }> {
  if (globalForQueue.guestrollWebhooksRunning) return { sent: 0, failed: 0 };
  globalForQueue.guestrollWebhooksRunning = true;
  let sent = 0;
  let failed = 0;
  try {
    const due = getDb()
      .select()
      .from(webhookDeliveries)
      .where(and(eq(webhookDeliveries.status, "pending"), lte(webhookDeliveries.nextAttemptAt, now)))
      .orderBy(asc(webhookDeliveries.createdAt))
      .limit(25)
      .all();
    for (const row of due) {
      const webhook = getWebhook(row.webhookId);
      if (!webhook) {
        getDb().update(webhookDeliveries).set({ status: "failed", lastError: "Webhook deleted" }).where(eq(webhookDeliveries.id, row.id)).run();
        continue;
      }
      try {
        await sendNow(webhook, JSON.parse(row.payload) as Notice, send);
        getDb().update(webhookDeliveries).set({ status: "sent", sentAt: Date.now(), attempts: row.attempts + 1, lastError: null }).where(eq(webhookDeliveries.id, row.id)).run();
        sent++;
      } catch (error) {
        const attempts = row.attempts + 1;
        getDb()
          .update(webhookDeliveries)
          .set({
            attempts,
            status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
            nextAttemptAt: now + (BACKOFF_MS[attempts - 1] ?? BACKOFF_MS.at(-1)!),
            lastError: (error as Error).message.slice(0, 300),
          })
          .where(eq(webhookDeliveries.id, row.id))
          .run();
        failed++;
      }
    }
  } finally {
    globalForQueue.guestrollWebhooksRunning = false;
  }
  return { sent, failed };
}

export function recentDeliveries(limit = 10): Pick<WebhookDeliveryRow, "id" | "webhookId" | "kind" | "status" | "attempts" | "lastError" | "createdAt" | "sentAt">[] {
  return getDb()
    .select({
      id: webhookDeliveries.id,
      webhookId: webhookDeliveries.webhookId,
      kind: webhookDeliveries.kind,
      status: webhookDeliveries.status,
      attempts: webhookDeliveries.attempts,
      lastError: webhookDeliveries.lastError,
      createdAt: webhookDeliveries.createdAt,
      sentAt: webhookDeliveries.sentAt,
    })
    .from(webhookDeliveries)
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(limit)
    .all();
}
