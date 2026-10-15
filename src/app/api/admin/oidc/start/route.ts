import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth/admin";
import { getOidcSession } from "@/lib/auth/session";
import { oidcEnabled, startLogin } from "@/lib/auth/oidc";
import { baseUrl } from "@/lib/urls";

/** Leaves for the identity provider; the state, nonce and PKCE verifier wait in an encrypted cookie. */
export async function GET(request: Request) {
  const origin = await baseUrl();
  if (!oidcEnabled()) return NextResponse.redirect(`${origin}/admin/login`);
  // `?link=1`: the signed-in account links its identity, from its account page.
  const linking = new URL(request.url).searchParams.get("link") === "1";
  const admin = linking ? await getAdmin() : null;
  if (linking && !admin) return NextResponse.redirect(`${origin}/admin/login`);
  try {
    const { url, state, nonce, verifier } = await startLogin(`${origin}/api/admin/oidc/callback`);
    const session = await getOidcSession();
    Object.assign(session, { state, nonce, verifier, at: Date.now(), linkAccountId: admin?.id });
    await session.save();
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("[oidc]", error);
    return NextResponse.redirect(`${origin}/admin/login?sso=unavailable`);
  }
}
