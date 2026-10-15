import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { freshEnv } from "../helpers/env";

let env: Awaited<ReturnType<typeof freshEnv>> | undefined;
let server: Server;
let base = "";
const files = new Map<string, number>();
const folders = new Set<string>();

// Just enough WebDAV: Basic auth, MKCOL, PUT, PROPFIND, like a Nextcloud would answer.
beforeEach(async () => {
  files.clear();
  folders.clear();
  server = createServer((req, res) => {
    if (req.headers.authorization !== `Basic ${Buffer.from("lea:app-password").toString("base64")}`) return res.writeHead(401).end();
    const path = decodeURIComponent(new URL(req.url!, "http://x").pathname);
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      if (req.method === "PROPFIND") return res.writeHead(207).end("<d:multistatus xmlns:d='DAV:'/>");
      if (req.method === "MKCOL") {
        if (folders.has(path)) return res.writeHead(405).end();
        folders.add(path);
        return res.writeHead(201).end();
      }
      if (req.method === "PUT") {
        files.set(path, Buffer.concat(chunks).length);
        return res.writeHead(201).end();
      }
      res.writeHead(405).end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/dav/files/lea/`;
});
afterEach(() => {
  env?.cleanup();
  server.close();
});

async function eventWithPhotos(name: string, count: number) {
  const events = await import("@/lib/events");
  const photos = await import("@/lib/photos");
  const { processPhoto } = await import("@/lib/images/process");
  const { writePhotoFiles } = await import("@/lib/storage/files");
  const event = events.updateEvent(events.createEvent({ name }).id, { eventDate: "2026-10-17" })!;
  for (let i = 0; i < count; i++) {
    const p = await processPhoto(await sharp({ create: { width: 400, height: 300, channels: 3, background: { r: 40 * i, g: 90, b: 120 } } }).jpeg().toBuffer());
    const id = crypto.randomUUID();
    await writePhotoFiles(event.id, id, p.files);
    photos.insertPhoto({ id, eventId: event.id, guestId: "g", guestName: "Camille", width: p.width, height: p.height, bytes: 1, status: "visible" });
  }
  return event;
}

async function finished(id: string) {
  const { getDb } = await import("@/lib/db/client");
  const { cloudExports } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");
  const { runExports } = await import("@/lib/cloud/export");
  await runExports();
  return getDb().select().from(cloudExports).where(eq(cloudExports.id, id)).get()!;
}

describe("cloud export", () => {
  it("sends the originals to <folder>/<date name>/, named like the ZIP", async () => {
    env = await freshEnv({ CLOUD_ALLOW_PRIVATE: "true" });
    const cloud = await import("@/lib/cloud/settings");
    const { startExport } = await import("@/lib/cloud/export");
    const { testConnection } = await import("@/lib/cloud/webdav");
    cloud.saveCloudSettings({ url: base, user: "lea", password: "app-password", folder: "Guestroll/Albums", autoExport: false });
    await testConnection(cloud.getCloudSettings()!);
    const event = await eventWithPhotos("Julie & Thomas", 3);

    const job = await finished(startExport(event.id, "visible").id);
    expect(job).toMatchObject({ status: "done", done: 3, total: 3, error: null });
    expect([...folders]).toEqual(["/dav/files/lea/Guestroll/", "/dav/files/lea/Guestroll/Albums/", "/dav/files/lea/Guestroll/Albums/2026-10-17 Julie & Thomas/"]);
    const names = [...files.keys()].map((p) => p.split("/").at(-1));
    expect(names).toHaveLength(3);
    expect(names[0]).toMatch(/^0001-camille-[0-9a-f]{8}\.jpg$/);
    // Each file arrived whole: the size of the stored original, byte for byte.
    const { storage } = await import("@/lib/storage");
    const { photoKey } = await import("@/lib/storage/files");
    const { listForArchive } = await import("@/lib/photos");
    const originals = await Promise.all(listForArchive(event.id, "visible").map(async (p) => (await storage().read(photoKey(event.id, p.id, "original")))!.length));
    expect([...files.values()].sort()).toEqual(originals.sort());
  });

  it("fails with a readable reason, and the end of an event sends the album on its own", async () => {
    env = await freshEnv({ CLOUD_ALLOW_PRIVATE: "true" });
    const cloud = await import("@/lib/cloud/settings");
    const { startExport, listExports } = await import("@/lib/cloud/export");
    const { endEvent } = await import("@/lib/mail/automation");
    const event = await eventWithPhotos("Party", 1);

    cloud.saveCloudSettings({ url: base, user: "lea", password: "wrong", folder: "", autoExport: true });
    const failed = await finished(startExport(event.id, "visible").id);
    expect(failed.status).toBe("failed");
    expect(failed.error).toContain("HTTP 401");

    cloud.saveCloudSettings({ url: base, user: "lea", password: "app-password", folder: "", autoExport: true });
    endEvent((await import("@/lib/events")).getEventById(event.id)!);
    const auto = await finished(listExports(event.id)[0].id);
    expect(auto.status).toBe("done");
  });

  it("refuses a server on the local network unless allowed, and keeps the password for its own server only", async () => {
    env = await freshEnv();
    const cloud = await import("@/lib/cloud/settings");
    const { testConnection } = await import("@/lib/cloud/webdav");
    cloud.saveCloudSettings({ url: base, user: "lea", password: "app-password", folder: "", autoExport: false });
    await expect(testConnection(cloud.getCloudSettings()!)).rejects.toThrow("private or local address");
    expect(cloud.cloudNeedsPassword({ url: "https://evil.example/dav/", user: "lea", password: "" })).toBe(true);
    expect(cloud.cloudNeedsPassword({ url: base, user: "lea", password: "" })).toBe(false);
    expect(cloud.parseFolder("a/../b")).toBeNull();
    expect(cloud.parseWebdavUrl("https://user:pw@cloud.example/")).toBeNull();
  });

  it("keeps every file under the configured folder, whatever the event is called", async () => {
    env = await freshEnv({ CLOUD_ALLOW_PRIVATE: "true" });
    const cloud = await import("@/lib/cloud/settings");
    const { startExport } = await import("@/lib/cloud/export");
    cloud.saveCloudSettings({ url: base, user: "lea", password: "app-password", folder: "Guestroll", autoExport: false });
    for (const name of ["..", "...", ". .", "../../etc"]) {
      const event = await eventWithPhotos(name, 1);
      expect((await finished(startExport(event.id, "visible").id)).status).toBe("done");
    }
    for (const path of [...folders, ...files.keys()]) expect(path.startsWith("/dav/files/lea/Guestroll/"), path).toBe(true);
  });
});
