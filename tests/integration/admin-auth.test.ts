import { afterEach, describe, expect, it, vi } from "vitest";
import { freshEnv } from "../helpers/env";

let env: Awaited<ReturnType<typeof freshEnv>> | undefined;
afterEach(() => env?.cleanup());

describe("admin password", () => {
  it("follows ADMIN_PASSWORD and refuses UI changes while it's set", async () => {
    env = await freshEnv({ ADMIN_PASSWORD: "from-the-environment" });
    const admin = await import("@/lib/auth/admin");
    admin.bootstrapAdmin();
    expect(await admin.verifyPassword("from-the-environment")).toBe(true);
    expect(await admin.verifyPassword("something-else")).toBe(false);
    expect(admin.passwordManagedByEnv()).toBe(true);
    expect(() => admin.changePassword("new-password-123")).toThrow();
  });

  it("generates and prints a password on first boot when none is configured", async () => {
    env = await freshEnv({ ADMIN_PASSWORD: "" });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const admin = await import("@/lib/auth/admin");
    admin.bootstrapAdmin();
    const printed = log.mock.calls.flat().join("\n");
    const generated = printed.match(/│ {2}([a-z0-9]{16}) +│/)?.[1];
    log.mockRestore();
    expect(generated).toBeDefined();
    expect(await admin.verifyPassword(generated!)).toBe(true);
  });

  it("bumps the password version on change, which signs out older sessions", async () => {
    env = await freshEnv({ ADMIN_PASSWORD: "" });
    vi.spyOn(console, "log").mockImplementation(() => {});
    const admin = await import("@/lib/auth/admin");
    admin.bootstrapAdmin();
    const before = admin.passwordVersion();
    admin.changePassword("brand-new-password");
    expect(admin.passwordVersion()).toBe(before + 1);
    expect(await admin.verifyPassword("brand-new-password")).toBe(true);
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
