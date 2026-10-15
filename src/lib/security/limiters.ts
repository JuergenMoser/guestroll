import "server-only";
import { config } from "@/lib/config";
import { RateLimiter } from "./rateLimit";

const MINUTE = 60_000;

const globalForLimiters = globalThis as unknown as {
  guestrollLimiters?: ReturnType<typeof create>;
};

function create() {
  return {
    upload: new RateLimiter(config.rateLimit.uploadsPerMinute, MINUTE),
    /**
     * A guest id is just a cookie: a script without a cookie jar gets a fresh
     * per-guest budget on every request. These two don't reset that way. Per
     * address only behind a trusted proxy (otherwise every client is "direct"),
     * and generous, since a whole party shares the venue's Wi-Fi.
     */
    uploadPerEvent: new RateLimiter(
      config.rateLimit.uploadsPerMinute * 10,
      MINUTE,
    ),
    uploadPerIp: new RateLimiter(config.rateLimit.uploadsPerMinute * 4, MINUTE),
    /**
     * Wrong passwords per address and username. A success only clears its own
     * key: clearing the whole address let anyone with an account (or the demo's
     * published one) reset the budget between guesses at the owner's password.
     */
    login: new RateLimiter(config.rateLimit.loginPerMinute, MINUTE),
    // Every attempt from one address, successes included: never reset.
    loginPerIp: new RateLimiter(config.rateLimit.loginPerMinute * 6, MINUTE),
    // Wrong passwords per username from anywhere: guesses spread over many addresses.
    loginPerAccount: new RateLimiter(config.rateLimit.loginPerMinute * 6, MINUTE),
    // Second step, per account: six digits are guessable without a ceiling.
    twoFactor: new RateLimiter(5, MINUTE),
    // Setting it up or off from the settings, per account: its own budget, so a
    // fumbled setup doesn't lock the next sign-in.
    twoFactorSettings: new RateLimiter(10, MINUTE),
    unlock: new RateLimiter(config.rateLimit.unlockPerMinute, MINUTE),
    /**
     * Wrong codes per event, across all clients, so rotating cookies or IPs
     * doesn't reset it. Deliberate trade-off: someone flooding wrong codes can
     * delay real guests by up to a minute at a time, but can never brute-force
     * a 6+ character code (see docs/security.md).
     */
    unlockFailures: new RateLimiter(
      config.rateLimit.unlockPerMinute * 3,
      MINUTE,
    ),
    // Same pair for gallery-link passwords, per link.
    shareUnlock: new RateLimiter(config.rateLimit.unlockPerMinute, MINUTE),
    shareFailures: new RateLimiter(
      config.rateLimit.unlockPerMinute * 3,
      MINUTE,
    ),
    // Guestbook: a handful of messages per minute is plenty for one guest.
    message: new RateLimiter(10, MINUTE),
    messagePerEvent: new RateLimiter(60, MINUTE),
    messagePerIp: new RateLimiter(30, MINUTE),
    // A test email per click is plenty; this stops a stuck button from spamming.
    mailTest: new RateLimiter(5, MINUTE),
  };
}

export const limiters = (globalForLimiters.guestrollLimiters ??= create());

const globalForLocks = globalThis as unknown as {
  guestrollUploadLocks?: Set<string>;
};

/**
 * One upload at a time per guest. The quota check and the insert are separated
 * by image processing; without this, parallel requests all pass the check
 * before any of them is counted.
 */
export const uploadLocks = (globalForLocks.guestrollUploadLocks ??=
  new Set<string>());

const globalForSlots = globalThis as unknown as {
  guestrollUploadSlots?: { busy: number };
};
const slots = (globalForSlots.guestrollUploadSlots ??= { busy: 0 });

/**
 * Uploads being received at once, across all guests. Each holds up to three
 * copies of a 25 MB body while it is read and decoded: past this, the next one
 * is asked to retry in a moment (the guest's queue does so on its own) instead
 * of the server running out of memory.
 */
export const MAX_UPLOADS_AT_ONCE = 6;

export function takeUploadSlot(): (() => void) | null {
  if (slots.busy >= MAX_UPLOADS_AT_ONCE) return null;
  slots.busy++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    slots.busy--;
  };
}
