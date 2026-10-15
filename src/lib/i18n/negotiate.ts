import { LOCALES, type Locale } from "@/lib/constants";

/**
 * Picks the first supported language from an Accept-Language header, honouring
 * q-values. Guests at an international wedding each get their own language
 * without anyone configuring anything.
 */
export function negotiateLocale(header: string | null, fallback: Locale): Locale {
  if (!header) return fallback;
  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q.slice(2)) : 1, index };
    })
    .filter((entry) => entry.lang && Number.isFinite(entry.q) && entry.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  return (ranked.find((entry) => (LOCALES as readonly string[]).includes(entry.lang))?.lang as Locale) ?? fallback;
}
