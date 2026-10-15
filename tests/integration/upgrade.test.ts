import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, describe, expect, it } from "vitest";
import { freshEnv } from "../helpers/env";

/**
 * An instance installed with an older release, holding real data, opened by
 * today's code: what `docker pull` does to someone's wedding album. Each
 * release's database is rebuilt from the migrations it shipped (releases never
 * change their migrations), then filled the way that version wrote it.
 */
const SHIPPED_MIGRATIONS = { "0.1.0": 1, "0.2.0": 2, "0.3.0": 9 } as const;
type Release = keyof typeof SHIPPED_MIGRATIONS;

const root = path.resolve(__dirname, "../..");
const ids = { event: "11111111-1111-4111-8111-111111111111", closed: "22222222-2222-4222-8222-222222222222", photo: "33333333-3333-4333-8333-333333333333" };

let env: Awaited<ReturnType<typeof freshEnv>> | undefined;
afterEach(() => env?.cleanup());

/** The database and files of an instance running `release`, in `dir`. */
function oldInstance(dir: string, release: Release): Database.Database {
  const folder = path.join(dir, "migrations");
  fs.mkdirSync(path.join(folder, "meta"), { recursive: true });
  const journal = JSON.parse(fs.readFileSync(path.join(root, "drizzle/meta/_journal.json"), "utf8"));
  journal.entries = journal.entries.slice(0, SHIPPED_MIGRATIONS[release]);
  fs.writeFileSync(path.join(folder, "meta/_journal.json"), JSON.stringify(journal));
  for (const entry of journal.entries) fs.copyFileSync(path.join(root, "drizzle", `${entry.tag}.sql`), path.join(folder, `${entry.tag}.sql`));

  const sqlite = new Database(path.join(dir, "guestroll.db"));
  migrate(drizzle(sqlite), { migrationsFolder: folder });
  const day = 86_400_000;
  const now = Date.now();

  if (release === "0.3.0") {
    sqlite
      .prepare("insert into accounts (id, username, name, password_hash, role) values (?, 'admin', 'Léa', ?, 'owner')")
      .run("44444444-4444-4444-8444-444444444444", bcrypt.hashSync("old-password", 4));
  } else {
    // Before accounts: one password in settings.
    sqlite.prepare("insert into settings (key, value) values ('admin_password_hash', ?), ('admin_password_version', '3')").run(bcrypt.hashSync("old-password", 4));
  }
  sqlite
    .prepare(
      `insert into events (id, slug, name, description, accent_color, access_code_hash, moderation, max_photos_per_guest, default_locale, qr_style, logo_version, uploads_close_at)
       values (?, 'wedding-ab12cd34', 'Julie & Thomas', 'Welcome!', '#336699', ?, 'pre', 20, 'fr', '{"preset":"soft"}', 1700000000000, null)`,
    )
    .run(ids.event, bcrypt.hashSync("secret-code", 4));
  // An event whose uploads closed before the upgrade.
  sqlite.prepare("insert into events (id, slug, name, uploads_close_at) values (?, 'past-party-ef56gh78', 'Past party', ?)").run(ids.closed, now - 10 * day);
  // From 0.2.0 on, the scheduler marked it ended when it closed; 0.1.0 had no such column,
  // and the migration that adds it must mark it so no end-of-event email goes out late.
  if (release !== "0.1.0") sqlite.prepare("update events set ended_at = ? where id = ?").run(now - 10 * day, ids.closed);
  const insertPhoto = sqlite.prepare("insert into photos (id, event_id, guest_id, guest_name, width, height, bytes, status, downloads) values (?, ?, ?, ?, 4000, 3000, 3, ?, ?)");
  insertPhoto.run(ids.photo, ids.event, "guest-a", "Camille", "visible", 2);
  insertPhoto.run("55555555-5555-4555-8555-555555555555", ids.event, "guest-b", null, "pending", 0);
  insertPhoto.run("66666666-6666-4666-8666-666666666666", ids.event, "guest-b", null, "hidden", 0);
  sqlite.prepare("insert into activity (event_id, type, guest_id) values (?, 'upload', 'guest-a'), (?, 'view', 'guest-a')").run(ids.event, ids.event);
  if (release !== "0.1.0") {
    sqlite
      .prepare("insert into share_links (id, event_id, token, password_hash, label) values ('77777777-7777-4777-8777-777777777777', ?, ?, ?, 'Family')")
      .run(ids.event, "a".repeat(32), bcrypt.hashSync("link-password", 4));
    sqlite.prepare("insert into guest_contacts (id, event_id, guest_id, email, locale) values ('88888888-8888-4888-8888-888888888888', ?, 'guest-a', 'camille@x.test', 'fr')").run(ids.event);
  }

  const uploads = path.join(dir, "uploads", ids.event);
  fs.mkdirSync(uploads, { recursive: true });
  for (const variant of ["original.jpg", "display.webp", "thumb.webp"]) fs.writeFileSync(path.join(uploads, `${ids.photo}.${variant}`), "img");
  fs.writeFileSync(path.join(uploads, "logo.png"), "png");
  return sqlite;
}

