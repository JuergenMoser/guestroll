import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { apiError, rateLimited, requireAdmin } from "@/lib/http";
import { mailMessages } from "@/lib/mail/messages";
import { limiters } from "@/lib/security/limiters";
import { backgroundBaseUrl } from "@/lib/urls";
import { sendNow } from "@/lib/webhooks/queue";
import { getWebhook } from "@/lib/webhooks/settings";

/** Sends a test notice now, not through the queue, so the admin sees the service's answer. */
export async function POST(request: Request, { params }: RouteContext<"/api/admin/webhooks/[webhookId]/test">) {
  const { denied } = await requireAdmin(request, { owner: true, notInDemo: true });
  if (denied) return denied;
  const limit = limiters.mailTest.consume("webhook");
  if (!limit.allowed) return rateLimited(limit.retryAfterMs);
  const webhook = getWebhook((await params).webhookId);
  if (!webhook) return apiError("not_found");
  const m = mailMessages[config.locale].notice;
  try {
    await sendNow(webhook, { kind: "test", title: m.testTitle.replace("{app}", config.appName), message: m.testBody, url: `${backgroundBaseUrl()}/admin/settings` });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "webhook_failed", message: (error as Error).message.slice(0, 300) }, { status: 502 });
  }
}
