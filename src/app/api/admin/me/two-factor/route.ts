import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getAccount } from "@/lib/accounts";
import { verifyAccountPassword } from "@/lib/auth/admin";
import { getAdminSession } from "@/lib/auth/session";
import { checkSecondFactor, confirmTwoFactor, disableTwoFactor, recoveryCodesLeft, regenerateRecoveryCodes, startTwoFactor } from "@/lib/auth/twoFactor";
import { config } from "@/lib/config";
import { apiError, rateLimited, readJson, requireAdmin } from "@/lib/http";
import { limiters } from "@/lib/security/limiters";

export async function GET(request: Request) {
  const { admin, denied } = await requireAdmin(request);
  if (denied) return denied;
  const account = getAccount(admin.id)!;
  return NextResponse.json({ enabled: Boolean(account.totpSecret), recoveryCodesLeft: recoveryCodesLeft(account) });
}

/**
 * `{ action: "start", password }`: a new secret and its QR code. `{ action: "confirm", code }`:
 * turns it on and returns the recovery codes, once. `{ action: "recovery", password, code }`:
 * new recovery codes. Starting and new codes take the password: a stolen session
 * alone must not be able to put its own app on the account and lock its owner out.
 */
export async function POST(request: Request) {
  const { admin, denied } = await requireAdmin(request);
  if (denied) return denied;
  const limit = limiters.twoFactorSettings.consume(admin.id);
  if (!limit.allowed) return rateLimited(limit.retryAfterMs);
  const account = getAccount(admin.id)!;
  const body = (await readJson(request)) as { action?: unknown; code?: unknown } | undefined;
  const code = typeof body?.code === "string" ? body.code : "";
  const password = typeof (body as { password?: unknown } | undefined)?.password === "string" ? (body as { password: string }).password : "";
  const passwordOk = () => verifyAccountPassword(account, password);

  if (body?.action === "start") {
    if (account.totpSecret) return apiError("bad_request", { twoFactor: "already_on" });
    if (!(await passwordOk())) return apiError("unauthorized", { password: "invalid" });
    const { secret, uri } = startTwoFactor(account, config.appName);
    const qr = await QRCode.toString(uri, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
    return NextResponse.json({ secret, uri, qr });
  }
  if (body?.action === "confirm") {
    const codes = confirmTwoFactor(account, code);
    if (!codes) return apiError("bad_request", { code: "invalid" });
    // Every other session ended with the switch; this one stays signed in.
    const session = await getAdminSession();
    session.version = getAccount(account.id)!.sessionVersion;
    await session.save();
    return NextResponse.json({ enabled: true, recoveryCodes: codes });
  }
  if (body?.action === "recovery") {
    if (!(await passwordOk())) return apiError("unauthorized", { password: "invalid" });
    if (checkSecondFactor(account, code) !== "totp") return apiError("bad_request", { code: "invalid" });
    return NextResponse.json({ recoveryCodes: regenerateRecoveryCodes(account.id) });
  }
  return apiError("bad_request", { action: "start | confirm | recovery" });
}

/** Turning it off takes the password and a code: a stolen session alone can't. */
export async function DELETE(request: Request) {
  const { admin, denied } = await requireAdmin(request);
  if (denied) return denied;
  const limit = limiters.twoFactorSettings.consume(admin.id);
  if (!limit.allowed) return rateLimited(limit.retryAfterMs);
  const account = getAccount(admin.id)!;
  const body = (await readJson(request)) as { password?: unknown; code?: unknown } | undefined;
  const password = typeof body?.password === "string" ? body.password : "";
  const code = typeof body?.code === "string" ? body.code : "";
  if (!(await verifyAccountPassword(account, password))) return apiError("unauthorized", { password: "invalid" });
  if (!checkSecondFactor(account, code)) return apiError("unauthorized", { code: "invalid" });
  disableTwoFactor(account.id);
  const session = await getAdminSession();
  session.version = getAccount(account.id)!.sessionVersion;
  await session.save();
  return NextResponse.json({ enabled: false });
}
