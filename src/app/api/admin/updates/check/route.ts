import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/http";
import { limiters } from "@/lib/security/limiters";
import { rateLimited } from "@/lib/http";
import { availableUpdate, checkForUpdate } from "@/lib/updates";

/** "Check now": asks GitHub right away. */
export async function POST(request: Request) {
  const { denied } = await requireAdmin(request, { owner: true });
  if (denied) return denied;
  // GitHub allows 60 anonymous calls an hour per IP: a stuck button must not spend them.
  const limit = limiters.mailTest.consume("update-check");
  if (!limit.allowed) return rateLimited(limit.retryAfterMs);
  try {
    await checkForUpdate();
    return NextResponse.json({ available: availableUpdate() });
  } catch (error) {
    return NextResponse.json({ error: "check_failed", message: (error as Error).message.slice(0, 200) }, { status: 502 });
  }
}
