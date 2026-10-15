import "server-only";
import { headers } from "next/headers";
import { config } from "@/lib/config";

/**
 * Absolute base URL for links that leave the browser (QR codes, share links).
 * `PUBLIC_URL` is authoritative; the request host is a convenience for local
 * setups and is only as trustworthy as the proxy in front of the app.
 */
export async function baseUrl(): Promise<string> {
  if (config.publicUrl) return config.publicUrl;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function eventUrl(slug: string): Promise<string> {
  return `${await baseUrl()}/e/${slug}`;
}
