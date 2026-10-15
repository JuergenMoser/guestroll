import "server-only";
import bcrypt from "bcryptjs";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { shareLinks, type ShareLinkRow } from "@/lib/db/schema";
import { newId, randomToken } from "@/lib/security/ids";

export interface ShareInput {
  eventId: string;
  password: string;
  label?: string;
  allowDownload: boolean;
  /** Epoch ms, or null for a link that never expires. */
  expiresAt: number | null;
}

export const SHARE_TOKEN_PATTERN = /^[a-z0-9]{32}$/;

export function createShareLink(input: ShareInput): ShareLinkRow {
  return getDb()
    .insert(shareLinks)
    .values({
      id: newId(),
      eventId: input.eventId,
      // 32 chars over 31 symbols ≈ 158 bits: the link itself is unguessable, the password is a second factor.
      token: randomToken(32),
      passwordHash: bcrypt.hashSync(input.password, 10),
      label: input.label?.trim().slice(0, 80) ?? "",
      allowDownload: input.allowDownload,
      expiresAt: input.expiresAt,
    })
    .returning()
    .get();
}

export function listShareLinks(eventId: string): ShareLinkRow[] {
  return getDb().select().from(shareLinks).where(eq(shareLinks.eventId, eventId)).orderBy(desc(shareLinks.createdAt)).all();
}

export function revokeShareLink(id: string, eventId: string): boolean {
  return (
    getDb()
      .update(shareLinks)
      .set({ revokedAt: Date.now() })
      .where(and(eq(shareLinks.id, id), eq(shareLinks.eventId, eventId), isNull(shareLinks.revokedAt)))
      .run().changes > 0
  );
}

export function getShareByToken(token: string): ShareLinkRow | undefined {
  if (!SHARE_TOKEN_PATTERN.test(token)) return undefined;
  return getDb().select().from(shareLinks).where(eq(shareLinks.token, token)).get();
}

export function getShareById(id: string): ShareLinkRow | undefined {
  return getDb().select().from(shareLinks).where(eq(shareLinks.id, id)).get();
}

export const isShareActive = (share: Pick<ShareLinkRow, "revokedAt" | "expiresAt">, now = Date.now()): boolean =>
  share.revokedAt === null && (share.expiresAt === null || share.expiresAt > now);

export const checkSharePassword = (share: ShareLinkRow, password: string): Promise<boolean> => bcrypt.compare(password, share.passwordHash);

export function recordShareView(id: string): void {
  getDb()
    .update(shareLinks)
    .set({ views: sql`${shareLinks.views} + 1`, lastUsedAt: Date.now() })
    .where(eq(shareLinks.id, id))
    .run();
}

/** What the admin sees: never the hash. */
export function toShareDto(share: ShareLinkRow) {
  return {
    id: share.id,
    token: share.token,
    label: share.label,
    allowDownload: share.allowDownload,
    expiresAt: share.expiresAt,
    revokedAt: share.revokedAt,
    views: share.views,
    lastUsedAt: share.lastUsedAt,
    createdAt: share.createdAt,
    active: isShareActive(share),
  };
}
export type ShareDto = ReturnType<typeof toShareDto>;

/** Readable but strong: 4 groups of 4 unambiguous characters, e.g. "k7mq-x2pd-…". */
export function generateSharePassword(): string {
  return Array.from({ length: 4 }, () => randomToken(4)).join("-");
}
