import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const now = sql`(unixepoch() * 1000)`;

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  /** Public identifier in the QR URL. Random suffix so slugs can't be guessed from the event name. */
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  eventDate: text("event_date"),
  accentColor: text("accent_color").notNull().default("#f59e0b"),
  /** bcrypt hash; null means the QR code alone grants access. */
  accessCodeHash: text("access_code_hash"),
  uploadsOpen: integer("uploads_open", { mode: "boolean" }).notNull().default(true),
  /** Epoch ms after which uploads close automatically; null = never. */
  uploadsCloseAt: integer("uploads_close_at"),
  galleryVisibility: text("gallery_visibility", { enum: ["private", "guests"] })
    .notNull()
    .default("private"),
  guestDownload: integer("guest_download", { mode: "boolean" }).notNull().default(false),
  moderation: text("moderation", { enum: ["post", "pre"] }).notNull().default("post"),
  captureMode: text("capture_mode", { enum: ["camera", "picker", "both"] }).notNull().default("camera"),
  askGuestName: integer("ask_guest_name", { mode: "boolean" }).notNull().default(true),
  maxPhotosPerGuest: integer("max_photos_per_guest").notNull().default(0),
  createdAt: integer("created_at").notNull().default(now),
});

export const photos = sqliteTable(
  "photos",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    guestId: text("guest_id").notNull(),
    guestName: text("guest_name"),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    bytes: integer("bytes").notNull(),
    status: text("status", { enum: ["visible", "pending", "hidden"] }).notNull(),
    downloads: integer("downloads").notNull().default(0),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("photos_event_idx").on(t.eventId, t.createdAt), index("photos_guest_idx").on(t.eventId, t.guestId)],
);

/** Append-only log behind every stat in the dashboard. */
export const activity = sqliteTable(
  "activity",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventId: text("event_id").references(() => events.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: ["view", "unlock", "unlock_failed", "upload", "download", "zip", "login", "login_failed"],
    }).notNull(),
    guestId: text("guest_id"),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("activity_event_idx").on(t.eventId, t.type, t.createdAt)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type EventRow = typeof events.$inferSelect;
export type PhotoRow = typeof photos.$inferSelect;
export type ActivityType = (typeof activity.$inferInsert)["type"];
