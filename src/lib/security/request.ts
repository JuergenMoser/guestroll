import { config } from "@/lib/config";

export function clientIp(request: Request): string {
  if (config.trustProxy) {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    const real = request.headers.get("x-real-ip");
    if (real) return real.trim();
  }
  // Without a trusted proxy, forwarded headers are attacker-controlled: ignoring
  // them means a spoofed header can't buy a fresh quota. Limits that must not
  // be shared by a whole party also key on the guest cookie.
  return "direct";
}

/**
 * CSRF guard for cookie-authenticated mutations. Browsers always send `Origin`
 * on cross-site POST/PATCH/DELETE, so a mismatch means another site is driving
 * the request with our cookies.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
