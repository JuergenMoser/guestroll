/** A photo prompt ("The dance floor", "The couple with a stranger") guests can pick before shooting. */
export interface Challenge {
  id: string;
  label: string;
}

export const MAX_CHALLENGES = 30;
export const MAX_CHALLENGE_LENGTH = 60;
const ID = /^[a-z0-9]{8}$/;

function newChallengeId(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** Reads the stored JSON; anything malformed reads as "no challenges" rather than breaking the page. */
export function readChallenges(json: string | null | undefined): Challenge[] {
  try {
    const value = JSON.parse(json ?? "[]");
    return Array.isArray(value) ? value.filter((c): c is Challenge => typeof c?.id === "string" && typeof c?.label === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Validates the list the admin sends. Existing ids are kept, so renaming a
 * challenge keeps its photos attached; new entries get an id here.
 */
export function parseChallenges(value: unknown): { ok: true; value: Challenge[] } | { ok: false; error: string } {
  if (!Array.isArray(value)) return { ok: false, error: "Expected a list" };
  if (value.length > MAX_CHALLENGES) return { ok: false, error: `At most ${MAX_CHALLENGES} challenges` };
  const out: Challenge[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const raw = typeof item === "string" ? { label: item } : (item as { id?: unknown; label?: unknown });
    const label = typeof raw?.label === "string" ? raw.label.replace(/[\u0000-\u001f\u007f]/g, "").trim() : "";
    if (!label) continue;
    if (label.length > MAX_CHALLENGE_LENGTH) return { ok: false, error: `At most ${MAX_CHALLENGE_LENGTH} characters per challenge` };
    let id = typeof raw.id === "string" && ID.test(raw.id) && !seen.has(raw.id) ? raw.id : newChallengeId();
    while (seen.has(id)) id = newChallengeId();
    seen.add(id);
    out.push({ id, label });
  }
  return { ok: true, value: out };
}
