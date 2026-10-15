import "server-only";
import { config } from "@/lib/config";
import { RateLimiter } from "./rateLimit";

const MINUTE = 60_000;

const globalForLimiters = globalThis as unknown as { guestrollLimiters?: ReturnType<typeof create> };

function create() {
  return {
    upload: new RateLimiter(config.rateLimit.uploadsPerMinute, MINUTE),
    login: new RateLimiter(config.rateLimit.loginPerMinute, MINUTE),
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
    unlockFailures: new RateLimiter(config.rateLimit.unlockPerMinute * 3, MINUTE),
    // Same pair for gallery-link passwords, per link.
    shareUnlock: new RateLimiter(config.rateLimit.unlockPerMinute, MINUTE),
    shareFailures: new RateLimiter(config.rateLimit.unlockPerMinute * 3, MINUTE),
    // Guestbook: a handful of messages per minute is plenty for one guest.
    message: new RateLimiter(10, MINUTE),
    // A test email per click is plenty; this stops a stuck button from spamming.
    mailTest: new RateLimiter(5, MINUTE),
  };
}

export const limiters = (globalForLimiters.guestrollLimiters ??= create());

const globalForLocks = globalThis as unknown as { guestrollUploadLocks?: Set<string> };

/**
 * One upload at a time per guest. The quota check and the insert are separated
 * by image processing; without this, parallel requests all pass the check
 * before any of them is counted.
 */
export const uploadLocks = (globalForLocks.guestrollUploadLocks ??= new Set<string>());
