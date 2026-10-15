import path from "node:path";

/**
 * Every runtime setting is read here and nowhere else, so the full list of
 * knobs lives in one file (mirrored in `.env.example` and `docs/configuration.md`).
 */

function int(name: string, fallback: number, min = 0): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < min) {
    throw new Error(`${name} must be an integer >= ${min} (got "${raw}")`);
  }
  return value;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return ["1", "true", "yes", "on"].includes(raw);
}

function oneOf<T extends string>(name: string, allowed: readonly T[], fallback: T): T {
  const raw = process.env[name]?.trim() as T | undefined;
  if (!raw) return fallback;
  if (!allowed.includes(raw)) {
    throw new Error(`${name} must be one of ${allowed.join(", ")} (got "${raw}")`);
  }
  return raw;
}

import { CAPTURE_MODES, LOCALES } from "./constants";

export { CAPTURE_MODES, LOCALES, type CaptureMode, type Locale } from "./constants";

// The data folder is runtime state, not code: keep the build tracer out of it.
const dataDir = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR || "./data");

export const config = {
  appName: process.env.APP_NAME?.trim() || "Guestroll",
  /** Public origin, used for QR codes. Falls back to the request host when unset. */
  publicUrl: process.env.PUBLIC_URL?.replace(/\/+$/, "") || "",
  locale: oneOf("DEFAULT_LOCALE", LOCALES, "en"),
  /** false = ignore the browser's language and use DEFAULT_LOCALE (unless the album or the visitor chose). */
  detectBrowserLocale: bool("DETECT_BROWSER_LOCALE", true),

  dataDir,
  dbFile: path.join(/*turbopackIgnore: true*/ dataDir, "guestroll.db"),
  uploadsDir: path.join(/*turbopackIgnore: true*/ dataDir, "uploads"),
  secretFile: path.join(/*turbopackIgnore: true*/ dataDir, ".session-secret"),

  /** The owner account created on first start, whose password ADMIN_PASSWORD controls. */
  adminUsername: (process.env.ADMIN_USERNAME?.trim() || "admin").toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || "",
  sessionSecret: process.env.SESSION_SECRET || "",
  /** Only trust X-Forwarded-For when a reverse proxy we control sets it. */
  trustProxy: bool("TRUST_PROXY", false),
  secureCookies: bool("SECURE_COOKIES", process.env.NODE_ENV === "production"),

  maxUploadBytes: int("MAX_UPLOAD_MB", 25, 1) * 1024 * 1024,
  maxImagePixels: int("MAX_IMAGE_MEGAPIXELS", 80, 1) * 1_000_000,
  defaultCaptureMode: oneOf("DEFAULT_CAPTURE_MODE", CAPTURE_MODES, "camera"),

  /**
   * SMTP from the environment. When SMTP_HOST is set, these win over anything
   * saved in Admin → Settings (see lib/mail/settings.ts).
   */
  smtp: {
    host: process.env.SMTP_HOST?.trim() || "",
    port: int("SMTP_PORT", 587, 1),
    secure: bool("SMTP_SECURE", false),
    user: process.env.SMTP_USER || "",
    password: process.env.SMTP_PASSWORD || "",
    from: process.env.SMTP_FROM?.trim() || "",
  },
  /**
   * Webhooks may target the local network (a self-hosted ntfy, Home Assistant).
   * Off by default: an owner's webhook could otherwise probe the server's own network.
   */
  webhookAllowPrivate: bool("WEBHOOK_ALLOW_PRIVATE", false),
  /** Same, for the cloud export: a Nextcloud at home is a common case. */
  cloudAllowPrivate: bool("CLOUD_ALLOW_PRIVATE", false),

  /** Lets a relay without TLS receive the SMTP login (same machine or trusted network only). */
  smtpAllowPlain: bool("SMTP_ALLOW_PLAIN", false),

  /** Bearer token of `/api/metrics` (Prometheus); the endpoint answers 404 without one. */
  metricsToken: process.env.METRICS_TOKEN || "",

  /**
   * Single sign-on (OpenID Connect): Authentik, Authelia, Keycloak, Google…
   * On when issuer, client id and secret are all set.
   */
  oidc: {
    issuer: process.env.OIDC_ISSUER?.trim().replace(/\/+$/, "") || "",
    clientId: process.env.OIDC_CLIENT_ID?.trim() || "",
    clientSecret: process.env.OIDC_CLIENT_SECRET || "",
    /** What the sign-in button says: "Sign in with {name}". */
    name: process.env.OIDC_NAME?.trim() || "SSO",
    /** Unknown people get an organizer account without events instead of a refusal. */
    autoCreate: bool("OIDC_AUTO_CREATE", false),
    /**
     * A first sign-in may link an organizer account by its email. Off by default:
     * many providers let people set their own email and still call it verified.
     */
    linkByEmail: bool("OIDC_LINK_BY_EMAIL", false),
  },

  /** Recipient of admin alerts and summaries; Admin → Settings when unset. */
  adminEmail: process.env.ADMIN_EMAIL?.trim() || "",

  /** How often time-based work runs (event endings, alerts, the mail queue). 0 disables it. */
  schedulerIntervalMs: int("SCHEDULER_INTERVAL_SECONDS", 60, 0) * 1000,

  /**
   * Where photos, logos and voice messages live. `local` is a folder under
   * DATA_DIR; `s3` is any S3-compatible bucket (AWS, MinIO, Backblaze B2,
   * Cloudflare R2…). The database always stays in DATA_DIR.
   */
  storage: {
    driver: oneOf("STORAGE_DRIVER", ["local", "s3"] as const, "local"),
    s3: {
      endpoint: process.env.S3_ENDPOINT?.replace(/\/+$/, "") || "",
      region: process.env.S3_REGION?.trim() || "us-east-1",
      bucket: process.env.S3_BUCKET?.trim() || "",
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
      /** Folder inside the bucket, so one bucket can hold several instances. */
      prefix: (process.env.S3_PREFIX?.trim() || "").replace(/^\/+|\/+$/g, ""),
      /** `bucket.host/key` (virtual-hosted) needs DNS per bucket: MinIO and most self-hosted servers want path style. */
      forcePathStyle: bool("S3_FORCE_PATH_STYLE", true),
    },
  },

  /**
   * Scheduled backups. BACKUP_CRON (e.g. `0 3 * * *`) turns them on from the
   * environment; otherwise owners set them in the admin. The destination is a
   * folder, or an S3 bucket when BACKUP_S3_BUCKET is set: never the bucket
   * holding the photos themselves.
   */
  backup: {
    cron: process.env.BACKUP_CRON?.trim() || "",
    keep: int("BACKUP_KEEP", 7, 1),
    dir: path.resolve(/*turbopackIgnore: true*/ process.env.BACKUP_DIR || path.join(dataDir, "backups")),
    s3: {
      endpoint: process.env.BACKUP_S3_ENDPOINT?.replace(/\/+$/, "") || "",
      region: process.env.BACKUP_S3_REGION?.trim() || "us-east-1",
      bucket: process.env.BACKUP_S3_BUCKET?.trim() || "",
      accessKeyId: process.env.BACKUP_S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.BACKUP_S3_SECRET_ACCESS_KEY || "",
      prefix: (process.env.BACKUP_S3_PREFIX?.trim() || "").replace(/^\/+|\/+$/g, ""),
      forcePathStyle: bool("BACKUP_S3_FORCE_PATH_STYLE", true),
    },
  },
  /**
   * A public demo: seeded content, a shared `demo` account, a nightly reset,
   * and everything that leaves the instance (email, webhooks, updates,
   * backups) switched off.
   */
  demo: {
    enabled: bool("DEMO_MODE", false),
    resetCron: process.env.DEMO_RESET_CRON?.trim() || "0 4 * * *",
  },
  /** Ask GitHub every 12 hours whether a newer release exists. */
  updateCheck: bool("UPDATE_CHECK", true) && !bool("DEMO_MODE", false),
  /** The optional updater container (docker-compose profile `updater`): where it listens, and the token they share. */
  updater: {
    url: process.env.UPDATER_URL?.replace(/\/+$/, "") || "",
    token: process.env.UPDATER_TOKEN || "",
  },
  /** Time zone of scheduled backups (and of stats): the container's TZ. */
  timeZone: process.env.TZ?.trim() || "UTC",

  rateLimit: {
    uploadsPerMinute: int("RATE_LIMIT_UPLOADS_PER_MINUTE", 30, 1),
    loginPerMinute: int("RATE_LIMIT_LOGIN_PER_MINUTE", 5, 1),
    unlockPerMinute: int("RATE_LIMIT_UNLOCK_PER_MINUTE", 10, 1),
  },
} as const;
