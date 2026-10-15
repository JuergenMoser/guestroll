import "server-only";
import { config } from "@/lib/config";
import { RateLimiter } from "./rateLimit";

const MINUTE = 60_000;

const globalForLimiters = globalThis as unknown as { guestrollLimiters?: ReturnType<typeof create> };

function create() {
  return {
    upload: new RateLimiter(config.rateLimit.uploadsPerMinute, MINUTE),
    login: new RateLimiter(config.rateLimit.loginPerMinute, MINUTE),
    unlock: new RateLimiter(config.rateLimit.unlockPerMinute, MINUTE),
    // Per event, failures only: a guest rotating cookies to brute-force a code
    // still hits this ceiling, while a whole party typing the right code doesn't.
    unlockFailures: new RateLimiter(config.rateLimit.unlockPerMinute * 3, MINUTE),
  };
}

export const limiters = (globalForLimiters.guestrollLimiters ??= create());
