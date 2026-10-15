import { afterEach, describe, expect, it, vi } from "vitest";
import { freshEnv } from "../helpers/env";

let env: Awaited<ReturnType<typeof freshEnv>> | undefined;
afterEach(() => env?.cleanup());

describe("admin accounts", () => {
  it("creates the owner from ADMIN_PASSWORD and keeps it in sync", async () => {
    env = await freshEnv({ ADMIN_PASSWORD: "from-the-environment" });
    const admin = await import("@/lib/auth/admin");
    admin.bootstrapAdmin();
    const owner = (await admin.verifyLogin("admin", "from-the-environment"))!;
    expect(owner).toMatchObject({ username: "admin", role: "owner" });
    expect(await admin.verifyLogin("admin", "something-else")).toBeNull();
    expect(await admin.verifyLogin("nobody", "from-the-environment")).toBeNull();
    expect(admin.passwordManagedByEnv(owner)).toBe(true);
    expect(() => admin.changePassword(owner, "new-password-123")).toThrow();
  });

  it("follows a new ADMIN_PASSWORD on the next start and signs older sessions out", async () => {
    env = await freshEnv({ ADMIN_PASSWORD: "first-password" });
    let admin = await import("@/lib/auth/admin");
    admin.bootstrapAdmin();
    const before = (await admin.verifyLogin("admin", "first-password"))!;

    vi.resetModules();
    vi.stubEnv("ADMIN_PASSWORD", "second-password");
    admin = await import("@/lib/auth/admin");
    admin.bootstrapAdmin();
    const after = (await admin.verifyLogin("admin", "second-password"))!;
    expect(after.id).toBe(before.id);
    expect(after.sessionVersion).toBe(before.sessionVersion + 1);
    expect(await admin.verifyLogin("admin", "first-password")).toBeNull();
  });

  it("generates and prints the owner's password on first boot when none is configured", async () => {
    env = await freshEnv({ ADMIN_PASSWORD: "" });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const admin = await import("@/lib/auth/admin");
    admin.bootstrapAdmin();
    const printed = log.mock.calls.flat().join("\n");
    const generated = printed.match(/password: ([a-z0-9]{16})/)?.[1];
    log.mockRestore();
    expect(printed).toContain("username: admin");
    expect(await admin.verifyLogin("admin", generated!)).not.toBeNull();
  });

  it("turns the single password of an older install into the owner account", async () => {
    env = await freshEnv({ ADMIN_PASSWORD: "" });
    const bcrypt = (await import("bcryptjs")).default;
    const { writeSetting, readSetting } = await import("@/lib/settings");
    writeSetting("admin_password_hash", bcrypt.hashSync("the-old-password", 4));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const admin = await import("@/lib/auth/admin");
    admin.bootstrapAdmin();
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
    expect(await admin.verifyLogin("admin", "the-old-password")).toMatchObject({ role: "owner" });
    expect(readSetting("admin_password_hash")).toBeUndefined();
  });

  it("bumps the session version on password change, which signs out older sessions", async () => {
    env = await freshEnv({ ADMIN_PASSWORD: "" });
    vi.spyOn(console, "log").mockImplementation(() => {});
    const admin = await import("@/lib/auth/admin");
    const accounts = await import("@/lib/accounts");
    admin.bootstrapAdmin();
    const created = accounts.createAccount({ username: "lea", name: "Léa", email: null, role: "organizer", eventIds: [], passwordHash: accounts.hashPassword("lea-password-1") });
    admin.changePassword(created, "lea-password-2");
    expect(accounts.getAccount(created.id)!.sessionVersion).toBe(created.sessionVersion + 1);
    expect(await admin.verifyLogin("lea", "lea-password-2")).not.toBeNull();
    expect(await admin.verifyLogin("LEA ", "lea-password-2")).not.toBeNull();
  });

  it("gives organizers their events only, and owners everything", async () => {
    env = await freshEnv();
    const admin = await import("@/lib/auth/admin");
    const accounts = await import("@/lib/accounts");
    const events = await import("@/lib/events");
    admin.bootstrapAdmin();
    const a = events.createEvent({ name: "A" });
    const b = events.createEvent({ name: "B" });
    const org = accounts.createAccount({ username: "org", name: "", email: "org@x.test", role: "organizer", eventIds: [a.id], passwordHash: "x" });
    expect(admin.identityOf(org).scope).toEqual({ all: false, eventIds: [a.id] });
    expect(events.listEvents(admin.identityOf(org).scope).map((e) => e.name)).toEqual(["A"]);
    expect(events.listEvents({ all: true })).toHaveLength(2);

    accounts.updateAccount(org.id, { eventIds: [a.id, b.id] });
    expect(accounts.accountEventIds(org.id).sort()).toEqual([a.id, b.id].sort());
    // Promoted to owner: assignments are dropped, owners see everything anyway.
    accounts.updateAccount(org.id, { role: "owner" });
    expect(accounts.accountEventIds(org.id)).toEqual([]);
    expect(admin.identityOf(accounts.getAccount(org.id)!).scope).toEqual({ all: true });

    // Deleting an event removes its assignments.
    const org2 = accounts.createAccount({ username: "org2", name: "", email: null, role: "organizer", eventIds: [b.id], passwordHash: "x" });
    await events.deleteEvent(b.id);
    expect(accounts.accountEventIds(org2.id)).toEqual([]);
  });

  it("sends an event's emails to the instance address and to the accounts managing it", async () => {
    env = await freshEnv({ ADMIN_EMAIL: "instance@x.test" });
    const admin = await import("@/lib/auth/admin");
    const accounts = await import("@/lib/accounts");
    const events = await import("@/lib/events");
    const mail = await import("@/lib/mail/settings");
    admin.bootstrapAdmin();
    const a = events.createEvent({ name: "A" });
    accounts.createAccount({ username: "org", name: "", email: "Org@x.test", role: "organizer", eventIds: [a.id], passwordHash: "x" });
    accounts.createAccount({ username: "other", name: "", email: "other@x.test", role: "organizer", eventIds: [], passwordHash: "x" });
    accounts.createAccount({ username: "boss", name: "", email: "boss@x.test", role: "owner", eventIds: [], passwordHash: "x" });
    expect(mail.eventRecipients(a.id).sort()).toEqual(["boss@x.test", "instance@x.test", "org@x.test"]);
    expect(mail.instanceRecipients().sort()).toEqual(["boss@x.test", "instance@x.test"]);
  });
});

