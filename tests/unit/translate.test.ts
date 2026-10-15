import { describe, expect, it } from "vitest";
import { messages } from "@/lib/i18n/messages";
import { createTranslator } from "@/lib/i18n/translate";

function keys(node: object, prefix = ""): string[] {
  return Object.entries(node).flatMap(([k, v]) => (typeof v === "string" ? [`${prefix}${k}`] : keys(v, `${prefix}${k}.`)));
}

describe("i18n", () => {
  it("has the same keys in every locale", () => {
    for (const locale of Object.keys(messages) as (keyof typeof messages)[]) {
      expect(keys(messages[locale]).sort(), locale).toEqual(keys(messages.en).sort());
    }
  });

  it("interpolates variables and falls back to the key", () => {
    const t = createTranslator(messages.en);
    expect(t("guest.remaining", { n: 3 })).toBe("3 photos left");
    expect(t("nope.missing" as never)).toBe("nope.missing");
  });
});
