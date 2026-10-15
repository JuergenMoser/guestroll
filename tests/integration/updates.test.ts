import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshEnv } from "../helpers/env";

let env: Awaited<ReturnType<typeof freshEnv>>;
beforeEach(async () => (env = await freshEnv({ ADMIN_EMAIL: "owner@x.test" })));
afterEach(() => env.cleanup());

const release = (tag: string, extra: Record<string, unknown> = {}) =>
  new Response(JSON.stringify({ tag_name: tag, body: "### Added\n\n- Things", html_url: `https://github.com/achedon12/guestroll/releases/tag/${tag}`, published_at: "2026-11-01T10:00:00Z", ...extra }));

describe("update detection", () => {
  it("compares versions the semantic way", async () => {
    const { compareVersions } = await import("@/lib/updates");
    expect(compareVersions("0.10.0", "0.9.9")).toBe(1);
    expect(compareVersions("v1.0.0", "1.0.0")).toBe(0);
    expect(compareVersions("1.0.0-rc.1", "1.0.0")).toBe(-1);
    expect(compareVersions("0.3.0", "0.3.1")).toBe(-1);
  });

  it("stores the latest release and tells the owners once per version", async () => {
    const { checkForUpdate, availableUpdate, currentVersion } = await import("@/lib/updates");
    const { outboxSummary } = await import("@/lib/mail/outbox");
    const fetcher = vi.fn(async () => release("v99.0.0"));
    await checkForUpdate(fetcher);
    await checkForUpdate(fetcher);
    expect(availableUpdate()).toMatchObject({ version: "99.0.0", notes: "### Added\n\n- Things" });
    const mails = outboxSummary().recent.filter((m) => m.kind === "update");
    expect(mails).toHaveLength(1);
    expect(mails[0].subject).toContain("99.0.0");

    await checkForUpdate(async () => release(`v${currentVersion()}`));
    expect(availableUpdate()).toBeNull();
  });

  it("ignores drafts, pre-releases and odd tags", async () => {
    const { checkForUpdate, availableUpdate } = await import("@/lib/updates");
    await expect(checkForUpdate(async () => release("v99.0.0", { prerelease: true }))).rejects.toThrow();
    await expect(checkForUpdate(async () => release("nightly"))).rejects.toThrow();
    await expect(checkForUpdate(async () => new Response("", { status: 403 }))).rejects.toThrow(/403/);
    expect(availableUpdate()).toBeNull();
  });

  it("records an update at startup, with the migrations it applied", async () => {
    const { recordStartup, updateHistory, currentVersion } = await import("@/lib/updates");
    const { writeSetting } = await import("@/lib/settings");
    expect(recordStartup()).toBeNull();
    writeSetting("app_version", "0.0.1");
    const record = recordStartup(1_800_000_000_000)!;
    expect(record).toMatchObject({ from: "0.0.1", to: currentVersion(), at: 1_800_000_000_000 });
    expect(record.migrations.length).toBeGreaterThan(0);
    expect(updateHistory()[0]).toEqual(record);
    expect(recordStartup()).toBeNull();
  });
});

describe("talking to the updater", () => {
  it("sends the version with the shared token, and reports a busy or missing updater", async () => {
    const seen: { auth?: string; body?: string }[] = [];
    const server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        seen.push({ auth: req.headers.authorization, body });
        res.setHeader("Content-Type", "application/json");
        if (req.url === "/status") return res.end(JSON.stringify({ ok: true, image: "ghcr.io/achedon12/guestroll:0.3.0", job: null }));
        res.statusCode = seen.length > 2 ? 409 : 202;
        res.end(JSON.stringify(seen.length > 2 ? { error: "busy" } : { job: { version: "0.4.0", state: "running", startedAt: 1, log: [] } }));
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    vi.stubEnv("UPDATER_URL", `http://127.0.0.1:${(server.address() as AddressInfo).port}`);
    vi.stubEnv("UPDATER_TOKEN", "a-long-shared-token-for-tests");
    vi.resetModules();
    const updater = await import("@/lib/updater");
    expect(await updater.updaterStatus()).toMatchObject({ configured: true, reachable: true, image: "ghcr.io/achedon12/guestroll:0.3.0" });
    expect((await updater.startUpdate("0.4.0")).state).toBe("running");
    expect(seen[1]).toEqual({ auth: "Bearer a-long-shared-token-for-tests", body: '{"version":"0.4.0"}' });
    await expect(updater.startUpdate("0.4.0")).rejects.toThrow(/already running/);
    server.close();
    expect((await updater.updaterStatus()).reachable).toBe(false);
  });
});
