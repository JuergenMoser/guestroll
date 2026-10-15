import "server-only";
export { parseEmail } from "@/lib/email";
import { and, eq } from "drizzle-orm";
import type { Locale } from "@/lib/constants";
import { getDb } from "@/lib/db/client";
import { guestContacts, type GuestContactRow } from "@/lib/db/schema";
import { newId } from "@/lib/security/ids";

export function saveGuestContact(eventId: string, guestId: string, email: string, locale: Locale): void {
  getDb()
    .insert(guestContacts)
    .values({ id: newId(), eventId, guestId, email, locale })
    .onConflictDoUpdate({ target: [guestContacts.eventId, guestContacts.guestId], set: { email, locale } })
    .run();
}

export function deleteGuestContact(eventId: string, guestId: string): void {
  getDb().delete(guestContacts).where(and(eq(guestContacts.eventId, eventId), eq(guestContacts.guestId, guestId))).run();
}

export function getGuestContact(eventId: string, guestId: string): GuestContactRow | undefined {
  return getDb().select().from(guestContacts).where(and(eq(guestContacts.eventId, eventId), eq(guestContacts.guestId, guestId))).get();
}

export function listGuestContacts(eventId: string): GuestContactRow[] {
  return getDb().select().from(guestContacts).where(eq(guestContacts.eventId, eventId)).all();
}

/** One mail per address, even when the same person used two phones. */
export function uniqueRecipients(contacts: GuestContactRow[]): GuestContactRow[] {
  const seen = new Set<string>();
  return contacts.filter((c) => (seen.has(c.email) ? false : (seen.add(c.email), true)));
}
