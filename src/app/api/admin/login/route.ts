import { NextResponse } from "next/server";
import { track } from "@/lib/activity";
import { passwordVersion, verifyPassword } from "@/lib/auth/admin";
import { getAdminSession } from "@/lib/auth/session";
import { apiError, rateLimited, readJson } from "@/lib/http";
import { limiters } from "@/lib/security/limiters";
import { clientIp, isSameOrigin } from "@/lib/security/request";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return apiError("forbidden");

  const ip = clientIp(request);
  const attempt = limiters.login.consume(ip);
  if (!attempt.allowed) return rateLimited(attempt.retryAfterMs);

  const body = (await readJson(request)) as { password?: unknown } | undefined;
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password || !(await verifyPassword(password))) {
    track("login_failed", null);
    return apiError("unauthorized");
  }

  limiters.login.reset(ip);
  const session = await getAdminSession();
  session.isAdmin = true;
  session.passwordVersion = passwordVersion();
  await session.save();
  track("login", null);
  return NextResponse.json({ ok: true });
}
