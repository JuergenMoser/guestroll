import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { createAccount, getAccountByUsername, hashPassword } from "@/lib/accounts";
import { config } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import { accounts, type AccountRow } from "@/lib/db/schema";
import { randomToken } from "@/lib/security/ids";

export const oidcEnabled = (): boolean => Boolean(config.oidc.issuer && config.oidc.clientId && config.oidc.clientSecret) && !config.demo.enabled;

interface Discovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
}

let cached: { at: number; discovery: Discovery; jwks: ReturnType<typeof createRemoteJWKSet> } | undefined;

/** The provider's endpoints and keys, read from its discovery document and kept an hour. */
async function provider() {
  if (cached && Date.now() - cached.at < 3_600_000) return cached;
  const res = await fetch(`${config.oidc.issuer}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`The identity provider's discovery document answered HTTP ${res.status}`);
  const discovery = (await res.json()) as Discovery;
  // A document claiming another issuer is not this provider's.
  if (discovery.issuer.replace(/\/+$/, "") !== config.oidc.issuer) throw new Error("The identity provider's issuer doesn't match OIDC_ISSUER");
  cached = { at: Date.now(), discovery, jwks: createRemoteJWKSet(new URL(discovery.jwks_uri)) };
  return cached;
}

const base64url = (buffer: Buffer) => buffer.toString("base64url");

/** Where to send the browser, and what to keep (in an encrypted cookie) for the way back. */
export async function startLogin(redirectUri: string): Promise<{ url: string; state: string; nonce: string; verifier: string }> {
  const { discovery } = await provider();
  const state = base64url(randomBytes(24));
  const nonce = base64url(randomBytes(24));
  const verifier = base64url(randomBytes(48));
  const url = new URL(discovery.authorization_endpoint);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: config.oidc.clientId,
    redirect_uri: redirectUri,
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: base64url(createHash("sha256").update(verifier).digest()),
    code_challenge_method: "S256",
  }).toString();
  return { url: url.href, state, nonce, verifier };
}

export interface Identity {
  subject: string;
  email: string | null;
  emailVerified: boolean;
  name: string;
  username: string | null;
}

/** Trades the code for an ID token and checks it: signature, issuer, audience, expiry, nonce. */
export async function finishLogin(code: string, redirectUri: string, expected: { nonce: string; verifier: string }): Promise<Identity> {
  const { discovery, jwks } = await provider();
  const res = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${encodeURIComponent(config.oidc.clientId)}:${encodeURIComponent(config.oidc.clientSecret)}`).toString("base64")}`,
    },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri, code_verifier: expected.verifier }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`The identity provider refused the code (HTTP ${res.status})`);
  const { id_token } = (await res.json()) as { id_token?: string };
  if (!id_token) throw new Error("The identity provider sent no ID token");
  const { payload } = await jwtVerify(id_token, jwks, { issuer: discovery.issuer, audience: config.oidc.clientId });
  if (payload.nonce !== expected.nonce) throw new Error("The ID token's nonce doesn't match");
  return identityOf(payload);
}

function identityOf(claims: JWTPayload): Identity {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  if (!claims.sub) throw new Error("The ID token has no subject");
  return {
    subject: `${config.oidc.issuer}|${claims.sub}`,
    email: str(claims.email)?.toLowerCase() ?? null,
    emailVerified: claims.email_verified === true,
    name: str(claims.name) ?? str(claims.preferred_username) ?? "",
    username: str(claims.preferred_username),
  };
}

export type Resolution = { account: AccountRow } | { refused: "unknown" };

/**
 * The account this identity signs in as: the one linked to it (from the
 * account's own page, signed in, see `linkAccount`). With OIDC_LINK_BY_EMAIL, an
 * organizer account with the same verified email gets linked on first sign-in;
 * never an owner: a provider that lets people pick their own email would hand
 * the instance over. With OIDC_AUTO_CREATE, a new organizer without events.
 */
export function resolveAccount(identity: Identity): Resolution {
  const db = getDb();
  const linked = db.select().from(accounts).where(eq(accounts.oidcSubject, identity.subject)).get();
  if (linked) return { account: linked };

  if (config.oidc.linkByEmail && identity.email && identity.emailVerified) {
    const byEmail = db
      .select()
      .from(accounts)
      .where(sql`lower(${accounts.email}) = ${identity.email}`)
      .get();
    if (byEmail && byEmail.role === "organizer" && !byEmail.oidcSubject) {
      return { account: db.update(accounts).set({ oidcSubject: identity.subject }).where(eq(accounts.id, byEmail.id)).returning().get() };
    }
  }

  if (!config.oidc.autoCreate) return { refused: "unknown" };
  const account = createAccount({
    username: freeUsername(identity),
    name: identity.name,
    email: identity.emailVerified ? identity.email : null,
    role: "organizer",
    eventIds: [],
    // Signs in through the provider only: a real hash (a fake one made bcrypt throw on a
    // password attempt) of a random password nobody knows.
    passwordHash: hashPassword(randomToken(32)),
  });
  return { account: db.update(accounts).set({ oidcSubject: identity.subject }).where(eq(accounts.id, account.id)).returning().get() };
}

/** Links the signed-in account to this identity; refused when the identity already belongs to another account. */
export function linkAccount(accountId: string, identity: Identity): "linked" | "taken" {
  const db = getDb();
  const owner = db.select({ id: accounts.id }).from(accounts).where(eq(accounts.oidcSubject, identity.subject)).get();
  if (owner && owner.id !== accountId) return "taken";
  db.update(accounts).set({ oidcSubject: identity.subject }).where(eq(accounts.id, accountId)).run();
  return "linked";
}

export function unlinkAccount(accountId: string): void {
  getDb().update(accounts).set({ oidcSubject: null }).where(eq(accounts.id, accountId)).run();
}

function freeUsername(identity: Identity): string {
  const wanted = (identity.username ?? identity.email?.split("@")[0] ?? "sso").toLowerCase().replace(/[^a-z0-9._-]/g, "").replace(/^[^a-z0-9]+/, "").slice(0, 24) || "sso";
  const base = wanted.length >= 2 ? wanted : `${wanted}user`;
  if (!getAccountByUsername(base)) return base;
  return `${base}-${randomToken(4)}`;
}
