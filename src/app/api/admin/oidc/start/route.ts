import { NextResponse } from "next/server";
import { getOidcSession } from "@/lib/auth/session";
import { oidcEnabled, startLogin } from "@/lib/auth/oidc";
import { baseUrl } from "@/lib/urls";

/** Leaves for the identity provider; the state, nonce and PKCE verifier wait in an encrypted cookie. */
export async function GET() {
  const origin = await baseUrl();
  if (!oidcEnabled()) return NextResponse.redirect(`${origin}/admin/login`);
  try {
    const { url, state, nonce, verifier } = await startLogin(`${origin}/api/admin/oidc/callback`);
    const session = await getOidcSession();
    // Signing in only: linking starts from POST /api/admin/me/oidc, which asks for the password.
    Object.assign(session, { state, nonce, verifier, at: Date.now(), linkAccountId: undefined });
    await session.save();
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("[oidc]", error);
    return NextResponse.redirect(`${origin}/admin/login?sso=unavailable`);
  }
}
