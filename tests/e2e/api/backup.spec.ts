import { expect, test } from "@playwright/test";
import { admin, client, createEvent, joinAndUpload, signIn } from "../helpers";

test.describe("backup", () => {
  test("downloads everything, and a restore brings the instance back to it", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const before = await createEvent(host, { name: "Before the backup" });
    await joinAndUpload(await client(baseURL!), before.slug, 2);

    const info = await (await host.get("/api/admin/backup")).json();
    expect(info.files).toBeGreaterThanOrEqual(6);
    const res = await host.get("/api/admin/backup?download=1");
    expect(res.headers()["content-type"]).toBe("application/zip");
    const zip = await res.body();
    expect(zip.includes(Buffer.from("manifest.json"))).toBe(true);
    expect(zip.includes(Buffer.from("guestroll.db"))).toBe(true);

    const after = await createEvent(host, { name: "After the backup" });
    const restored = await host.post("/api/admin/backup/restore", { data: zip, headers: { "Content-Type": "application/zip" } });
    expect(restored.status()).toBe(200);

    // Same instance, same secret: the session survives; the newer event is gone.
    const again = await admin(baseURL!);
    expect((await again.get(`/api/admin/events/${after.id}`)).status()).toBe(404);
    const photos = (await (await again.get(`/api/admin/events/${before.id}/photos`)).json()).photos;
    expect(photos).toHaveLength(2);
    expect((await again.get(`/api/media/${photos[0].id}?v=original`)).status()).toBe(200);
  });

  test("refuses anything else, and is for owners only", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const bad = await host.post("/api/admin/backup/restore", { data: Buffer.from("not a zip"), headers: { "Content-Type": "application/zip" } });
    expect(bad.status()).toBe(400);
    expect((await host.put("/api/admin/backup/retention", { data: { days: 3 } })).status()).toBe(400);
    expect((await host.put("/api/admin/backup/retention", { data: { days: 0 } })).status()).toBe(200);

    const { password, account } = await (await host.post("/api/admin/accounts", { data: { username: `org${Date.now()}`, role: "organizer" } })).json();
    const organizer = await signIn(baseURL!, account.username, password);
    expect((await organizer.get("/api/admin/backup?download=1")).status()).toBe(403);
  });

  test("scheduled backups: a schedule, a backup now, the list, download and delete", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    expect((await host.put("/api/admin/backup/schedule", { data: { enabled: true, cron: "every night", keep: 3 } })).status()).toBe(400);
    const saved = await (await host.put("/api/admin/backup/schedule", { data: { enabled: true, cron: "0 3 * * *", keep: 3 } })).json();
    expect(saved.schedule).toEqual({ enabled: true, cron: "0 3 * * *", keep: 3 });
    expect(saved.nextRun).toBeGreaterThan(Date.now());

    const { run } = await (await host.post("/api/admin/backup/run")).json();
    expect(run).toMatchObject({ ok: true });
    const info = await (await host.get("/api/admin/backup")).json();
    expect(info.stored.map((b: { name: string }) => b.name)).toContain(run.name);
    expect(info.lastRun).toMatchObject({ ok: true, name: run.name });

    const file = await host.get(`/api/admin/backup/stored/${run.name}`);
    expect(file.headers()["content-type"]).toBe("application/zip");
    expect((await host.get("/api/admin/backup/stored/..%2F..%2Fguestroll.db")).status()).toBe(404);
    expect((await host.delete(`/api/admin/backup/stored/${run.name}`)).status()).toBe(200);
    await host.put("/api/admin/backup/schedule", { data: { enabled: false, cron: "0 3 * * *", keep: 3 } });
  });
});

