import { describe, expect, it } from "vitest";
import { MAX_CHALLENGES, parseChallenges, readChallenges } from "@/lib/challenges";

describe("challenges", () => {
  it("keeps known ids, assigns new ones, and drops empty rows", () => {
    const res = parseChallenges([{ id: "abcd2345", label: " The dance floor " }, { id: "", label: "With a stranger" }, { label: "   " }, "Plain string"]);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.map((c) => c.label)).toEqual(["The dance floor", "With a stranger", "Plain string"]);
    expect(res.value[0].id).toBe("abcd2345");
    expect(res.value[1].id).toMatch(/^[a-z0-9]{8}$/);
    expect(new Set(res.value.map((c) => c.id)).size).toBe(3);
  });

  it("gives a duplicated or forged id a fresh one", () => {
    const res = parseChallenges([{ id: "abcd2345", label: "A" }, { id: "abcd2345", label: "B" }, { id: "../../x", label: "C" }]);
    if (!res.ok) throw new Error("expected ok");
    expect(res.value[1].id).not.toBe("abcd2345");
    expect(res.value[2].id).toMatch(/^[a-z0-9]{8}$/);
  });

  it("refuses too many or too long, and strips control characters", () => {
    expect(parseChallenges(Array.from({ length: MAX_CHALLENGES + 1 }, (_, i) => `c${i}`)).ok).toBe(false);
    expect(parseChallenges(["x".repeat(61)]).ok).toBe(false);
    expect(parseChallenges("nope").ok).toBe(false);
    const res = parseChallenges(["a\u0000b\u001fc"]);
    expect(res.ok && res.value[0].label).toBe("abc");
  });

  it("reads broken JSON as no challenges", () => {
    expect(readChallenges("{oops")).toEqual([]);
    expect(readChallenges('{"id":1}')).toEqual([]);
    expect(readChallenges('[{"id":"a","label":"b"},{"label":2}]')).toEqual([{ id: "a", label: "b" }]);
  });
});
