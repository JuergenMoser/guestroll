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

  adminPassword: process.env.ADMIN_PASSWORD || "",
  sessionSecret: process.env.SESSION_SECRET || "",
  /** Only trust X-Forwarded-For when a reverse proxy we control sets it. */
  trustProxy: bool("TRUST_PROXY", false),
  secureCookies: bool("SECURE_COOKIES", process.env.NODE_ENV === "production"),

  maxUploadBytes: int("MAX_UPLOAD_MB", 25, 1) * 1024 * 1024,
  maxImagePixels: int("MAX_IMAGE_MEGAPIXELS", 80, 1) * 1_000_000,
  defaultCaptureMode: oneOf("DEFAULT_CAPTURE_MODE", CAPTURE_MODES, "camera"),

  rateLimit: {
    uploadsPerMinute: int("RATE_LIMIT_UPLOADS_PER_MINUTE", 30, 1),
    loginPerMinute: int("RATE_LIMIT_LOGIN_PER_MINUTE", 5, 1),
    unlockPerMinute: int("RATE_LIMIT_UNLOCK_PER_MINUTE", 10, 1),
  },
} as const;
