import "server-only";
import { accountsForEvent, listAccounts } from "@/lib/accounts";
import { config } from "@/lib/config";
import { open, seal } from "@/lib/crypto/secretBox";
import { readJsonSetting, readSetting, writeSetting } from "@/lib/settings";

export interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

export interface AlertSettings {
  /** Photos waiting for approval, as a digest (at most every 30 minutes per event). */
  pendingPhotos: boolean;
  /** An event's uploads closed: its summary. */
  eventEnded: boolean;
  /** A burst of failed admin logins. */
  failedLogins: boolean;
  /** The data folder's disk is nearly full. */
  storage: boolean;
}

export const DEFAULT_ALERTS: AlertSettings = { pendingPhotos: true, eventEnded: true, failedLogins: true, storage: true };

const SMTP_KEY = "smtp";
const ALERTS_KEY = "alerts";
const ADMIN_EMAIL_KEY = "admin_email";

/** Where the SMTP configuration comes from: the environment wins when SMTP_HOST is set. */
export const smtpSource = (): "env" | "admin" | "none" => (config.smtp.host ? "env" : readSetting(SMTP_KEY) ? "admin" : "none");

export function getSmtpSettings(): SmtpSettings | null {
  if (config.smtp.host) return { ...config.smtp };
  const stored = readSetting(SMTP_KEY);
  if (!stored) return null;
  const parsed = JSON.parse(stored) as Omit<SmtpSettings, "password"> & { password?: string };
  return { ...parsed, password: parsed.password ? (open(parsed.password) ?? "") : "" };
}

function storedSmtp(): (Omit<SmtpSettings, "password"> & { password?: string }) | undefined {
  const previous = readSetting(SMTP_KEY);
  return previous ? JSON.parse(previous) : undefined;
}

/**
 * Whether saving `input` without a password would keep a stored one for another
 * server: that would send the saved password to whatever host the form now names,
 * so another owner could collect it with their own server.
 */
export function smtpNeedsPassword(input: Pick<SmtpSettings, "host" | "port" | "user" | "password">): boolean {
  const previous = storedSmtp();
  if (input.password || !previous?.password) return false;
  return previous.host !== input.host || previous.port !== input.port || previous.user !== input.user;
}

/**
 * Saves the admin's SMTP settings. The password is sealed; sending an empty
 * password keeps the stored one for the same server and account only.
 */
export function saveSmtpSettings(input: SmtpSettings): void {
  const previous = storedSmtp();
  const password = input.password ? seal(input.password) : smtpNeedsPassword(input) ? undefined : previous?.password;
  writeSetting(SMTP_KEY, JSON.stringify({ ...input, password }));
}

/** What the admin form may show: everything but the password itself. */
export function smtpSettingsForForm() {
  const current = getSmtpSettings();
  return {
    source: smtpSource(),
    host: current?.host ?? "",
    port: current?.port ?? 587,
    secure: current?.secure ?? false,
    user: current?.user ?? "",
    from: current?.from ?? "",
    hasPassword: Boolean(current?.password),
  };
}

export function getAlertSettings(): AlertSettings {
  return readJsonSetting(ALERTS_KEY, DEFAULT_ALERTS);
}

export function saveAlertSettings(alerts: AlertSettings): void {
  writeSetting(ALERTS_KEY, JSON.stringify(alerts));
}

export function getAdminEmail(): string {
  return config.adminEmail || readSetting(ADMIN_EMAIL_KEY) || "";
}

export const adminEmailFromEnv = (): boolean => Boolean(config.adminEmail);

export function saveAdminEmail(email: string): void {
  writeSetting(ADMIN_EMAIL_KEY, email);
}

/** Mail is usable when an SMTP server is configured; alerts also need an admin address. */
export const mailEnabled = (): boolean => Boolean(getSmtpSettings()?.host);

const unique = (emails: (string | null | undefined)[]) => [...new Set(emails.filter((e): e is string => Boolean(e)).map((e) => e.toLowerCase()))];

/** Who hears about an event: the instance address, plus every account managing the event that set an email. */
export function eventRecipients(eventId: string): string[] {
  return unique([getAdminEmail(), ...accountsForEvent(eventId).map((a) => a.email)]);
}

/** Instance-wide alerts (sign-ins, disk): the instance address and the owners. */
export function instanceRecipients(): string[] {
  return unique([getAdminEmail(), ...listAccounts().filter((a) => a.role === "owner").map((a) => a.email)]);
}
