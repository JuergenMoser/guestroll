import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { freshEnv } from "../helpers/env";

let env: Awaited<ReturnType<typeof freshEnv>>;
beforeEach(async () => {
  env = await freshEnv();
});
afterEach(() => env.cleanup());

const mods = async () => ({
  events: await import("@/lib/events"),
  photos: await import("@/lib/photos"),
  stats: await import("@/lib/stats"),
  activity: await import("@/lib/activity"),
  storage: await import("@/lib/storage/files"),
  ids: await import("@/lib/security/ids"),
});

const guest = (id: string, eventId: string) => ({ isAdmin: false, guestId: id, unlocked: [eventId] });
const ADMIN = { isAdmin: true, unlocked: [] };

describe("events", () => {
  it("creates an event with an unguessable slug and hashes the access code", async () => {
    const { events } = await mods();
    const event = events.createEvent({ name: "Julie & Thomas", accessCode: "secret-code" });
    expect(event.slug).toMatch(/^julie-thomas-[a-z0-9]{8}$/);
    expect(event.accessCodeHash).not.toContain("secret-code");
    expect(await events.checkAccessCode(event, "secret-code")).toBe(true);
    expect(await events.checkAccessCode(event, "wrong-code")).toBe(false);
    expect(events.toPublicEvent(event)).not.toHaveProperty("accessCodeHash");
    expect(events.toAdminEvent(event)).toMatchObject({ hasAccessCode: true });
  });

  it("keeps the code when a patch doesn't mention it, removes it on null", async () => {
    const { events } = await mods();
    const event = events.createEvent({ name: "Party", accessCode: "secret-code" });
    expect(events.updateEvent(event.id, { name: "Party 2" })!.accessCodeHash).toBe(event.accessCodeHash);
    expect(events.updateEvent(event.id, { accessCode: null })!.accessCodeHash).toBeNull();
  });

  it("rotates the slug so the old QR code stops resolving", async () => {
    const { events } = await mods();
    const event = events.createEvent({ name: "Party" });
    const rotated = events.rotateSlug(event.id)!;
    expect(rotated.slug).not.toBe(event.slug);
    expect(events.getEventBySlug(event.slug)).toBeUndefined();
    expect(events.getEventBySlug(rotated.slug)?.id).toBe(event.id);
  });

  it("deletes the event, its photos and its files", async () => {
    const { events, photos, storage, ids } = await mods();
    const event = events.createEvent({ name: "Party" });
    const id = ids.newId();
    await storage.writePhotoFiles(event.id, id, { original: Buffer.from("a"), display: Buffer.from("b"), thumb: Buffer.from("c") });
    photos.insertPhoto({ id, eventId: event.id, guestId: "g1", guestName: null, width: 1, height: 1, bytes: 1, status: "visible" });
    expect(await events.deleteEvent(event.id)).toBe(true);
    expect(photos.getPhoto(id)).toBeUndefined();
    expect(fs.existsSync(path.join(env.dir, "uploads", event.id))).toBe(false);
  });

  it("parses the stored QR style and falls back to the default", async () => {
    const { events } = await mods();
    const event = events.createEvent({ name: "Party" });
    expect(events.toAdminEvent(event).qrStyle.modules).toBe("square");
    const updated = events.updateEvent(event.id, { qrStyle: JSON.stringify({ modules: "dots" }) })!;
    expect(events.eventQrStyle(updated).modules).toBe("dots");
  });
});

