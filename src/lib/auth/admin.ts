import "server-only";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { countAccounts, createAccount, getAccount, getAccountByUsername, hashPassword, accountEventIds, setAccountPassword } from "@/lib/accounts";
import { config } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import { accounts, type AccountRow } from "@/lib/db/schema";
import type { AdminScope } from "@/lib/policy";
import { randomToken } from "@/lib/security/ids";
import { deleteSetting, readSetting } from "@/lib/settings";
import { getAdminSession } from "./session";

/** The signed-in admin, re-read from the database on every request. */
export interface AdminIdentity {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: AccountRow["role"];
  scope: AdminScope;
}

// Before accounts existed, the single admin password lived in `settings`.
const LEGACY_HASH_KEY = "admin_password_hash";
const LEGACY_VERSION_KEY = "admin_password_version";

/** The account whose password ADMIN_PASSWORD controls; its password can't be changed from the UI. */
export const passwordManagedByEnv = (account: Pick<AccountRow, "username">): boolean =>
  Boolean(config.adminPassword) && account.username === config.adminUsername;

function printGenerated(username: string, password: string) {
  const lines = ["Guestroll admin account (shown once):", `username: ${username}`, `password: ${password}`, "Change it in Admin → Settings, or set ADMIN_PASSWORD."];
  const width = Math.max(...lines.map((l) => l.length)) + 4;
  const row = (text: string) => `  │  ${text.padEnd(width - 4)}  │`;
  console.log(["", `  ┌${"─".repeat(width)}┐`, ...lines.map(row), `  └${"─".repeat(width)}┘`, ""].join("\n"));
}

let bootstrapped = false;

/**
 * Runs once per process. The first start creates the owner account: from
 * ADMIN_PASSWORD, from the single password of a pre-accounts install, or
 * generated and printed to the logs. There is no public "create the admin"
 * page that a stranger could reach first. Afterwards, ADMIN_PASSWORD keeps
 * that account's password in sync.
 */
export function bootstrapAdmin(): void {
  if (bootstrapped) return;
  bootstrapped = true;
  const username = config.adminUsername;

  if (countAccounts() === 0) {
    const legacy = readSetting(LEGACY_HASH_KEY);
    let passwordHash: string;
    if (config.adminPassword) passwordHash = hashPassword(config.adminPassword);
    else if (legacy) passwordHash = legacy;
    else {
      const generated = randomToken(16);
      passwordHash = hashPassword(generated);
      printGenerated(username, generated);
    }
    createAccount({ username, name: "", email: null, role: "owner", eventIds: [], passwordHash });
    deleteSetting(LEGACY_HASH_KEY);
    deleteSetting(LEGACY_VERSION_KEY);
    return;
  }

  if (config.adminPassword) {
    const account = getAccountByUsername(username);
    if (!account) {
      createAccount({ username, name: "", email: null, role: "owner", eventIds: [], passwordHash: hashPassword(config.adminPassword) });
    } else {
      if (!bcrypt.compareSync(config.adminPassword, account.passwordHash)) setAccountPassword(account.id, hashPassword(config.adminPassword));
      // The env account is the way back in: it is always an owner.
      if (account.role !== "owner") getDb().update(accounts).set({ role: "owner" }).where(eq(accounts.id, account.id)).run();
    }
  }
}

// Compared against when the username doesn't exist, so a wrong username takes
// as long as a wrong password and usernames can't be probed by timing.
const DUMMY_HASH = bcrypt.hashSync("guestroll-dummy-password", 12);

export async function verifyLogin(username: string, password: string): Promise<AccountRow | null> {
  bootstrapAdmin();
  const account = getAccountByUsername(username);
  const ok = await bcrypt.compare(password, account?.passwordHash ?? DUMMY_HASH);
  return ok && account ? account : null;
}

export function verifyAccountPassword(account: AccountRow, password: string): Promise<boolean> {
  return bcrypt.compare(password, account.passwordHash);
}

export function changePassword(account: AccountRow, plain: string): void {
  if (passwordManagedByEnv(account)) throw new Error("Password is managed by ADMIN_PASSWORD");
  setAccountPassword(account.id, hashPassword(plain));
}

export function identityOf(account: AccountRow): AdminIdentity {
  return {
    id: account.id,
    username: account.username,
    name: account.name,
    email: account.email,
    role: account.role,
    scope: account.role === "owner" ? { all: true } : { all: false, eventIds: accountEventIds(account.id) },
  };
}

export async function getAdmin(): Promise<AdminIdentity | null> {
  const session = await getAdminSession();
  if (!session.accountId) return null;
  const account = getAccount(session.accountId);
  if (!account || account.sessionVersion !== session.version) return null;
  return identityOf(account);
}
