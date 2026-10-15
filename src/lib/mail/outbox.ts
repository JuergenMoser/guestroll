import "server-only";
import { and, asc, count, desc, eq, lte } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { outbox, type OutboxRow } from "@/lib/db/schema";
import { newId } from "@/lib/security/ids";
import type { RenderedMail } from "./templates";
import { smtpSend, type SendMail } from "./transport";

// 1 min, 5 min, 15 min, 1 h, 6 h: a server down for a night still delivers in the morning.
const BACKOFF_MS = [60_000, 300_000, 900_000, 3_600_000, 21_600_000];
const MAX_ATTEMPTS = BACKOFF_MS.length + 1;

export interface EnqueueInput {
  to: string;
  mail: RenderedMail;
  kind: string;
  eventId?: string | null;
  /** Same key twice = queued once. Use it for anything a scheduler might retrigger. */
  dedupeKey?: string;
}

/** Returns false when a mail with the same dedupe key was already queued. */
export function enqueueMail({ to, mail, kind, eventId = null, dedupeKey }: EnqueueInput): boolean {
  const result = getDb()
    .insert(outbox)
    .values({ id: newId(), to, subject: mail.subject, html: mail.html, text: mail.text, kind, eventId, dedupeKey: dedupeKey ?? null })
    .onConflictDoNothing({ target: outbox.dedupeKey })
    .run();
  return result.changes > 0;
}

const globalForOutbox = globalThis as unknown as { guestrollOutboxRunning?: boolean };

/**
 * Sends what's due, oldest first. A failure is retried later with backoff and
 * gives up after MAX_ATTEMPTS. One run at a time per process.
 */
export async function processOutbox(send: SendMail = smtpSend, now = Date.now()): Promise<{ sent: number; failed: number }> {
  if (globalForOutbox.guestrollOutboxRunning) return { sent: 0, failed: 0 };
  globalForOutbox.guestrollOutboxRunning = true;
  let sent = 0;
  let failed = 0;
  try {
    const due = getDb()
      .select()
      .from(outbox)
      .where(and(eq(outbox.status, "pending"), lte(outbox.nextAttemptAt, now)))
      .orderBy(asc(outbox.createdAt))
      .limit(25)
      .all();
    for (const row of due) {
      try {
        await send({ to: row.to, subject: row.subject, html: row.html, text: row.text });
        getDb().update(outbox).set({ status: "sent", sentAt: Date.now(), attempts: row.attempts + 1, lastError: null }).where(eq(outbox.id, row.id)).run();
        sent++;
      } catch (error) {
        const attempts = row.attempts + 1;
        const giveUp = attempts >= MAX_ATTEMPTS;
        getDb()
          .update(outbox)
          .set({
            attempts,
            status: giveUp ? "failed" : "pending",
            nextAttemptAt: now + (BACKOFF_MS[attempts - 1] ?? BACKOFF_MS.at(-1)!),
            lastError: (error as Error).message.slice(0, 500),
          })
          .where(eq(outbox.id, row.id))
          .run();
        failed++;
      }
    }
  } finally {
    globalForOutbox.guestrollOutboxRunning = false;
  }
  return { sent, failed };
}

export interface OutboxSummary {
  pending: number;
  failed: number;
  recent: Pick<OutboxRow, "id" | "to" | "subject" | "kind" | "status" | "attempts" | "lastError" | "createdAt" | "sentAt">[];
}

/** For the admin's Email settings: what's waiting, what failed, the last messages. */
export function outboxSummary(): OutboxSummary {
  const db = getDb();
  const n = (status: OutboxRow["status"]) => db.select({ n: count() }).from(outbox).where(eq(outbox.status, status)).get()?.n ?? 0;
  const recent = db
    .select({
      id: outbox.id,
      to: outbox.to,
      subject: outbox.subject,
      kind: outbox.kind,
      status: outbox.status,
      attempts: outbox.attempts,
      lastError: outbox.lastError,
      createdAt: outbox.createdAt,
      sentAt: outbox.sentAt,
    })
    .from(outbox)
    .orderBy(desc(outbox.createdAt))
    .limit(10)
    .all();
  return { pending: n("pending"), failed: n("failed"), recent };
}

/** Puts failed mails back in the queue, for after the admin fixed the SMTP settings. */
export function retryFailedMails(): number {
  return getDb().update(outbox).set({ status: "pending", attempts: 0, nextAttemptAt: Date.now() }).where(eq(outbox.status, "failed")).run().changes;
}
