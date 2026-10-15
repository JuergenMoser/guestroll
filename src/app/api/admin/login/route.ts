import { NextResponse } from "next/server";
import { touchLogin } from "@/lib/accounts";
import { track } from "@/lib/activity";
import { verifyLogin } from "@/lib/auth/admin";
import { getAdminSession } from "@/lib/auth/session";
import { config } from "@/lib/config";
import { apiError, rateLimited, readJson } from "@/lib/http";
import { limiters } from "@/lib/security/limiters";
import { clientIp, isSameOrigin } from "@/lib/security/request";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return apiError("forbidden");

  const ip = clientIp(request);
  const attempt = limiters.login.consume(ip);
  if (!attempt.allowed) return rateLimited(attempt.retryAfterMs);

  const body = (await readJson(request)) as { username?: unknown; password?: unknown } | undefined;
  // Without a username, the owner created on first start: installs from before
  // accounts existed keep signing in with the password alone.
  const username = typeof body?.username === "string" && body.username.trim() ? body.username : config.adminUsername;
  const password = typeof body?.password === "string" ? body.password : "";
  const account = password ? await verifyLogin(username, password) : null;
  if (!account) {
    track("login_failed", null);
    return apiError("unauthorized");
  }

  limiters.login.reset(ip);
  const session = await getAdminSession();
  session.accountId = account.id;
  session.version = account.sessionVersion;
  await session.save();
  touchLogin(account.id);
  track("login", null);
  return NextResponse.json({ ok: true });
}
