import "server-only";
import { headers } from "next/headers";
import { config } from "@/lib/config";
import { readSetting, writeSetting } from "@/lib/settings";

const LAST_ORIGIN_KEY = "last_origin";
let lastOrigin: string | undefined;

/**
 * Absolute base URL for links that leave the browser (QR codes, share links).
 * `PUBLIC_URL` is authoritative; the request host is a convenience for local
 * setups and is only as trustworthy as the proxy in front of the app.
 */
export async function baseUrl(): Promise<string> {
  if (config.publicUrl) return config.publicUrl;
  const h = await headers();
  const host = (config.trustProxy && h.get("x-forwarded-host")) || h.get("host") || "localhost:3000";
  const proto = (config.trustProxy && h.get("x-forwarded-proto")) || (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const origin = `${proto}://${host}`;
  // Remembered for the scheduler, which builds links in emails without a request.
  if (origin !== lastOrigin) {
    lastOrigin = origin;
    try {
      writeSetting(LAST_ORIGIN_KEY, origin);
    } catch {}
  }
  return origin;
}

/** Base URL outside a request: PUBLIC_URL, else the last origin an admin used. */
export function backgroundBaseUrl(): string {
  return config.publicUrl || readSetting(LAST_ORIGIN_KEY) || "http://localhost:3000";
}

export async function eventUrl(slug: string): Promise<string> {
  return `${await baseUrl()}/e/${slug}`;
}
