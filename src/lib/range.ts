import type { ByteRange } from "@/lib/storage/driver";

/**
 * A `Range` header against a file of `size` bytes: `null` to send the whole
 * file (no header, or one we don't serve, like several ranges at once: the
 * spec lets a server ignore it), `"unsatisfiable"` for a 416.
 */
export function parseRange(header: string | null, size: number): ByteRange | null | "unsatisfiable" {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === "" && match[2] === "")) return null;
  const [first, last] = [match[1], match[2]];
  if (size === 0) return "unsatisfiable";
  if (first === "") {
    // `bytes=-500`: the last 500 bytes.
    const length = Number(last);
    if (length === 0) return "unsatisfiable";
    return { start: Math.max(size - length, 0), end: size - 1 };
  }
  const start = Number(first);
  if (start >= size) return "unsatisfiable";
  const end = last === "" ? size - 1 : Math.min(Number(last), size - 1);
  if (end < start) return null;
  return { start, end };
}
