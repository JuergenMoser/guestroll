import { createHash } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { freshEnv } from "../helpers/env";

let env: Awaited<ReturnType<typeof freshEnv>> | undefined;
let server: Server;
let issuer = "";
let received: URLSearchParams | undefined;
// What the next token request answers with: tests set the claims and the signing key.
let next: { claims: Record<string, unknown>; key: CryptoKey; kid: string } | undefined;
let publicJwk: JWK;
let signing: CryptoKey;

beforeEach(async () => {
  const pair = await generateKeyPair("RS256", { extractable: true });
  signing = pair.privateKey;
  publicJwk = { ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "RS256", use: "sig" };
  server = createServer((req, res) => {
    const json = (body: unknown) => res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(body));
    if (req.url === "/.well-known/openid-configuration") return json({ issuer, authorization_endpoint: `${issuer}/authorize`, token_endpoint: `${issuer}/token`, jwks_uri: `${issuer}/jwks` });
    if (req.url === "/jwks") return json({ keys: [publicJwk] });
    if (req.url === "/token") {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", async () => {
        received = new URLSearchParams(Buffer.concat(chunks).toString());
        const token = await new SignJWT(next!.claims).setProtectedHeader({ alg: "RS256", kid: next!.kid }).setIssuedAt().setExpirationTime("5m").sign(next!.key);
        json({ id_token: token, token_type: "Bearer" });
      });
      return;
    }
    res.writeHead(404).end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  issuer = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(() => {
  env?.cleanup();
  server.close();
});

const sso = (extra: Record<string, string> = {}) => freshEnv({ OIDC_ISSUER: issuer, OIDC_CLIENT_ID: "guestroll", OIDC_CLIENT_SECRET: "s3cret", ...extra });

async function signIn(claims: Record<string, unknown>, options: { key?: CryptoKey; nonce?: string } = {}) {
  const oidc = await import("@/lib/auth/oidc");
  const start = await oidc.startLogin("https://photos.example/api/admin/oidc/callback");
  const params = new URL(start.url).searchParams;
  next = { claims: { iss: issuer, aud: "guestroll", nonce: options.nonce ?? start.nonce, ...claims }, key: options.key ?? signing, kid: "k1" };
  const identity = await oidc.finishLogin("the-code", "https://photos.example/api/admin/oidc/callback", { nonce: start.nonce, verifier: start.verifier });
  return { identity, params };
}

describe("single sign-on", () => {
  it("runs the code flow with PKCE and checks the ID token", async () => {
    env = await sso();
    const { identity, params } = await signIn({ sub: "u-1", email: "Lea@Example.test", email_verified: true, name: "Léa" });
    expect(params.get("code_challenge_method")).toBe("S256");
    expect(params.get("scope")).toBe("openid email profile");
    // The verifier sent with the code is the one behind the challenge.
    expect(createHash("sha256").update(received!.get("code_verifier")!).digest("base64url")).toBe(params.get("code_challenge"));
    expect(identity).toEqual({ subject: `${issuer}|u-1`, email: "lea@example.test", emailVerified: true, name: "Léa", username: null });
  });

  it("refuses a token signed by another key, for another client, or for another login", async () => {
    env = await sso();
    const other = (await generateKeyPair("RS256")).privateKey;
    await expect(signIn({ sub: "u-1" }, { key: other })).rejects.toThrow();
    await expect(signIn({ sub: "u-1", aud: "someone-else" })).rejects.toThrow();
    await expect(signIn({ sub: "u-1" }, { nonce: "replayed" })).rejects.toThrow("nonce");
  });

  it("never links by email unless told to, and then never an owner", async () => {
    env = await sso();
    const oidc = await import("@/lib/auth/oidc");
    const accounts = await import("@/lib/accounts");
    accounts.createAccount({ username: "lea", name: "Léa", email: "lea@example.test", role: "organizer", eventIds: [], passwordHash: "x" });
    accounts.createAccount({ username: "boss", name: "", email: "boss@example.test", role: "owner", eventIds: [], passwordHash: "x" });
    const identity = (sub: string, email: string) => ({ subject: `${issuer}|${sub}`, email, emailVerified: true, name: "", username: null });
    // Default: a provider letting people set their own email can't hand over an account.
    expect(oidc.resolveAccount(identity("u-1", "lea@example.test"))).toEqual({ refused: "unknown" });

    env.cleanup();
    env = await sso({ OIDC_LINK_BY_EMAIL: "true" });
    const again = await import("@/lib/auth/oidc");
    const accountsAgain = await import("@/lib/accounts");
    const lea = accountsAgain.createAccount({ username: "lea", name: "Léa", email: "lea@example.test", role: "organizer", eventIds: [], passwordHash: "x" });
    accountsAgain.createAccount({ username: "boss", name: "", email: "boss@example.test", role: "owner", eventIds: [], passwordHash: "x" });
    expect(again.resolveAccount(identity("u-1", "lea@example.test"))).toMatchObject({ account: { id: lea.id, oidcSubject: `${issuer}|u-1` } });
    expect(again.resolveAccount(identity("u-2", "boss@example.test"))).toEqual({ refused: "unknown" });
    // Linked: another identity with the same email doesn't take it over.
    expect(again.resolveAccount(identity("u-3", "lea@example.test"))).toEqual({ refused: "unknown" });
  });

  it("links from the signed-in account, refuses an identity already taken, and creates only when allowed", async () => {
    env = await sso();
    const oidc = await import("@/lib/auth/oidc");
    const accounts = await import("@/lib/accounts");
    const a = accounts.createAccount({ username: "anna", name: "", email: null, role: "owner", eventIds: [], passwordHash: "x" });
    const b = accounts.createAccount({ username: "bob", name: "", email: null, role: "organizer", eventIds: [], passwordHash: "x" });
    const identity = { subject: `${issuer}|u-5`, email: null, emailVerified: false, name: "", username: null };
    expect(oidc.linkAccount(a.id, identity)).toBe("linked");
    expect(oidc.resolveAccount(identity)).toMatchObject({ account: { id: a.id } });
    expect(oidc.linkAccount(b.id, identity)).toBe("taken");
    oidc.unlinkAccount(a.id);
    expect(oidc.resolveAccount(identity)).toEqual({ refused: "unknown" });
    // A new password takes the account back: a link made by whoever had the session goes.
    oidc.linkAccount(b.id, identity);
    accounts.setAccountPassword(b.id, accounts.hashPassword("a-new-password-1"));
    expect(oidc.resolveAccount(identity)).toEqual({ refused: "unknown" });

    env.cleanup();
    env = await sso({ OIDC_AUTO_CREATE: "true" });
    const created = (await import("@/lib/auth/oidc")).resolveAccount({ subject: `${issuer}|u-9`, email: "max@example.test", emailVerified: true, name: "Max", username: "max" });
    expect(created).toMatchObject({ account: { username: "max", role: "organizer", email: "max@example.test" } });
    // No password works on it.
    expect(await (await import("@/lib/auth/admin")).verifyLogin("max", "")).toBeNull();
  });
});
