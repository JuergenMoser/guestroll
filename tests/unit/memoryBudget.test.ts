import { describe, expect, it, vi } from "vitest";
import { MemoryBudget, readBodyCapped, ServerBusyError } from "@/lib/security/request";

const body = (bytes: number) => new Request("http://x.test/", { method: "POST", body: new Uint8Array(bytes) });

describe("upload memory budget", () => {
  it("turns a body away once the shared budget is used, and frees it on release", async () => {
    const budget = new MemoryBudget(3 * 1000);
    const first = budget.hold();
    await readBodyCapped(body(900), 10_000, first);
    await expect(readBodyCapped(body(900), 10_000, budget.hold())).rejects.toBeInstanceOf(ServerBusyError);
    first.release();
    await expect(readBodyCapped(body(900), 10_000, budget.hold())).resolves.toHaveLength(900);
  });

  it("cuts a body that stalls, so its share comes back", async () => {
    vi.useFakeTimers();
    try {
      const budget = new MemoryBudget(10_000);
      const stalled = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array(1_000));
        },
      });
      const hold = budget.hold();
      const reading = readBodyCapped(new Request("http://x.test/", { method: "POST", body: stalled, duplex: "half" } as RequestInit), 100_000, hold);
      const outcome = expect(reading).rejects.toBeInstanceOf(ServerBusyError);
      await vi.advanceTimersByTimeAsync(120_000);
      await outcome;
      hold.release();
      // All of it is free again: a body of the whole budget's third fits.
      await expect(readBodyCapped(body(3_000), 10_000, budget.hold())).resolves.toHaveLength(3_000);
    } finally {
      vi.useRealTimers();
    }
  });
});
