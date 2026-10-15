import "server-only";
import type { Viewer } from "@/lib/policy";
import { isAdmin } from "./admin";
import { getGuestSession } from "./session";

export async function getViewer(): Promise<Viewer> {
  const [admin, guest] = await Promise.all([isAdmin(), getGuestSession()]);
  return { isAdmin: admin, guestId: guest.guestId, unlocked: guest.unlocked ?? [] };
}
