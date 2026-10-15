import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/contacts";
import { apiError, readJson, requireAdmin } from "@/lib/http";
import { outboxSummary } from "@/lib/mail/outbox";
import {
  adminEmailFromEnv,
  DEFAULT_ALERTS,
  getAdminEmail,
  getAlertSettings,
  saveAdminEmail,
  saveAlertSettings,
  saveSmtpSettings,
  smtpSettingsForForm,
  smtpSource,
  type AlertSettings,
} from "@/lib/mail/settings";

export async function GET(request: Request) {
  const { denied } = await requireAdmin(request, { owner: true });
  if (denied) return denied;
  return NextResponse.json({
    smtp: smtpSettingsForForm(),
    adminEmail: getAdminEmail(),
    adminEmailFromEnv: adminEmailFromEnv(),
    alerts: getAlertSettings(),
    outbox: outboxSummary(),
  });
}

/** Saves SMTP (unless the environment provides it), the admin address and alert choices. */
export async function PUT(request: Request) {
  const { denied } = await requireAdmin(request, { owner: true });
  if (denied) return denied;
  const body = (await readJson(request)) as Record<string, unknown> | undefined;
  if (!body) return apiError("bad_request");
  const errors: Record<string, string> = {};

  if (body.smtp !== undefined && smtpSource() !== "env") {
    const s = body.smtp as Record<string, unknown>;
    const host = typeof s.host === "string" ? s.host.trim() : "";
    const port = typeof s.port === "number" ? s.port : Number(s.port);
    const from = typeof s.from === "string" ? s.from.trim() : "";
    if (!/^[a-z0-9.-]{1,253}$/i.test(host)) errors.host = "invalid";
    if (!Number.isInteger(port) || port < 1 || port > 65535) errors.port = "invalid";
    if (from && !parseEmail(from.replace(/^.*<([^>]+)>\s*$/, "$1"))) errors.from = "invalid";
    if (!Object.keys(errors).length) {
      saveSmtpSettings({
        host,
        port,
        secure: s.secure === true,
        user: typeof s.user === "string" ? s.user.trim() : "",
        password: typeof s.password === "string" ? s.password : "",
        from,
      });
    }
  }

  if (body.adminEmail !== undefined && !adminEmailFromEnv()) {
    const email = body.adminEmail === "" ? "" : parseEmail(body.adminEmail);
    if (email === null) errors.adminEmail = "invalid";
    else saveAdminEmail(email);
  }

  if (body.alerts !== undefined) {
    const a = body.alerts as Record<string, unknown>;
    const alerts = Object.fromEntries(Object.keys(DEFAULT_ALERTS).map((k) => [k, a[k] === true])) as unknown as AlertSettings;
    saveAlertSettings(alerts);
  }

  if (Object.keys(errors).length) return apiError("bad_request", errors);
  return NextResponse.json({ smtp: smtpSettingsForForm(), adminEmail: getAdminEmail(), alerts: getAlertSettings() });
}
