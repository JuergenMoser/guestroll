import { config } from "@/lib/config";

export function clientIp(request: Request): string {
  if (config.trustProxy) {
    // The proxy appends the address it saw, so only the LAST entry is trustworthy:
    // anything before it was sent by the client and can be forged at will.
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",").at(-1)!.trim();
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
  const host = (config.trustProxy && request.headers.get("x-forwarded-host")) || request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export class BodyTooLargeError extends Error {}

/**
 * Reads the body while counting bytes, aborting past `maxBytes`. `Content-Length`
 * alone is not enough: a chunked request doesn't send one, and `formData()`
 * would otherwise buffer whatever the client streams.
 */
export async function readBodyCapped(request: Request, maxBytes: number): Promise<Uint8Array<ArrayBuffer>> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new BodyTooLargeError();
  if (!request.body) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new BodyTooLargeError();
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}
