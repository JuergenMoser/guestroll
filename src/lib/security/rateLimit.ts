/**
 * Sliding-window limiter kept in memory. Guestroll runs as a single process
 * (SQLite rules out horizontal scaling anyway), so there is no shared store to sync.
 */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly clock: () => number = Date.now,
  ) {}

  /** Records a hit and returns whether it is allowed, with the wait before the next allowed hit. */
  consume(key: string): { allowed: boolean; retryAfterMs: number } {
    const now = this.clock();
    const since = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > since);

    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return { allowed: false, retryAfterMs: recent[0] + this.windowMs - now };
    }

    recent.push(now);
    this.hits.set(key, recent);
    this.sweep(since);
    return { allowed: true, retryAfterMs: 0 };
  }

  /** Same verdict as `consume` without recording a hit. */
  isLimited(key: string): boolean {
    const since = this.clock() - this.windowMs;
    return (this.hits.get(key) ?? []).filter((t) => t > since).length >= this.limit;
  }

  reset(key: string): void {
    this.hits.delete(key);
  }

  // Bounded memory: without this, every IP that ever hit the server stays in the map.
  private sweep(since: number): void {
    if (this.hits.size < 5_000) return;
    for (const [key, times] of this.hits) {
      if (times[times.length - 1] <= since) this.hits.delete(key);
    }
  }
}
