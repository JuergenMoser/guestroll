import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";

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
  /** Guests may send short videos too (see MAX_VIDEO_SECONDS / MAX_VIDEO_MB). Off by default: they weigh 50 photos each. */
  allowVideos: integer("allow_videos", { mode: "boolean" }).notNull().default(false),
  /** Guests may pick a filter before shooting; applied in the browser, before the upload. */
  captureFilters: integer("capture_filters", { mode: "boolean" }).notNull().default(false),
  /** Drawn around every guest photo in the browser: `none`, `print` (instant-print border), `border` (event color), `stamp` (the logo in a corner). */
  frame: text("frame", { enum: ["none", "print", "border", "stamp"] }).notNull().default("none"),
  maxPhotosPerGuest: integer("max_photos_per_guest").notNull().default(0),
  /** Language guests see unless they pick one; null follows each guest's browser. */
  defaultLocale: text("default_locale", { enum: ["en", "fr", "it", "es", "de"] }),
  /** JSON, read through `parseQrStyle`: null means the default style. */
  qrStyle: text("qr_style"),
  /** JSON, read through `readWallStyle`: null means the default wall. */
  wallStyle: text("wall_style"),
  /** Epoch ms of the last logo upload, null without a logo. Doubles as a cache-buster in URLs. */
  logoVersion: integer("logo_version"),
  // ---- After the event: what runs once uploads close (see lib/mail/automation.ts) ----
  collectGuestEmails: integer("collect_guest_emails", { mode: "boolean" }).notNull().default(false),
  notifyAdminSummary: integer("notify_admin_summary", { mode: "boolean" }).notNull().default(true),
  emailGuestsGallery: integer("email_guests_gallery", { mode: "boolean" }).notNull().default(false),
  galleryLinkDays: integer("gallery_link_days").notNull().default(30),
  galleryLinkDownload: integer("gallery_link_download", { mode: "boolean" }).notNull().default(true),
  galleryMailIncludesPassword: integer("gallery_mail_includes_password", { mode: "boolean" }).notNull().default(true),
  galleryLinkFavorites: integer("gallery_link_favorites", { mode: "boolean" }).notNull().default(false),
  /** JSON `[{ id, label }]`, read through `readChallenges`: photo prompts guests can pick before shooting. */
  challenges: text("challenges").notNull().default("[]"),
  /** Guests can leave a written or voice message for the hosts. */
  guestbookEnabled: integer("guestbook_enabled", { mode: "boolean" }).notNull().default(false),
  guestbookVoice: integer("guestbook_voice", { mode: "boolean" }).notNull().default(true),
  /** Visible messages also appear behind gallery links (they're the guests' words: off by default). */
  guestbookInGallery: integer("guestbook_in_gallery", { mode: "boolean" }).notNull().default(false),
  /**
   * Whether guests see each other's visible photos: `off` (each guest only their
   * own, the default), `during` (as soon as they are visible), `after` (once the
   * event has ended). Never pending or hidden ones, never others' originals.
   */
  sharedAlbum: text("shared_album", { enum: ["off", "during", "after"] }).notNull().default("off"),
  /** Secret of the photo booth link (`/e/<slug>/booth?key=`); null when the booth is off. A new one revokes the old link. */
  boothKey: text("booth_key"),
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
    /**
     * Null for a photo. For a video, its container: the `original` file is then
     * the video itself (see `photoKey`), `display` and `thumb` its poster frame.
     */
    mediaType: text("media_type", { enum: ["video/mp4", "video/quicktime", "video/webm"] }),
    durationMs: integer("duration_ms"),
    status: text("status", { enum: ["visible", "pending", "hidden"] }).notNull(),
    downloads: integer("downloads").notNull().default(0),
    /** The hosts' pick: a "best of" ZIP, gallery links limited to it, the wall and slideshow. */
    favorite: integer("favorite", { mode: "boolean" }).notNull().default(false),
    /** One of the event's challenge ids, or null. Kept when the challenge is later removed: the photo still answered it. */
    challengeId: text("challenge_id"),
    /** Where the guest scanned from (a table's own QR code), null from the event's main code. */
    spotId: text("spot_id").references(() => spots.id, { onDelete: "set null" }),
    /** Variance of the Laplacian at 512 px (see lib/images/analysis.ts); null until analysed. */
    sharpness: integer("sharpness"),
    /** 64-bit difference hash, hex; null until analysed. */
    hash: text("hash"),
    /** The event's earliest photo this one repeats (a burst, the same shot twice); cleared when that one goes. */
    duplicateOf: text("duplicate_of").references((): AnySQLiteColumn => photos.id, { onDelete: "set null" }),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("photos_event_idx").on(t.eventId, t.createdAt), index("photos_guest_idx").on(t.eventId, t.guestId), index("photos_spot_idx").on(t.spotId)],
);

/**
 * A place of the event with its own QR code ("Table 5", "Dance floor"): photos
 * sent after scanning it are tagged with it. Deleting one keeps its photos.
 */
export const spots = sqliteTable(
  "spots",
  {
    /** Short and random: it goes in the QR code (`?at=`), and a short URL keeps the code easy to scan. */
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("spots_event_idx").on(t.eventId)],
);

/**
 * Guestbook: a few words and/or a voice note for the hosts. Moderated like
 * photos; the audio file sits next to the event's photos in storage.
 */
