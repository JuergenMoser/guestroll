import { NextResponse } from "next/server";
import { touchLogin } from "@/lib/accounts";
import { track } from "@/lib/activity";
import { verifyLogin } from "@/lib/auth/admin";
import { hasTwoFactor } from "@/lib/auth/twoFactor";
import { getAdminSession } from "@/lib/auth/session";
import { config } from "@/lib/config";
import { apiError, rateLimited, readJson } from "@/lib/http";
import { limiters } from "@/lib/security/limiters";
import { clientIp, isSameOrigin } from "@/lib/security/request";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return apiError("forbidden");

  const ip = clientIp(request);
  if (ip !== "direct") {
    const perIp = limiters.loginPerIp.consume(ip);
    if (!perIp.allowed) return rateLimited(perIp.retryAfterMs);
  }

  const body = (await readJson(request)) as { username?: unknown; password?: unknown } | undefined;
  // Without a username, the owner created on first start: installs from before
  // accounts existed keep signing in with the password alone.
  const username = typeof body?.username === "string" && body.username.trim() ? body.username : config.adminUsername;
  const password = typeof body?.password === "string" ? body.password : "";

  // Taken before the password check, so parallel guesses all count; cleared on success.
  const client = `${ip}:${username.trim().toLowerCase()}`;
  for (const [limiter, key] of [
    [limiters.login, client],
    [limiters.loginFailures, ip],
  ] as const) {
    const check = limiter.consume(key);
    if (!check.allowed) return rateLimited(check.retryAfterMs);
  }

  const account = password ? await verifyLogin(username, password) : null;
  if (!account) {
    track("login_failed", null);
    return apiError("unauthorized");
  }

  limiters.login.reset(client);
  limiters.loginFailures.refund(ip);
  const session = await getAdminSession();
  if (hasTwoFactor(account)) {
    // The password was right; signing in waits for the code (POST /api/admin/login/code).
    session.accountId = undefined;
    session.pending = { accountId: account.id, version: account.sessionVersion, at: Date.now() };
    await session.save();
    return NextResponse.json({ ok: false, codeRequired: true });
  }
  session.pending = undefined;
  session.accountId = account.id;
  session.version = account.sessionVersion;
  await session.save();
  touchLogin(account.id);
  track("login", null);
  return NextResponse.json({ ok: true });
}
