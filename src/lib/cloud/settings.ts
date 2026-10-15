import "server-only";
import { open, seal } from "@/lib/crypto/secretBox";
import { deleteSetting, readSetting, writeSetting } from "@/lib/settings";

/** A WebDAV server: Nextcloud, ownCloud, Synology, kDrive and the like. */
export interface CloudSettings {
  /** The WebDAV root, e.g. `https://cloud.example.com/remote.php/dav/files/lea/`. */
  url: string;
  user: string;
  password: string;
  /** Folder under the root the albums go in, one subfolder per event. */
  folder: string;
  /** Send each event's album on its own when it ends. */
  autoExport: boolean;
}

const KEY = "cloud";

type Stored = Omit<CloudSettings, "password"> & { password?: string };

function stored(): Stored | null {
  const raw = readSetting(KEY);
  return raw ? (JSON.parse(raw) as Stored) : null;
}

export function getCloudSettings(): CloudSettings | null {
  const s = stored();
  if (!s?.url) return null;
  return { ...s, password: s.password ? (open(s.password) ?? "") : "" };
}

/** What the settings form may show: everything but the password. */
export function cloudSettingsForForm(): (Omit<CloudSettings, "password"> & { hasPassword: boolean }) | null {
  const s = stored();
  return s ? { url: s.url, user: s.user, folder: s.folder, autoExport: s.autoExport, hasPassword: Boolean(s.password) } : null;
}

/**
 * Like the SMTP password: kept when the form sends none, but only for the same
 * server and account, so an owner can't send the saved one to a server of theirs.
 */
export function cloudNeedsPassword(input: Pick<CloudSettings, "url" | "user" | "password">): boolean {
  const s = stored();
  if (input.password || !s?.password) return false;
  return s.url !== input.url || s.user !== input.user;
}

export function saveCloudSettings(input: CloudSettings): void {
  const previous = stored();
  const password = input.password ? seal(input.password) : cloudNeedsPassword(input) ? undefined : previous?.password;
  writeSetting(KEY, JSON.stringify({ url: input.url, user: input.user, folder: input.folder, autoExport: input.autoExport, password }));
}

export function clearCloudSettings(): void {
  deleteSetting(KEY);
}

/** `https://…/` with a trailing slash, or null: only http(s), no credentials in the URL. */
export function parseWebdavUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 500) return null;
  try {
    const url = new URL(value.trim());
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) return null;
    return url.href.endsWith("/") ? url.href : `${url.href}/`;
  } catch {
    return null;
  }
}

/** Path segments under the root: no `..`, no empty segments, nothing but a plain folder name each. */
export function parseFolder(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const parts = value.split("/").map((p) => p.trim()).filter(Boolean);
  if (parts.length > 5 || parts.some((p) => p === "." || p === ".." || p.length > 80 || /[\u0000-\u001f\\]/.test(p))) return null;
  return parts.join("/");
}

/** The settings form, checked; the password may be empty (kept, see `cloudNeedsPassword`). */
export function parseCloudBody(input: unknown) {
  const body = (input ?? {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const url = parseWebdavUrl(body.url);
  const folder = parseFolder(body.folder ?? "");
  const user = typeof body.user === "string" ? body.user.trim().slice(0, 200) : "";
  if (!url) errors.url = "invalid";
  if (folder === null) errors.folder = "invalid";
  if (!user) errors.user = "required";
  if (Object.keys(errors).length) return { errors };
  return {
    value: { url: url!, user, folder: folder!, password: typeof body.password === "string" ? body.password.slice(0, 500) : "", autoExport: body.autoExport === true },
  };
}
