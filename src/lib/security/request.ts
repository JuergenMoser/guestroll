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
/** The server holds too many uploads in memory right now: ask the client to retry. */
export class ServerBusyError extends Error {}

/**
 * Bytes of request bodies held in memory at once, across all requests. Counted
 * as they arrive, so a connection trickling its upload in costs next to nothing,
 * while a burst of fast ones reaches the ceiling and is turned away. Counting
 * connections instead let a few deliberately slow ones block every guest;
 * counting nothing let a burst of 25 MB bodies exhaust the memory.
 */
export class MemoryBudget {
  private used = 0;
  constructor(private readonly limit: number) {}

  /** One request's share, given back with `release()` once its body is no longer needed. */
  hold() {
    let held = 0;
    return {
      take: (bytes: number) => {
        if (this.used + bytes > this.limit) return false;
        this.used += bytes;
        held += bytes;
        return true;
      },
      release: () => {
        this.used -= held;
        held = 0;
      },
    };
  }
}

export type MemoryHold = ReturnType<MemoryBudget["hold"]>;

// Long enough for a phone's compressed photo over a weak 4G (a few MB), short
// enough that a client sending most of a body and then stalling gives its share
// of the memory budget back: without it, ten of them held the budget forever.
const BUDGETED_READ_MS = 120_000;

export async function readBodyCapped(request: Request, maxBytes: number, hold?: MemoryHold): Promise<Uint8Array<ArrayBuffer>> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new BodyTooLargeError();
  if (!request.body) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = hold
    ? new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new ServerBusyError("Upload too slow")), BUDGETED_READ_MS);
      })
    : null;
  try {
    for (;;) {
      const { done, value } = deadline ? await Promise.race([reader.read(), deadline]) : await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new BodyTooLargeError();
      // Three copies live at once on the upload path: the chunks, the parsed form, the file's buffer.
      if (hold && !hold.take(value.byteLength * 3)) throw new ServerBusyError();
      chunks.push(value);
    }
  } catch (error) {
    // The caller releases the hold; dropping the stream ends the slow client's request.
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    clearTimeout(timer);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}
