import { describe, expect, it } from "vitest";
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
});
