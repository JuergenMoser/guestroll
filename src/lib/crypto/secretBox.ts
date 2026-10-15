import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { sessionSecret } from "@/lib/auth/secret";

/**
 * Encrypts secrets kept in the database (the SMTP password typed in the admin)
 * with AES-256-GCM. The key derives from the session secret, so a copied
 * database alone doesn't reveal them. Format: v1.<iv>.<tag>.<ciphertext>, base64url.
 */
function key(): Buffer {
  return Buffer.from(hkdfSync("sha256", sessionSecret(), "guestroll", "secret-box-v1", 32));
}

export function seal(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), body].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

/** Returns null when the value was tampered with or sealed with another secret. */
export function open(sealed: string): string | null {
  const [version, iv, tag, body] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || body === undefined) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
