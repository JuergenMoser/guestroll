import { NextResponse } from "next/server";
import { getShareSession } from "@/lib/auth/session";
import { apiError, rateLimited, readJson } from "@/lib/http";
import { limiters } from "@/lib/security/limiters";
import { clientIp, isSameOrigin } from "@/lib/security/request";
import { checkSharePassword, getShareByToken, isShareActive, recordShareView } from "@/lib/shares";

export async function POST(request: Request, { params }: RouteContext<"/api/g/[token]/unlock">) {
  if (!isSameOrigin(request)) return apiError("forbidden");
  const share = getShareByToken((await params).token);
  // Unknown, revoked and expired links answer alike.
  if (!share || !isShareActive(share)) return apiError("not_found");

  const attempt = limiters.shareUnlock.consume(`${clientIp(request)}:${share.id}`);
  if (!attempt.allowed) return rateLimited(attempt.retryAfterMs);
  // Taken before the await, given back on success: see the event unlock route.
  const failures = limiters.shareFailures.consume(share.id);
  if (!failures.allowed) return rateLimited(failures.retryAfterMs);

  const body = (await readJson(request)) as { password?: unknown } | undefined;
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password || !(await checkSharePassword(share, password))) return apiError("invalid_code");
  limiters.shareFailures.refund(share.id);

  const session = await getShareSession();
  session.shares = [...new Set([...(session.shares ?? []), share.id])].slice(-20);
  await session.save();
  recordShareView(share.id);
  return NextResponse.json({ ok: true });
}
