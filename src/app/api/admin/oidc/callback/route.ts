import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { touchLogin } from "@/lib/accounts";
import { track } from "@/lib/activity";
import { finishLogin, oidcEnabled, resolveAccount } from "@/lib/auth/oidc";
import { getAdminSession, getOidcSession } from "@/lib/auth/session";
import { hasTwoFactor } from "@/lib/auth/twoFactor";
import { baseUrl } from "@/lib/urls";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Back from the identity provider. A GET by nature (a redirect), protected by the
 * `state` only this browser holds: a forged link can't sign anyone in.
 */
export async function GET(request: Request) {
  const origin = await baseUrl();
  const fail = (reason: string) => NextResponse.redirect(`${origin}/admin/login?sso=${reason}`);
  if (!oidcEnabled()) return fail("unavailable");

  const search = new URL(request.url).searchParams;
  const oidc = await getOidcSession();
  const expected = { state: oidc.state, nonce: oidc.nonce, verifier: oidc.verifier };
  // Used once, whatever happens next.
  oidc.destroy();
  const code = search.get("code");
  const state = search.get("state");
  if (!code || !state || !expected.state || !expected.nonce || !expected.verifier || !same(state, expected.state)) return fail("expired");

  let identity;
  try {
    identity = await finishLogin(code, `${origin}/api/admin/oidc/callback`, { nonce: expected.nonce, verifier: expected.verifier });
  } catch (error) {
    console.error("[oidc]", error);
    track("login_failed", null);
    return fail("failed");
  }
  const resolved = resolveAccount(identity);
  if ("refused" in resolved) {
    track("login_failed", null);
    return fail("unknown");
  }

  const { account } = resolved;
  const session = await getAdminSession();
  // The provider may have its own second factor; an account that turned on Guestroll's still asks for it.
  if (hasTwoFactor(account)) {
    session.accountId = undefined;
    session.pending = { accountId: account.id, version: account.sessionVersion, at: Date.now() };
    await session.save();
    return NextResponse.redirect(`${origin}/admin/login?step=code`);
  }
  session.pending = undefined;
  session.accountId = account.id;
  session.version = account.sessionVersion;
  await session.save();
  touchLogin(account.id);
  track("login", null);
  return NextResponse.redirect(`${origin}/admin`);
}
