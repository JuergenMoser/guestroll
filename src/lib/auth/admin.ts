import "server-only";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { config } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";
import { randomToken } from "@/lib/security/ids";
import { getAdminSession } from "./session";

const HASH_KEY = "admin_password_hash";
const VERSION_KEY = "admin_password_version";

function readSetting(key: string): string | undefined {
  return getDb().select().from(settings).where(eq(settings.key, key)).get()?.value;
}

function writeSetting(key: string, value: string): void {
  getDb()
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
}

export function passwordVersion(): number {
  return Number(readSetting(VERSION_KEY) ?? "1");
}

/** True when ADMIN_PASSWORD drives the password, which then can't be changed from the UI. */
export const passwordManagedByEnv = (): boolean => Boolean(config.adminPassword);

function storeHash(plain: string): void {
  writeSetting(HASH_KEY, bcrypt.hashSync(plain, 12));
  writeSetting(VERSION_KEY, String(passwordVersion() + 1));
}

let bootstrapped = false;

/**
 * Runs once per process. With ADMIN_PASSWORD set, the stored hash follows it.
 * Without it, the first boot generates a password and prints it to the logs:
 * there is no public "create the admin" page that a stranger could reach first.
 */
export function bootstrapAdmin(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  const hash = readSetting(HASH_KEY);
  if (config.adminPassword) {
    if (!hash || !bcrypt.compareSync(config.adminPassword, hash)) storeHash(config.adminPassword);
    return;
  }
  if (!hash) {
    const generated = randomToken(16);
    storeHash(generated);
    const lines = ["Guestroll admin password (shown once):", generated, "Change it in Admin → Settings, or set ADMIN_PASSWORD."];
    const width = Math.max(...lines.map((l) => l.length)) + 4;
    const row = (text: string) => `  │  ${text.padEnd(width - 4)}  │`;
    console.log(["", `  ┌${"─".repeat(width)}┐`, ...lines.map(row), `  └${"─".repeat(width)}┘`, ""].join("\n"));
  }
}

export async function verifyPassword(plain: string): Promise<boolean> {
  bootstrapAdmin();
  const hash = readSetting(HASH_KEY);
  return hash ? bcrypt.compare(plain, hash) : false;
}

export function changePassword(plain: string): void {
  if (passwordManagedByEnv()) throw new Error("Password is managed by ADMIN_PASSWORD");
  storeHash(plain);
}

export async function isAdmin(): Promise<boolean> {
  const session = await getAdminSession();
  return Boolean(session.isAdmin) && session.passwordVersion === passwordVersion();
}
