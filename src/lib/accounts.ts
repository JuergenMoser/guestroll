import "server-only";
import bcrypt from "bcryptjs";
import { and, asc, count, eq, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { accountEvents, accounts, type AccountRole, type AccountRow } from "@/lib/db/schema";
import { newId } from "@/lib/security/ids";

/** What the admin UI may know about an account: never the hash. */
export interface AccountDto {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: AccountRole;
  eventIds: string[];
  twoFactor: boolean;
  lastLoginAt: number | null;
  createdAt: number;
}

export const hashPassword = (plain: string) => bcrypt.hashSync(plain, 12);

export function accountEventIds(accountId: string): string[] {
  return getDb().select({ id: accountEvents.eventId }).from(accountEvents).where(eq(accountEvents.accountId, accountId)).all().map((r) => r.id);
}

export function toAccountDto(account: AccountRow): AccountDto {
  return {
    id: account.id,
    username: account.username,
    name: account.name,
    email: account.email,
    role: account.role,
    eventIds: account.role === "owner" ? [] : accountEventIds(account.id),
    twoFactor: Boolean(account.totpSecret),
    lastLoginAt: account.lastLoginAt,
    createdAt: account.createdAt,
  };
}

export const getAccount = (id: string) => getDb().select().from(accounts).where(eq(accounts.id, id)).get();
export const getAccountByUsername = (username: string) =>
  getDb().select().from(accounts).where(eq(accounts.username, username.trim().toLowerCase())).get();
export const listAccounts = () => getDb().select().from(accounts).orderBy(asc(accounts.createdAt)).all();
export const countAccounts = () => getDb().select({ n: count() }).from(accounts).get()?.n ?? 0;

export function countOwners(exceptId?: string): number {
  const where = exceptId ? and(eq(accounts.role, "owner"), ne(accounts.id, exceptId)) : eq(accounts.role, "owner");
  return getDb().select({ n: count() }).from(accounts).where(where).get()?.n ?? 0;
}

export interface AccountInput {
  username: string;
  name: string;
  email: string | null;
  role: AccountRole;
  eventIds: string[];
}

function setEvents(accountId: string, role: AccountRole, eventIds: string[]) {
  const db = getDb();
  db.delete(accountEvents).where(eq(accountEvents.accountId, accountId)).run();
  // Owners see every event: assignments would only go stale.
  if (role === "organizer" && eventIds.length) {
    db.insert(accountEvents)
      .values([...new Set(eventIds)].map((eventId) => ({ accountId, eventId })))
      .onConflictDoNothing()
      .run();
  }
}

export function createAccount(input: AccountInput & { passwordHash: string }): AccountRow {
  return getDb().transaction(() => {
    const row = getDb()
      .insert(accounts)
      .values({ id: newId(), username: input.username, name: input.name, email: input.email, role: input.role, passwordHash: input.passwordHash })
      .returning()
      .get();
    setEvents(row.id, input.role, input.eventIds);
    return row;
  });
}

export function updateAccount(id: string, input: Partial<AccountInput>): AccountRow | undefined {
  return getDb().transaction(() => {
    const { eventIds, ...fields } = input;
    const row = Object.keys(fields).length
      ? getDb().update(accounts).set(fields).where(eq(accounts.id, id)).returning().get()
      : getAccount(id);
    if (row && (eventIds !== undefined || fields.role !== undefined)) setEvents(id, row.role, eventIds ?? accountEventIds(id));
    return row;
  });
}

/** Also signs the account out everywhere: older cookies carry the old version. */
export function setAccountPassword(id: string, passwordHash: string): void {
  getDb()
    .update(accounts)
    .set({ passwordHash, sessionVersion: sql`${accounts.sessionVersion} + 1` })
    .where(eq(accounts.id, id))
    .run();
}

export function deleteAccount(id: string): boolean {
  return getDb().delete(accounts).where(eq(accounts.id, id)).run().changes > 0;
}

export function touchLogin(id: string): void {
  getDb().update(accounts).set({ lastLoginAt: Date.now() }).where(eq(accounts.id, id)).run();
}

/** Accounts that manage an event (organizers assigned to it, and every owner). */
export function accountsForEvent(eventId: string): AccountRow[] {
  const owners = getDb().select().from(accounts).where(eq(accounts.role, "owner")).all();
  const organizers = getDb()
    .select({ account: accounts })
    .from(accountEvents)
    .innerJoin(accounts, eq(accounts.id, accountEvents.accountId))
    .where(eq(accountEvents.eventId, eventId))
    .all()
    .map((r) => r.account);
  return [...owners, ...organizers];
}
