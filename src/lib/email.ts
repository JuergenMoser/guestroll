// Deliberately simple: the address only has to look deliverable; a typo just means no mail.
// Bounded on both sides and checked after the length: no input makes it backtrack for long.
const EMAIL = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,253}\.[a-z]{2,}$/i;

export function parseEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL.test(email) ? email : null;
}
