import { NextResponse } from "next/server";
import { getAccount } from "@/lib/accounts";
import { verifyAccountPassword } from "@/lib/auth/admin";
import { oidcEnabled, startLogin, unlinkAccount } from "@/lib/auth/oidc";
import { getOidcSession } from "@/lib/auth/session";
import { checkSecondFactor, hasTwoFactor } from "@/lib/auth/twoFactor";
import { apiError, rateLimited, readJson, requireAdmin } from "@/lib/http";
import { limiters } from "@/lib/security/limiters";
import { baseUrl } from "@/lib/urls";

/**
 * `{ password, code? }`: starts linking the signed-in account to an identity, and
 * returns where to send the browser. The password (and the code, with two-step
 * verification) is asked again: a stolen session alone must not be able to link
 * an identity of its own and keep a way in.
 */
export async function POST(request: Request) {
  const { admin, denied } = await requireAdmin(request, { notInDemo: true });
  if (denied) return denied;
  if (!oidcEnabled()) return apiError("not_found");
  const limit = limiters.twoFactorSettings.consume(admin.id);
  if (!limit.allowed) return rateLimited(limit.retryAfterMs);
  const account = getAccount(admin.id)!;
  const body = (await readJson(request)) as { password?: unknown; code?: unknown } | undefined;
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password || !(await verifyAccountPassword(account, password))) return apiError("unauthorized", { password: "invalid" });
  if (hasTwoFactor(account) && !(typeof body?.code === "string" && checkSecondFactor(account, body.code))) return apiError("unauthorized", { code: "invalid" });

  const { url, state, nonce, verifier } = await startLogin(`${await baseUrl()}/api/admin/oidc/callback`);
  const session = await getOidcSession();
  Object.assign(session, { state, nonce, verifier, at: Date.now(), linkAccountId: account.id });
  await session.save();
  return NextResponse.json({ url });
}

/** Unlinks the signed-in account from its single sign-on identity: back to the password only. */
export async function DELETE(request: Request) {
  const { admin, denied } = await requireAdmin(request, { notInDemo: true });
  if (denied) return denied;
  unlinkAccount(admin.id);
  return NextResponse.json({ ok: true });
}
