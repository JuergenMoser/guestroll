import { NextResponse } from "next/server";
import { touchLogin } from "@/lib/accounts";
import { getAdminSession } from "@/lib/auth/session";
import { config } from "@/lib/config";
import { apiError, rateLimited, readJson } from "@/lib/http";
import { acceptInvitation } from "@/lib/invitations";
import { limiters } from "@/lib/security/limiters";
import { clientIp, isSameOrigin } from "@/lib/security/request";
import { parseAccountInput } from "@/lib/validation";

/** `{ username, name, password }`: accepts the invitation, creates the account and signs in. */
export async function POST(request: Request, { params }: RouteContext<"/api/admin/invite/[token]">) {
  if (!isSameOrigin(request)) return apiError("forbidden");
  if (config.demo.enabled) return apiError("forbidden");
  const attempt = limiters.unlock.consume(`invite:${clientIp(request)}`);
  if (!attempt.allowed) return rateLimited(attempt.retryAfterMs);

  const body = (await readJson(request)) as { username?: unknown; name?: unknown; password?: unknown } | undefined;
  const parsed = parseAccountInput({ username: body?.username, name: body?.name ?? "", role: "organizer", password: body?.password }, false);
  if (!parsed.ok) return apiError("bad_request", parsed.errors);
  if (!parsed.value.password) return apiError("bad_request", { password: "min_length" });

  const result = acceptInvitation((await params).token, { username: parsed.value.username!, name: parsed.value.name ?? "", password: parsed.value.password });
  if (!result.ok) return result.reason === "taken" ? apiError("bad_request", { username: "taken" }) : apiError("not_found");

  const session = await getAdminSession();
  session.pending = undefined;
  session.accountId = result.account.id;
  session.version = result.account.sessionVersion;
  await session.save();
  touchLogin(result.account.id);
  return NextResponse.json({ ok: true }, { status: 201 });
}
