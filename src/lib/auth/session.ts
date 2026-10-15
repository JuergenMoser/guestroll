import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import { config } from "@/lib/config";
import { newId } from "@/lib/security/ids";
import { sessionSecret } from "./secret";

export interface AdminSession {
  accountId?: string;
  /** Must match `accounts.session_version`: a password change signs out every older cookie. */
  version?: number;
  /** Password checked, two-step code still to come: not signed in yet. */
  pending?: { accountId: string; version: number; at: number };
}

export interface GuestSession {
  guestId?: string;
  name?: string;
  /** Events whose access code this browser has entered. */
  unlocked?: string[];
  /** Event id → booth key this device was set up with; only valid while it is still the event's key. */
  booths?: Record<string, string>;
}

export interface ShareSession {
  /** Ids of gallery links this browser unlocked with their password. */
  shares?: string[];
}

const ADMIN_TTL_SECONDS = 12 * 60 * 60;
const GUEST_TTL_SECONDS = 30 * 24 * 60 * 60;

function options(cookieName: string, ttl: number): SessionOptions {
  return {
    cookieName,
    password: sessionSecret(),
    ttl,
    cookieOptions: {
      httpOnly: true,
      secure: config.secureCookies,
      sameSite: "lax",
      path: "/",
    },
  };
}

export async function getAdminSession() {
  return getIronSession<AdminSession>(await cookies(), options("gr_admin", ADMIN_TTL_SECONDS));
}

export async function getGuestSession() {
  return getIronSession<GuestSession>(await cookies(), options("gr_guest", GUEST_TTL_SECONDS));
}

/** The few minutes between leaving for the identity provider and coming back. */
export interface OidcSession {
  state?: string;
  nonce?: string;
  verifier?: string;
  at?: number;
  /** Set when a signed-in account is linking its identity, rather than signing in. */
  linkAccountId?: string;
}

export async function getOidcSession() {
  return getIronSession<OidcSession>(await cookies(), options("gr_oidc", 10 * 60));
}

export async function getShareSession() {
  return getIronSession<ShareSession>(await cookies(), options("gr_share", GUEST_TTL_SECONDS));
}

/** Returns the guest id, minting one on first visit. Callers must `save()` the session. */
export function ensureGuestId(session: GuestSession): string {
  session.guestId ??= newId();
  return session.guestId;
}
