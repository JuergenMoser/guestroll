import "server-only";
import { eq, sql } from "drizzle-orm";
import { getAccount } from "@/lib/accounts";
import { open, seal } from "@/lib/crypto/secretBox";
import { getDb } from "@/lib/db/client";
import { accounts, type AccountRow } from "@/lib/db/schema";
import { hashRecoveryCode, newRecoveryCodes, newTotpSecret, otpauthUri, verifyTotp } from "./totp";

export const hasTwoFactor = (account: Pick<AccountRow, "totpSecret">) => Boolean(account.totpSecret);

function recoveryHashes(account: AccountRow): string[] {
  try {
    return JSON.parse(account.recoveryCodes ?? "[]");
  } catch {
    return [];
  }
}

export const recoveryCodesLeft = (account: AccountRow) => recoveryHashes(account).length;

/** Starts a setup: a new secret, kept aside until a first code proves the app has it. */
export function startTwoFactor(account: AccountRow, issuer: string): { secret: string; uri: string } {
  const secret = newTotpSecret();
  getDb().update(accounts).set({ totpPending: seal(secret) }).where(eq(accounts.id, account.id)).run();
  return { secret, uri: otpauthUri(secret, account.username, issuer) };
}

/** The first code turns it on; returns the recovery codes, shown once, or null for a wrong code. */
export function confirmTwoFactor(account: AccountRow, code: string, now = Date.now()): string[] | null {
  const secret = account.totpPending ? open(account.totpPending) : null;
  if (!secret) return null;
  const step = verifyTotp(secret, code, now);
  if (step === null) return null;
  const codes = newRecoveryCodes();
  getDb()
    .update(accounts)
    .set({
      totpSecret: seal(secret),
      totpPending: null,
      totpLastStep: step,
      recoveryCodes: JSON.stringify(codes.map(hashRecoveryCode)),
      // Other sessions were opened without the second step: they end now.
      sessionVersion: sql`${accounts.sessionVersion} + 1`,
    })
    .where(eq(accounts.id, account.id))
    .run();
  return codes;
}

/**
 * Checks a sign-in code: a TOTP code (each step usable once) or a recovery
 * code (each code usable once). Records what was used.
 */
export function checkSecondFactor(account: AccountRow, code: string, now = Date.now()): "totp" | "recovery" | null {
  const secret = account.totpSecret ? open(account.totpSecret) : null;
  if (!secret) return null;
  const step = verifyTotp(secret, code, now, account.totpLastStep);
  if (step !== null) {
    getDb().update(accounts).set({ totpLastStep: step }).where(eq(accounts.id, account.id)).run();
    return "totp";
  }
  const hash = hashRecoveryCode(code);
  const hashes = recoveryHashes(account);
  if (/[a-z]/i.test(code) && hashes.includes(hash)) {
    getDb().update(accounts).set({ recoveryCodes: JSON.stringify(hashes.filter((h) => h !== hash)) }).where(eq(accounts.id, account.id)).run();
    return "recovery";
  }
  return null;
}

/** Turns it off (by its owner, or an owner resetting a lost phone); other sessions end. */
export function disableTwoFactor(accountId: string): void {
  getDb()
    .update(accounts)
    .set({ totpSecret: null, totpPending: null, totpLastStep: null, recoveryCodes: null, sessionVersion: sql`${accounts.sessionVersion} + 1` })
    .where(eq(accounts.id, accountId))
    .run();
}

/** New recovery codes replace the old ones. */
export function regenerateRecoveryCodes(accountId: string): string[] {
  const codes = newRecoveryCodes();
  getDb().update(accounts).set({ recoveryCodes: JSON.stringify(codes.map(hashRecoveryCode)) }).where(eq(accounts.id, accountId)).run();
  return codes;
}

export const reload = (id: string) => getAccount(id)!;
