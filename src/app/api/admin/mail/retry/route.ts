import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/http";
import { processOutbox, retryFailedMails } from "@/lib/mail/outbox";
import { mailEnabled } from "@/lib/mail/settings";

/** Puts failed emails back in the queue and sends what's due now. */
export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const requeued = retryFailedMails();
  const result = mailEnabled() ? await processOutbox() : { sent: 0, failed: 0 };
  return NextResponse.json({ requeued, ...result });
}
