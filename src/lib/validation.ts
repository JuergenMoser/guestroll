import { CAPTURE_MODES, LOCALES, type CaptureMode, type Locale } from "@/lib/constants";
import { parseQrStyle } from "@/lib/qr/style";

/** Admin-editable event fields, already validated and normalised. */
export interface EventInput {
  name: string;
  description: string;
  eventDate: string | null;
  accentColor: string;
  /** `undefined` = leave unchanged, `null` = remove, string = new code. */
  accessCode?: string | null;
  uploadsOpen: boolean;
  uploadsCloseAt: number | null;
  moderation: "post" | "pre";
  captureMode: CaptureMode;
  askGuestName: boolean;
  maxPhotosPerGuest: number;
  defaultLocale: Locale | null;
  collectGuestEmails: boolean;
  notifyAdminSummary: boolean;
  emailGuestsGallery: boolean;
  galleryLinkDays: number;
  galleryLinkDownload: boolean;
  galleryMailIncludesPassword: boolean;
  galleryLinkFavorites: boolean;
  /** Already normalised by `parseQrStyle` and serialised. */
  qrStyle: string;
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const COLOR = /^#[0-9a-f]{6}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates a create (`partial = false`) or a patch (`partial = true`): in a
 * patch, absent keys are simply not returned, so the update leaves them alone.
 */
export function parseEventInput(body: unknown, partial: boolean): ValidationResult<Partial<EventInput>> {
  if (typeof body !== "object" || body === null) return { ok: false, errors: { body: "Expected a JSON object" } };
  const src = body as Record<string, unknown>;
  const out: Partial<EventInput> = {};
  const errors: Record<string, string> = {};
  const has = (key: string) => src[key] !== undefined;

  if (has("name") || !partial) {
    const name = typeof src.name === "string" ? src.name.trim() : "";
    if (name.length < 2 || name.length > 80) errors.name = "Between 2 and 80 characters";
    else out.name = name;
  }

  if (has("description")) {
    if (typeof src.description !== "string" || src.description.length > 500) errors.description = "At most 500 characters";
    else out.description = src.description.trim();
  } else if (!partial) out.description = "";

  if (has("eventDate")) {
    if (src.eventDate === null || src.eventDate === "") out.eventDate = null;
    else if (typeof src.eventDate === "string" && DATE.test(src.eventDate)) out.eventDate = src.eventDate;
    else errors.eventDate = "Expected YYYY-MM-DD";
  }

  if (has("accentColor")) {
    if (typeof src.accentColor === "string" && COLOR.test(src.accentColor)) out.accentColor = src.accentColor.toLowerCase();
    else errors.accentColor = "Expected a #rrggbb color";
  }

  if (has("accessCode")) {
    if (src.accessCode === null || src.accessCode === "") out.accessCode = null;
    else if (typeof src.accessCode === "string" && src.accessCode.trim().length >= 6 && src.accessCode.length <= 64) {
      out.accessCode = src.accessCode.trim();
    } else errors.accessCode = "Between 6 and 64 characters";
  }

  if (has("uploadsCloseAt")) {
    if (src.uploadsCloseAt === null || src.uploadsCloseAt === "") out.uploadsCloseAt = null;
    else if (typeof src.uploadsCloseAt === "number" && Number.isFinite(src.uploadsCloseAt)) out.uploadsCloseAt = src.uploadsCloseAt;
    else errors.uploadsCloseAt = "Expected a timestamp in milliseconds";
  }

  for (const key of [
    "uploadsOpen",
    "askGuestName",
    "collectGuestEmails",
    "notifyAdminSummary",
    "emailGuestsGallery",
    "galleryLinkDownload",
    "galleryMailIncludesPassword",
    "galleryLinkFavorites",
  ] as const) {
    if (!has(key)) continue;
    if (typeof src[key] === "boolean") out[key] = src[key] as boolean;
    else errors[key] = "Expected a boolean";
  }

  const enums = {
    moderation: ["post", "pre"],
    captureMode: CAPTURE_MODES,
  } as const;
  for (const [key, allowed] of Object.entries(enums) as [keyof typeof enums, readonly string[]][]) {
    if (!has(key)) continue;
    if (typeof src[key] === "string" && allowed.includes(src[key] as string)) {
      (out as Record<string, unknown>)[key] = src[key];
    } else errors[key] = `Expected one of ${allowed.join(", ")}`;
  }

  if (has("maxPhotosPerGuest")) {
    const n = src.maxPhotosPerGuest;
    if (typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 10_000) out.maxPhotosPerGuest = n;
    else errors.maxPhotosPerGuest = "Expected an integer between 0 and 10000";
  }

  if (has("galleryLinkDays")) {
    const n = src.galleryLinkDays;
    // 0 = the link never expires.
    if (typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 3650) out.galleryLinkDays = n;
    else errors.galleryLinkDays = "Expected an integer between 0 and 3650";
  }

  if (has("defaultLocale")) {
    if (src.defaultLocale === null || src.defaultLocale === "") out.defaultLocale = null;
    else if ((LOCALES as readonly unknown[]).includes(src.defaultLocale)) out.defaultLocale = src.defaultLocale as Locale;
    else errors.defaultLocale = `Expected one of ${LOCALES.join(", ")} or null`;
  }

  if (has("qrStyle")) {
    if (typeof src.qrStyle === "object" && src.qrStyle !== null) out.qrStyle = JSON.stringify(parseQrStyle(src.qrStyle));
    else errors.qrStyle = "Expected an object";
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: out };
}

export interface ShareLinkInput {
  /** Empty: a password is generated and returned once. */
  password: string | null;
  label: string;
  allowDownload: boolean;
  favoritesOnly: boolean;
  /** 0 = never expires. */
  expiresInDays: number;
}

export function parseShareLinkInput(body: unknown): ValidationResult<ShareLinkInput> {
  const src = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  let password: string | null = null;
  if (typeof src.password === "string" && src.password.length > 0) {
    if (src.password.length < 8 || src.password.length > 128) errors.password = "Between 8 and 128 characters";
    else password = src.password;
  }
  const label = typeof src.label === "string" ? src.label.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 80) : "";
  const allowDownload = typeof src.allowDownload === "boolean" ? src.allowDownload : true;
  const favoritesOnly = src.favoritesOnly === true;
  const days = src.expiresInDays === undefined ? 30 : src.expiresInDays;
  if (typeof days !== "number" || !Number.isInteger(days) || days < 0 || days > 3650) errors.expiresInDays = "Expected an integer between 0 and 3650";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { password, label, allowDownload, favoritesOnly, expiresInDays: days as number } };
}

