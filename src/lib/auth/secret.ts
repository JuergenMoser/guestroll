import "server-only";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { config } from "@/lib/config";

let cached: string | undefined;

/**
 * `SESSION_SECRET` wins when set. Otherwise a secret is generated once and kept
 * in the data volume, so `docker run` works with zero configuration and sessions
 * still survive restarts.
 */
export function sessionSecret(): string {
  if (cached) return cached;

  if (config.sessionSecret) {
    if (config.sessionSecret.length < 32) {
      throw new Error("SESSION_SECRET must be at least 32 characters long");
    }
    cached = config.sessionSecret;
    return cached;
  }

  fs.mkdirSync(config.dataDir, { recursive: true });
  try {
    cached = fs.readFileSync(config.secretFile, "utf8").trim();
  } catch {
    cached = randomBytes(48).toString("base64url");
    // `wx` fails if another worker wrote it first; re-read theirs instead of overwriting.
    try {
      fs.writeFileSync(config.secretFile, cached, { mode: 0o600, flag: "wx" });
    } catch {
      cached = fs.readFileSync(config.secretFile, "utf8").trim();
    }
  }
  return cached;
}

/** After a restore wrote another instance's secret file: read it again on next use. */
export function forgetSessionSecret(): void {
  cached = undefined;
}
