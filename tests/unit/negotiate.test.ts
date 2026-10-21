import { describe, expect, it } from "vitest";
import { negotiateLocale } from "@/lib/i18n/negotiate";

describe("negotiateLocale", () => {
  it("picks the best supported language by q-value", () => {
    expect(negotiateLocale("it-IT,it;q=0.9,en;q=0.8", "en")).toBe("it");
    expect(negotiateLocale("es-MX,es;q=0.9", "en")).toBe("es");
    expect(negotiateLocale("de-AT,de;q=0.9,fr;q=0.5,en;q=0.7", "en")).toBe("de");
    expect(negotiateLocale("pt-BR,pt;q=0.9,fr;q=0.5,en;q=0.7", "es")).toBe("en");
    expect(negotiateLocale("en;q=0.2,fr-CA", "en")).toBe("fr");
  });

  it("falls back to the default for unsupported, empty or malformed headers", () => {
    expect(negotiateLocale("pt,ja", "fr")).toBe("fr");
    expect(negotiateLocale(null, "it")).toBe("it");
    expect(negotiateLocale(";;;,q=abc", "en")).toBe("en");
    expect(negotiateLocale("fr;q=0", "en")).toBe("en");
  });
});