describe("session secret", () => {
  it("is generated once and reused across restarts", async () => {
    env = await freshEnv({ SESSION_SECRET: "" });
    const first = (await import("@/lib/auth/secret")).sessionSecret();
    vi.resetModules();
    const second = (await import("@/lib/auth/secret")).sessionSecret();
    expect(first).toHaveLength(64);
    expect(second).toBe(first);
  });

  it("refuses a SESSION_SECRET shorter than 32 characters", async () => {
    env = await freshEnv({ SESSION_SECRET: "too-short" });
    await expect(import("@/lib/auth/secret").then((m) => m.sessionSecret())).rejects.toThrow(/32/);
  });
});

describe("two-step verification at rest", () => {
  it("keeps the secret sealed and recovery codes hashed", async () => {
    env = await freshEnv();
    const admin = await import("@/lib/auth/admin");
    const accounts = await import("@/lib/accounts");
    const tf = await import("@/lib/auth/twoFactor");
    const { hotp, base32Decode } = await import("@/lib/auth/totp");
    admin.bootstrapAdmin();
    const account = accounts.getAccountByUsername("admin")!;
    const { secret } = tf.startTwoFactor(account, "Guestroll");
    const codes = tf.confirmTwoFactor(accounts.getAccount(account.id)!, hotp(base32Decode(secret), Math.floor(Date.now() / 30_000)))!;
    const row = accounts.getAccount(account.id)!;
    expect(row.totpSecret).not.toContain(secret);
    expect(row.totpPending).toBeNull();
    expect(row.recoveryCodes).not.toContain(codes[0]);
    expect(row.sessionVersion).toBe(account.sessionVersion + 1);
    expect(tf.checkSecondFactor(row, codes[1])).toBe("recovery");
    expect(tf.checkSecondFactor(accounts.getAccount(account.id)!, codes[1])).toBeNull();
    // Two requests that read the account before either wrote: only one spends the code.
    const stale = accounts.getAccount(account.id)!;
    expect(tf.checkSecondFactor(stale, codes[2])).toBe("recovery");
    expect(tf.checkSecondFactor(stale, codes[3])).toBeNull();
    const now = Date.now();
    const code = hotp(base32Decode(secret), Math.floor(now / 30_000) + 1);
    const before = accounts.getAccount(account.id)!;
    expect(tf.checkSecondFactor(before, code, now)).toBe("totp");
    expect(tf.checkSecondFactor(before, code, now)).toBeNull();
  });
});
