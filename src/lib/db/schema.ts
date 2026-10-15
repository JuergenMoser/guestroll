import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
  moderation: text("moderation", { enum: ["post", "pre"] }).notNull().default("post"),
  captureMode: text("capture_mode", { enum: ["camera", "picker", "both"] }).notNull().default("camera"),
  askGuestName: integer("ask_guest_name", { mode: "boolean" }).notNull().default(true),
  maxPhotosPerGuest: integer("max_photos_per_guest").notNull().default(0),
  /** Language guests see unless they pick one; null follows each guest's browser. */
  defaultLocale: text("default_locale", { enum: ["en", "fr", "it", "es"] }),
  /** JSON, read through `parseQrStyle`: null means the default style. */
  qrStyle: text("qr_style"),
  /** Epoch ms of the last logo upload, null without a logo. Doubles as a cache-buster in URLs. */
  logoVersion: integer("logo_version"),
  // ---- After the event: what runs once uploads close (see lib/mail/automation.ts) ----
  collectGuestEmails: integer("collect_guest_emails", { mode: "boolean" }).notNull().default(false),
  notifyAdminSummary: integer("notify_admin_summary", { mode: "boolean" }).notNull().default(true),
  emailGuestsGallery: integer("email_guests_gallery", { mode: "boolean" }).notNull().default(false),
  galleryLinkDays: integer("gallery_link_days").notNull().default(30),
  galleryLinkDownload: integer("gallery_link_download", { mode: "boolean" }).notNull().default(true),
  galleryMailIncludesPassword: integer("gallery_mail_includes_password", { mode: "boolean" }).notNull().default(true),
  /** Set once the end-of-event automation ran: it never runs twice for the same event. */
  endedAt: integer("ended_at"),
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

/** Read-only access to an event's visible photos, by link + password, made by the admin. */
export const shareLinks = sqliteTable(
  "share_links",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    /** 32 random characters in the URL: guessing one is out of reach. */
    token: text("token").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    label: text("label").notNull().default(""),
    allowDownload: integer("allow_download", { mode: "boolean" }).notNull().default(true),
    expiresAt: integer("expires_at"),
    revokedAt: integer("revoked_at"),
    views: integer("views").notNull().default(0),
    lastUsedAt: integer("last_used_at"),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("share_links_event_idx").on(t.eventId)],
);

/** A guest who asked to receive the album by email. Deleted with the event. */
export const guestContacts = sqliteTable(
  "guest_contacts",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    guestId: text("guest_id").notNull(),
    email: text("email").notNull(),
    locale: text("locale", { enum: ["en", "fr", "it", "es"] }).notNull(),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [uniqueIndex("guest_contacts_guest_idx").on(t.eventId, t.guestId)],
);

/**
 * Every email goes through this queue, so a mail server that's down loses
 * nothing: the scheduler retries with backoff. `dedupeKey` makes enqueueing
 * idempotent (the same alert or end-of-event mail is never queued twice).
 */
export const outbox = sqliteTable(
  "outbox",
  {
    id: text("id").primaryKey(),
    to: text("to").notNull(),
    subject: text("subject").notNull(),
    html: text("html").notNull(),
    text: text("text").notNull(),
    kind: text("kind").notNull(),
    eventId: text("event_id").references(() => events.id, { onDelete: "cascade" }),
    dedupeKey: text("dedupe_key").unique(),
    status: text("status", { enum: ["pending", "sent", "failed"] }).notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: integer("next_attempt_at").notNull().default(now),
    lastError: text("last_error"),
    createdAt: integer("created_at").notNull().default(now),
    sentAt: integer("sent_at"),
  },
  (t) => [index("outbox_status_idx").on(t.status, t.nextAttemptAt)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type EventRow = typeof events.$inferSelect;
export type PhotoRow = typeof photos.$inferSelect;
export type ActivityType = (typeof activity.$inferInsert)["type"];
export type ShareLinkRow = typeof shareLinks.$inferSelect;
export type GuestContactRow = typeof guestContacts.$inferSelect;
export type OutboxRow = typeof outbox.$inferSelect;
