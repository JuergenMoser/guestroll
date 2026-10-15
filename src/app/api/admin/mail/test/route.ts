import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { parseEmail } from "@/lib/contacts";
import { apiError, rateLimited, readJson, requireAdmin } from "@/lib/http";
import { getAdminEmail } from "@/lib/mail/settings";
import { testMail } from "@/lib/mail/templates";
import { smtpSend } from "@/lib/mail/transport";
import { limiters } from "@/lib/security/limiters";

/**
 * Sends a test email right away (not through the queue): the admin needs the
 * SMTP server's answer now, error message included.
 */
export async function POST(request: Request) {
  const { denied } = await requireAdmin(request, { owner: true });
  if (denied) return denied;
  const limit = limiters.mailTest.consume("admin");
  if (!limit.allowed) return rateLimited(limit.retryAfterMs);

  const body = (await readJson(request)) as { to?: unknown } | undefined;
  const to = parseEmail(body?.to) ?? getAdminEmail();
  if (!to) return apiError("bad_request", { to: "required" });
  try {
    await smtpSend({ to, ...testMail({ app: config.appName, locale: config.locale }) });
    return NextResponse.json({ ok: true, to });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "smtp_failed", message: (error as Error).message.slice(0, 300) }, { status: 502 });
  }
}
