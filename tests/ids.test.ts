import { describe, expect, it } from "vitest";
import { eventSlug, randomToken, SLUG_PATTERN, slugify } from "@/lib/security/ids";

describe("ids", () => {
  it("slugifies accents and punctuation", () => {
    expect(slugify("Mariage de Julie & Thomas !")).toBe("mariage-de-julie-thomas");
    expect(slugify("Été 2026")).toBe("ete-2026");
    expect(slugify("🎉")).toBe("");
  });

  it("appends an unguessable suffix that matches the route pattern", () => {
    const slug = eventSlug("Anniversaire");
    expect(slug).toMatch(/^anniversaire-[a-z0-9]{8}$/);
    expect(SLUG_PATTERN.test(slug)).toBe(true);
    expect(eventSlug("🎉")).toMatch(/^event-/);
  });

  it("produces distinct tokens from an unambiguous alphabet", () => {
    const tokens = new Set(Array.from({ length: 200 }, () => randomToken(8)));
    expect(tokens.size).toBe(200);
    for (const token of tokens) expect(token).not.toMatch(/[01ilo]/);
  });
});