describe("photos", () => {
  async function seed() {
    const { events, photos, ids } = await mods();
    const event = events.createEvent({ name: "Party" });
    const add = (guestId: string, status: "visible" | "pending" | "hidden") =>
      photos.insertPhoto({ id: ids.newId(), eventId: event.id, guestId, guestName: guestId, width: 10, height: 10, bytes: 100, status });
    return { event, add, photos };
  }

  it("lists only the guest's own photos, never the hidden ones", async () => {
    const { event, add, photos } = await seed();
    add("alice", "visible");
    add("alice", "pending");
    add("alice", "hidden");
    add("bob", "visible");
    const rows = photos.listPhotos(event, guest("alice", event.id));
    expect(rows).toHaveLength(2);
    expect(rows.every((p) => p.guestId === "alice" && p.status !== "hidden")).toBe(true);
    expect(photos.listPhotos(event, { isAdmin: false, unlocked: [event.id] })).toEqual([]);
  });

  it("lists everything for the admin, filterable by status", async () => {
    const { event, add, photos } = await seed();
    add("alice", "visible");
    add("bob", "pending");
    add("bob", "hidden");
    expect(photos.listPhotos(event, ADMIN)).toHaveLength(3);
    expect(photos.listPhotos(event, ADMIN, { status: "pending" })).toHaveLength(1);
  });

  it("paginates newest first with a cursor", async () => {
    const { event, photos } = await seed();
    const { ids } = await mods();
    for (let i = 0; i < 5; i++) {
      photos.insertPhoto({ id: ids.newId(), eventId: event.id, guestId: "g", guestName: null, width: 1, height: 1, bytes: 1, status: "visible" });
      await new Promise((r) => setTimeout(r, 3));
    }
    const first = photos.listPhotos(event, ADMIN, { limit: 2 });
    const next = photos.listPhotos(event, ADMIN, { limit: 2, before: first[1].createdAt });
    expect(first[0].createdAt).toBeGreaterThanOrEqual(first[1].createdAt);
    expect(next.map((p) => p.id)).not.toContain(first[0].id);
  });

  it("counts a guest's photos for the quota, hidden ones excluded", async () => {
    const { event, add, photos } = await seed();
    add("alice", "visible");
    add("alice", "pending");
    add("alice", "hidden");
    expect(photos.countGuestPhotos(event.id, "alice")).toBe(2);
  });

  it("only moderates photos of the given event", async () => {
    const { event, add, photos } = await seed();
    const mine = add("alice", "pending");
    const other = (await mods()).events.createEvent({ name: "Other" });
    expect(photos.setPhotoStatus([mine.id], other.id, "visible")).toBe(0);
    expect(photos.setPhotoStatus([mine.id], event.id, "visible")).toBe(1);
    expect(photos.getPhoto(mine.id)?.status).toBe("visible");
  });

  it("counts downloads", async () => {
    const { add, photos } = await seed();
    const p = add("alice", "visible");
    photos.incrementDownloads([p.id]);
    photos.incrementDownloads([p.id]);
    expect(photos.getPhoto(p.id)?.downloads).toBe(2);
  });

  it("never exposes the guest id to the client", async () => {
    const { add, photos } = await seed();
    const dto = photos.toPhotoDto(add("alice", "visible"), guest("alice", "x"));
    expect(dto).not.toHaveProperty("guestId");
    expect(dto.mine).toBe(true);
    expect(dto).not.toHaveProperty("downloads");
  });
});

describe("stats", () => {
  it("aggregates photos, guests, storage and activity", async () => {
    const { events, photos, stats, activity, ids } = await mods();
    const event = events.createEvent({ name: "Party" });
    for (const g of ["a", "a", "b"]) {
      photos.insertPhoto({ id: ids.newId(), eventId: event.id, guestId: g, guestName: g.toUpperCase(), width: 1, height: 1, bytes: 1000, status: "visible" });
      activity.track("upload", event.id, g);
    }
    activity.track("view", event.id, "a");
    activity.track("download", event.id, "a");
    activity.track("zip", event.id);
    const s = stats.getStats(event.id);
    expect(s.totals).toMatchObject({ photos: 3, guests: 2, bytes: 3000, views: 1, downloads: 1, zips: 1 });
    expect(s.topGuests[0]).toEqual({ name: "A", photos: 2 });
    expect(s.series.reduce((n, p) => n + p.uploads, 0)).toBe(3);
  });
});

describe("storage", () => {
  it("refuses ids that could escape the uploads folder", async () => {
    const { storage } = await mods();
    expect(() => storage.photoPath("../../etc", "00000000-0000-0000-0000-000000000000", "original")).toThrow();
    expect(() => storage.photoPath("00000000-0000-0000-0000-000000000000", "../passwd", "thumb")).toThrow();
    expect(() => storage.logoPath("..")).toThrow();
  });
});
