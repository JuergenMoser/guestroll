import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { freshEnv } from "../helpers/env";

let env: Awaited<ReturnType<typeof freshEnv>>;
beforeEach(async () => (env = await freshEnv({ DEMO_MODE: "true" })));
afterEach(() => env.cleanup());

describe("demo mode", () => {
  it("seeds a believable instance and resets it to the same point", async () => {
    const { seedDemo, resetDemo, DEMO_PASSWORD } = await import("@/lib/demo/seed");
    await seedDemo();
    const events = await import("@/lib/events");
    const before = events.listEvents({ all: true });
    expect(before.map((e) => e.name).sort()).toEqual(["Julie & Thomas", "Léa turns 30", "Open Source Summit"]);
    expect(before.reduce((n, e) => n + e.photoCount, 0)).toBe(42);

    // A visitor's changes…
    const extra = events.createEvent({ name: "Visitor's test" });
    await events.deleteEvent(before[0].id);
    await resetDemo();

    // …are gone after the reset; the demo account still signs in.
    const after = (await import("@/lib/events")).listEvents({ all: true });
    expect(after.map((e) => e.name).sort()).toEqual(["Julie & Thomas", "Léa turns 30", "Open Source Summit"]);
    expect(after.some((e) => e.id === extra.id)).toBe(false);
    const { verifyLogin } = await import("@/lib/auth/admin");
    expect(await verifyLogin("demo", DEMO_PASSWORD)).toMatchObject({ role: "owner" });
    expect(await verifyLogin("admin", "test-admin-password")).not.toBeNull();
  });

  it("sends nothing out and never checks for updates", async () => {
    const { config } = await import("@/lib/config");
    expect(config.updateCheck).toBe(false);
    const { enqueueMail, outboxSummary } = await import("@/lib/mail/outbox");
    enqueueMail({ to: "x@x.test", mail: { subject: "s", html: "h", text: "t" }, kind: "t" });
    const { tick } = await import("@/lib/scheduler");
    await tick();
    expect(outboxSummary().pending).toBe(1);
  });

  it("refuses to seed or wipe an instance that holds its own data", async () => {
    const events = await import("@/lib/events");
    events.createEvent({ name: "A real wedding" });
    const { seedDemo, resetDemo, NotADemoError } = await import("@/lib/demo/seed");
    await expect(seedDemo()).rejects.toBeInstanceOf(NotADemoError);
    await expect(resetDemo()).rejects.toBeInstanceOf(NotADemoError);
    const { getAccountByUsername } = await import("@/lib/accounts");
    expect(getAccountByUsername("demo")).toBeUndefined();
    expect(events.listEvents({ all: true }).map((e) => e.name)).toEqual(["A real wedding"]);
  });
});

