import "server-only";
import { createHash } from "node:crypto";
import { and, asc, eq, gt, inArray, isNull } from "drizzle-orm";
import { createAccount, getAccountByUsername, hashPassword } from "@/lib/accounts";
import { getDb } from "@/lib/db/client";
import { events, invitations, type AccountRow, type InvitationRow } from "@/lib/db/schema";
import { newId, randomToken } from "@/lib/security/ids";

export const INVITATION_DAYS = 7;

export interface InvitationDto {
  id: string;
  email: string;
  role: InvitationRow["role"];
  eventIds: string[];
  expiresAt: number;
  createdAt: number;
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function toInvitationDto(row: InvitationRow): InvitationDto {
  return { id: row.id, email: row.email, role: row.role, eventIds: JSON.parse(row.eventIds) as string[], expiresAt: row.expiresAt, createdAt: row.createdAt };
}

/** Returns the token once: only its hash is stored. */
export function createInvitation(input: { email: string; role: InvitationRow["role"]; eventIds: string[]; invitedBy: string }): { invitation: InvitationRow; token: string } {
  const token = randomToken(32);
  const invitation = getDb()
    .insert(invitations)
    .values({
      id: newId(),
      tokenHash: hashToken(token),
      email: input.email,
      role: input.role,
      eventIds: JSON.stringify(input.role === "organizer" ? [...new Set(input.eventIds)] : []),
      invitedBy: input.invitedBy,
      expiresAt: Date.now() + INVITATION_DAYS * 86_400_000,
      createdAt: Date.now(),
    })
    .returning()
    .get();
  return { invitation, token };
}

export function listPendingInvitations(now = Date.now()): InvitationRow[] {
  return getDb()
    .select()
    .from(invitations)
    .where(and(isNull(invitations.acceptedAt), gt(invitations.expiresAt, now)))
    .orderBy(asc(invitations.createdAt))
    .all();
}

export function revokeInvitation(id: string): boolean {
  return getDb().delete(invitations).where(and(eq(invitations.id, id), isNull(invitations.acceptedAt))).run().changes > 0;
}

/** The invitation behind a link, if it can still be used. */
export function findInvitation(token: unknown, now = Date.now()): InvitationRow | undefined {
  if (typeof token !== "string" || !/^[a-z0-9]{32}$/.test(token)) return undefined;
  return getDb()
    .select()
    .from(invitations)
    .where(and(eq(invitations.tokenHash, hashToken(token)), isNull(invitations.acceptedAt), gt(invitations.expiresAt, now)))
    .get();
}

export type AcceptResult = { ok: true; account: AccountRow } | { ok: false; reason: "invalid" | "taken" };

/**
 * Creates the account and spends the invitation, in one transaction: two
 * people opening the same link can't both get in. Events deleted since the
 * invitation are simply left out.
 */
export function acceptInvitation(token: string, input: { username: string; name: string; password: string }): AcceptResult {
  const passwordHash = hashPassword(input.password);
  return getDb().transaction((): AcceptResult => {
    const invitation = findInvitation(token);
    if (!invitation) return { ok: false, reason: "invalid" };
    if (getAccountByUsername(input.username)) return { ok: false, reason: "taken" };
    const spent = getDb()
      .update(invitations)
      .set({ acceptedAt: Date.now() })
      .where(and(eq(invitations.id, invitation.id), isNull(invitations.acceptedAt)))
      .run();
    if (spent.changes === 0) return { ok: false, reason: "invalid" };
    const wanted = JSON.parse(invitation.eventIds) as string[];
    const existing = wanted.length ? getDb().select({ id: events.id }).from(events).where(inArray(events.id, wanted)).all().map((e) => e.id) : [];
    const account = createAccount({ username: input.username, name: input.name, email: invitation.email, role: invitation.role, eventIds: existing, passwordHash });
    return { ok: true, account };
  });
}
