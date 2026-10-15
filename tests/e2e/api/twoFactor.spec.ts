import { expect, test } from "@playwright/test";
import { base32Decode, hotp } from "../../../src/lib/auth/totp";
import { admin, client, signIn } from "../helpers";

const codeFor = (secret: string, offset = 0) => hotp(base32Decode(secret), Math.floor(Date.now() / 30_000) + offset);

async function organizer(baseURL: string) {
  const owner = await admin(baseURL);
  const username = `tf${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
  const { password, account } = await (await owner.post("/api/admin/accounts", { data: { username, role: "organizer" } })).json();
  return { owner, username, password, account, api: await signIn(baseURL, username, password) };
}

test.describe("two-step verification", () => {
  test("set up, then every sign-in asks for a code; a code works once", async ({ baseURL }) => {
    const { username, password, api } = await organizer(baseURL!);
    const { secret, uri, qr } = await (await api.post("/api/admin/me/two-factor", { data: { action: "start" } })).json();
    expect(uri).toContain(`Guestroll%3A${username}`);
    expect(qr).toContain("<svg");
    expect((await api.post("/api/admin/me/two-factor", { data: { action: "confirm", code: "000000" } })).status()).toBe(400);
    const confirmed = await (await api.post("/api/admin/me/two-factor", { data: { action: "confirm", code: codeFor(secret) } })).json();
    expect(confirmed.recoveryCodes).toHaveLength(10);
    // This session stays signed in.
    expect((await api.get("/api/admin/events")).status()).toBe(200);

    const next = await client(baseURL!);
    expect(await (await next.post("/api/admin/login", { data: { username, password } })).json()).toEqual({ ok: false, codeRequired: true });
    // Password alone isn't a session.
    expect((await next.get("/api/admin/events")).status()).toBe(401);
    expect((await next.post("/api/admin/login/code", { data: { code: "123456" } })).status()).toBe(401);
    const code = codeFor(secret, 1);
    expect((await next.post("/api/admin/login/code", { data: { code } })).status()).toBe(200);
    expect((await next.get("/api/admin/events")).status()).toBe(200);

    // The same code again: refused (401, not merely rate limited).
    const replay = await client(baseURL!);
    await replay.post("/api/admin/login", { data: { username, password } });
    expect((await replay.post("/api/admin/login/code", { data: { code } })).status()).toBe(401);

    // A recovery code works once.
    const [recovery] = confirmed.recoveryCodes;
    expect((await replay.post("/api/admin/login/code", { data: { code: recovery } })).status()).toBe(200);
    const again = await client(baseURL!);
    await again.post("/api/admin/login", { data: { username, password } });
    expect((await again.post("/api/admin/login/code", { data: { code: recovery } })).status()).toBe(401);
    expect((await (await again.get("/api/admin/me/two-factor")).json())).not.toHaveProperty("recoveryCodesLeft", 10);
  });

  test("turning it off takes the password and a code; an owner can reset a lost phone", async ({ baseURL }) => {
    const { owner, account, username, password, api } = await organizer(baseURL!);
    const { secret } = await (await api.post("/api/admin/me/two-factor", { data: { action: "start" } })).json();
    await api.post("/api/admin/me/two-factor", { data: { action: "confirm", code: codeFor(secret) } });
    expect((await api.delete("/api/admin/me/two-factor", { data: { password: "wrong-password", code: codeFor(secret, 1) } })).status()).toBe(401);

    const list = (await (await owner.get("/api/admin/accounts")).json()).accounts;
    expect(list.find((a: { id: string }) => a.id === account.id).twoFactor).toBe(true);
    expect((await owner.patch(`/api/admin/accounts/${account.id}`, { data: { resetTwoFactor: true } })).status()).toBe(200);
    // Reset ends their sessions, and the password alone signs in again.
    expect((await api.get("/api/admin/events")).status()).toBe(401);
    expect(await (await (await client(baseURL!)).post("/api/admin/login", { data: { username, password } })).json()).toEqual({ ok: true });
  });

  test("a stale or missing first step can't be completed", async ({ baseURL }) => {
    const fresh = await client(baseURL!);
    const res = await fresh.post("/api/admin/login/code", { data: { code: "123456" } });
    expect(res.status()).toBe(401);
    expect((await res.json()).details).toEqual({ code: "expired" });
  });
});
