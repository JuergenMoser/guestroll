import { describe, expect, it } from "vitest";
import { RateLimiter } from "@/lib/security/rateLimit";

describe("RateLimiter", () => {
  it("allows up to the limit within the window, then reports the wait", () => {
    let now = 0;
    const limiter = new RateLimiter(2, 1_000, () => now);
    expect(limiter.consume("a").allowed).toBe(true);
    now = 100;
    expect(limiter.consume("a").allowed).toBe(true);
    now = 200;
    expect(limiter.consume("a")).toEqual({ allowed: false, retryAfterMs: 800 });
    expect(limiter.isLimited("a")).toBe(true);
  });

  it("slides: old hits expire individually", () => {
    let now = 0;
    const limiter = new RateLimiter(2, 1_000, () => now);
    limiter.consume("a");
    now = 500;
    limiter.consume("a");
    now = 1_001;
    expect(limiter.consume("a").allowed).toBe(true);
    expect(limiter.consume("a").allowed).toBe(false);
  });

  it("keeps keys independent and supports reset", () => {
    const limiter = new RateLimiter(1, 1_000, () => 0);
    limiter.consume("a");
    expect(limiter.consume("b").allowed).toBe(true);
    limiter.reset("a");
    expect(limiter.consume("a").allowed).toBe(true);
  });

  it("doesn't record a hit when refusing", () => {
    let now = 0;
    const limiter = new RateLimiter(1, 1_000, () => now);
    limiter.consume("a");
    for (let i = 0; i < 10; i++) limiter.consume("a");
    now = 1_001;
    expect(limiter.consume("a").allowed).toBe(true);
  });
});