export function parseGuestName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  // Strip control characters: the name ends up in ZIP entry names and the admin UI.
  const name = value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 40);
  return name || null;
}

export interface AccountFields {
  username?: string;
  name?: string;
  email?: string | null;
  role?: "owner" | "organizer";
  eventIds?: string[];
  password?: string | null;
}

/**
 * Account form. `password` is optional on creation (null = generate one, shown
 * once) and on update (absent = unchanged).
 */
export function parseAccountInput(input: unknown, partial: boolean): ValidationResult<AccountFields> {
  const body = (input ?? {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const value: AccountFields = {};

  if (body.username !== undefined || !partial) {
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    if (!/^[a-z0-9][a-z0-9._-]{1,31}$/.test(username)) errors.username = "invalid";
    else value.username = username;
  }
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length > 80) errors.name = "too_long";
    else value.name = body.name.trim();
  }
  if (body.email !== undefined) {
    if (body.email === null || body.email === "") value.email = null;
    else if (typeof body.email !== "string" || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(body.email.trim()) || body.email.length > 254) errors.email = "invalid";
    else value.email = body.email.trim().toLowerCase();
  }
  if (body.role !== undefined || !partial) {
    if (body.role !== "owner" && body.role !== "organizer") errors.role = "invalid";
    else value.role = body.role;
  }
  if (body.eventIds !== undefined) {
    if (!Array.isArray(body.eventIds) || body.eventIds.length > 500 || !body.eventIds.every((id) => typeof id === "string" && /^[0-9a-f-]{36}$/.test(id))) {
      errors.eventIds = "invalid";
    } else value.eventIds = body.eventIds as string[];
  }
  if (body.password !== undefined && body.password !== null && body.password !== "") {
    if (typeof body.password !== "string" || body.password.length < 10 || body.password.length > 200) errors.password = "min_length";
    else value.password = body.password;
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}
