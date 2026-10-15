import { NextResponse } from "next/server";
import { getAccount, touchLogin } from "@/lib/accounts";
import { track } from "@/lib/activity";
import { getAdminSession } from "@/lib/auth/session";
import { checkSecondFactor } from "@/lib/auth/twoFactor";
import { apiError, rateLimited, readJson } from "@/lib/http";
import { limiters } from "@/lib/security/limiters";
import { clientIp, isSameOrigin } from "@/lib/security/request";

// Long enough to open the app and read a code, short enough not to leave a half-signed-in cookie around.
const PENDING_MS = 5 * 60_000;

/** Second step of signing in: `{ code }`, from the authenticator app or a recovery code. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return apiError("forbidden");
  const session = await getAdminSession();
  const pending = session.pending;
  if (!pending || Date.now() - pending.at > PENDING_MS) return apiError("unauthorized", { code: "expired" });

  const ip = clientIp(request);
  for (const limit of [limiters.loginPerIp.consume(ip), limiters.twoFactor.consume(pending.accountId)]) {
    if (!limit.allowed) return rateLimited(limit.retryAfterMs);
  }

  const account = getAccount(pending.accountId);
  if (!account || account.sessionVersion !== pending.version) return apiError("unauthorized", { code: "expired" });
  const body = (await readJson(request)) as { code?: unknown } | undefined;
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const used = code ? checkSecondFactor(account, code) : null;
  if (!used) {
    track("login_failed", null);
    return apiError("unauthorized", { code: "invalid" });
  }

  session.pending = undefined;
  session.accountId = account.id;
  session.version = account.sessionVersion;
  await session.save();
  touchLogin(account.id);
  track("login", null);
  return NextResponse.json({ ok: true, usedRecoveryCode: used === "recovery" });
}