describe.each(Object.keys(SHIPPED_MIGRATIONS) as Release[])("upgrading from %s", (release) => {
  it("keeps every event, photo, file and setting, and the admin still signs in", async () => {
    env = await freshEnv({ ADMIN_PASSWORD: "", SESSION_SECRET: "" });
    oldInstance(env.dir, release).close();

    const { getDb } = await import("@/lib/db/client");
    const { bootstrapAdmin, verifyLogin } = await import("@/lib/auth/admin");
    const events = await import("@/lib/events");
    const photos = await import("@/lib/photos");
    const { openPhotoStream, readLogo } = await import("@/lib/storage/files");

    const applied = getDb().$client.prepare("select count(*) as n from __drizzle_migrations").get() as { n: number };
    const shipped = JSON.parse(fs.readFileSync(path.join(root, "drizzle/meta/_journal.json"), "utf8")).entries.length;
    expect(applied.n).toBe(shipped);

    bootstrapAdmin();
    expect(await verifyLogin("admin", "old-password")).toMatchObject({ role: "owner" });

    const event = events.getEventById(ids.event)!;
    expect(event).toMatchObject({ name: "Julie & Thomas", description: "Welcome!", accentColor: "#336699", moderation: "pre", maxPhotosPerGuest: 20, defaultLocale: "fr", logoVersion: 1700000000000 });
    expect(await events.checkAccessCode(event, "secret-code")).toBe(true);
    // Features added later start switched off, never changing what guests see.
    expect(event).toMatchObject({ guestbookEnabled: false, captureFilters: false, frame: "none", challenges: "[]", collectGuestEmails: false });
    expect(events.toAdminEvent(event).qrStyle).toBeTruthy();

    const rows = photos.listPhotos(event, "album");
    expect(rows.map((p) => p.status).sort()).toEqual(["hidden", "pending", "visible"]);
    expect(rows.find((p) => p.id === ids.photo)).toMatchObject({ guestName: "Camille", downloads: 2, favorite: false, challengeId: null });
    expect((await openPhotoStream(ids.event, ids.photo, "original"))?.size).toBe(3);
    expect((await readLogo(ids.event))?.toString()).toBe("png");

    // A party that closed before the upgrade must not send end-of-event emails now.
    expect(events.getEventById(ids.closed)!.endedAt).not.toBeNull();
    const { eventsToEnd } = await import("@/lib/mail/automation");
    expect(eventsToEnd().map((e) => e.id)).not.toContain(ids.closed);

    if (release !== "0.1.0") {
      const shares = await import("@/lib/shares");
      const link = shares.getShareByToken("a".repeat(32))!;
      expect(await shares.checkSharePassword(link, "link-password")).toBe(true);
      expect(link.favoritesOnly).toBe(false);
    }
  });
});

it("knows every migration shipped so far", () => {
  // A release that adds migrations must be added to SHIPPED_MIGRATIONS with its count.
  const shipped = JSON.parse(fs.readFileSync(path.join(root, "drizzle/meta/_journal.json"), "utf8")).entries.length;
  expect(shipped).toBeGreaterThanOrEqual(Math.max(...Object.values(SHIPPED_MIGRATIONS)));
});
