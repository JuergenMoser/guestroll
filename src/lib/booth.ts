import "server-only";
import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { events, type EventRow } from "@/lib/db/schema";
import type { GuestSession } from "@/lib/auth/session";
import { randomToken } from "@/lib/security/ids";

/** Turns the booth on, or gives it a new link: the previous one stops working at once. */
export function newBoothKey(eventId: string): string {
  const key = randomToken(24);
  getDb().update(events).set({ boothKey: key }).where(eq(events.id, eventId)).run();
  return key;
}

export function disableBooth(eventId: string): void {
  getDb().update(events).set({ boothKey: null }).where(eq(events.id, eventId)).run();
}

export function boothKeyMatches(event: Pick<EventRow, "boothKey">, key: unknown): boolean {
  if (!event.boothKey || typeof key !== "string") return false;
  const a = Buffer.from(event.boothKey);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** This device was set up as the event's booth, with the key still current. */
export function isBooth(event: Pick<EventRow, "id" | "boothKey">, session: GuestSession): boolean {
  return boothKeyMatches(event, session.booths?.[event.id]);
}
