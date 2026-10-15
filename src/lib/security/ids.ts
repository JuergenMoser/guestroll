import { randomInt, randomUUID } from "node:crypto";

export const newId = (): string => randomUUID();

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** Lowercase, unambiguous characters: readable when someone has to type the URL by hand. */
export function randomToken(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/**
 * The QR code is the key to the event, so its URL must not be guessable from
 * the event name: 8 random chars over 31 symbols ≈ 40 bits.
 */
export function eventSlug(name: string): string {
  const base = slugify(name) || "event";
  return `${base}-${randomToken(8)}`;
}

export const SLUG_PATTERN = /^[a-z0-9-]{3,60}$/;