export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    guestId: text("guest_id").notNull(),
    guestName: text("guest_name"),
    text: text("text").notNull().default(""),
    /** Container of the voice note (`webm`, `ogg`, `m4a`, `mp3`), null without one. */
    audioExt: text("audio_ext"),
    audioBytes: integer("audio_bytes"),
    /** Measured by the recorder; informative only, the size cap is what bounds a note. */
    audioSeconds: integer("audio_seconds"),
    status: text("status", { enum: ["visible", "pending", "hidden"] }).notNull(),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("messages_event_idx").on(t.eventId, t.createdAt), index("messages_guest_idx").on(t.eventId, t.guestId)],
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
    /** Only the photos the hosts marked as favorites, instead of every visible one. */
    favoritesOnly: integer("favorites_only", { mode: "boolean" }).notNull().default(false),
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
    locale: text("locale", { enum: ["en", "fr", "it", "es", "de"] }).notNull(),
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

/**
 * People who sign in to the admin. Owners see and run everything; organizers
 * only the events assigned to them in `account_events`.
 */
export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  /** Lowercase, what people type to sign in. */
  username: text("username").notNull().unique(),
  name: text("name").notNull().default(""),
  /** Where this person's alerts and event summaries go (optional). */
  email: text("email"),
  passwordHash: text("password_hash").notNull(),
  /** `issuer|subject` of the single sign-on identity linked to this account; null without one. */
  oidcSubject: text("oidc_subject").unique(),
  role: text("role", { enum: ["owner", "organizer"] }).notNull(),
  /** Stored in the session cookie and bumped on password change: older cookies stop working. */
  sessionVersion: integer("session_version").notNull().default(1),
  lastLoginAt: integer("last_login_at"),
  /** Two-step verification: the TOTP secret, sealed. Null when off. */
  totpSecret: text("totp_secret"),
  /** A secret being set up, sealed, until a first code confirms it. */
  totpPending: text("totp_pending"),
  /** The last step a code was accepted for: a code can't be used twice. */
  totpLastStep: integer("totp_last_step"),
  /** JSON array of hashed single-use recovery codes. */
  recoveryCodes: text("recovery_codes"),
  createdAt: integer("created_at").notNull().default(now),
});

export const accountEvents = sqliteTable(
  "account_events",
  {
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.accountId, t.eventId] }), index("account_events_event_idx").on(t.eventId)],
);

/** Same queue as `outbox`, for webhooks: retried with backoff, deduplicated, kept for the admin to inspect. */
export const webhookDeliveries = sqliteTable(
  "webhook_deliveries",
  {
    id: text("id").primaryKey(),
    /** Id of the webhook in the `webhooks` setting; deliveries of a deleted webhook are dropped when processed. */
    webhookId: text("webhook_id").notNull(),
    kind: text("kind").notNull(),
    /** The notice as JSON; formatted for the webhook's type when sent, so a type change applies to retries. */
    payload: text("payload").notNull(),
    dedupeKey: text("dedupe_key").unique(),
    status: text("status", { enum: ["pending", "sent", "failed"] }).notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: integer("next_attempt_at").notNull().default(now),
    lastError: text("last_error"),
    createdAt: integer("created_at").notNull().default(now),
    sentAt: integer("sent_at"),
  },
  (t) => [index("webhook_deliveries_status_idx").on(t.status, t.nextAttemptAt)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/**
 * An owner's invitation to join the admin: a single-use link, emailed or copied.
 * Only the SHA-256 of its token is kept, so a copy of the database opens nothing.
 */
export const invitations = sqliteTable("invitations", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  email: text("email").notNull(),
  role: text("role", { enum: ["owner", "organizer"] }).notNull(),
  /** JSON array of event ids, for an organizer. */
  eventIds: text("event_ids").notNull().default("[]"),
  invitedBy: text("invited_by").references(() => accounts.id, { onDelete: "set null" }),
  expiresAt: integer("expires_at").notNull(),
  acceptedAt: integer("accepted_at"),
  createdAt: integer("created_at").notNull().default(now),
});

/** An album sent to the cloud (WebDAV): one row per run, with its progress. */
export const cloudExports = sqliteTable(
  "cloud_exports",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    scope: text("scope", { enum: ["visible", "favorites"] }).notNull(),
    status: text("status", { enum: ["pending", "running", "done", "failed"] }).notNull().default("pending"),
    done: integer("done").notNull().default(0),
    total: integer("total").notNull().default(0),
    error: text("error"),
    createdAt: integer("created_at").notNull().default(now),
    finishedAt: integer("finished_at"),
  },
  (t) => [index("cloud_exports_event_idx").on(t.eventId, t.createdAt)],
);

export type EventRow = typeof events.$inferSelect;
export type PhotoRow = typeof photos.$inferSelect;
export type SpotRow = typeof spots.$inferSelect;
export type ActivityType = (typeof activity.$inferInsert)["type"];
export type ShareLinkRow = typeof shareLinks.$inferSelect;
export type MessageRow = typeof messages.$inferSelect;
export type GuestContactRow = typeof guestContacts.$inferSelect;
export type OutboxRow = typeof outbox.$inferSelect;
export type WebhookDeliveryRow = typeof webhookDeliveries.$inferSelect;
export type AccountRow = typeof accounts.$inferSelect;
export type InvitationRow = typeof invitations.$inferSelect;
export type CloudExportRow = typeof cloudExports.$inferSelect;
export type AccountRole = AccountRow["role"];
