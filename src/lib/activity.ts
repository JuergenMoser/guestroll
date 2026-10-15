import "server-only";
import { getDb } from "@/lib/db/client";
import { activity, type ActivityType } from "@/lib/db/schema";

/** Stats must never break the request they describe, so failures are only logged. */
export function track(type: ActivityType, eventId: string | null, guestId?: string | null): void {
  try {
    getDb().insert(activity).values({ type, eventId, guestId: guestId ?? null }).run();
  } catch (error) {
    console.error("[activity] failed to record", type, error);
  }
}
