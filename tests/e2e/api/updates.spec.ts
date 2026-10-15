import { expect, test } from "@playwright/test";
import { admin, signIn } from "../helpers";

test.describe("updates", () => {
  test("owners see the version, the history, and why one-click updates are off", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const info = await (await host.get("/api/admin/updates")).json();
    expect(info.current).toMatch(/^\d+\.\d+\.\d+$/);
    expect(info).toMatchObject({ checkEnabled: false, available: null, updater: { configured: false, reachable: false } });
    // Nothing to install, and no updater anyway.
    expect((await host.post("/api/admin/updates/apply", { data: { version: "99.0.0" } })).status()).toBe(400);

    const { password, account } = await (await host.post("/api/admin/accounts", { data: { username: `up${Date.now()}`, role: "organizer" } })).json();
    const organizer = await signIn(baseURL!, account.username, password);
    expect((await organizer.get("/api/admin/updates")).status()).toBe(403);
  });
});
