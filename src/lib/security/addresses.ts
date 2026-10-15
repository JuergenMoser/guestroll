import "server-only";
import { lookup, type LookupAddress, type LookupOptions } from "node:dns";
import { BlockList, isIP } from "node:net";

// Addresses that are never "the internet": the host itself, the local network,
// cloud metadata (169.254.169.254) and the compose network the updater lives on.
const internalV4 = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  internalV4.addSubnet(net, prefix, "ipv4");
}

/** The eight 16-bit groups of an IPv6 address, a trailing dotted IPv4 included. */
function groups(address: string): number[] | null {
  let text = address.toLowerCase().split("%")[0];
  const dotted = text.match(/(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (dotted) {
    const b = dotted.split(".").map(Number);
    text = text.slice(0, -dotted.length) + `${((b[0] << 8) | b[1]).toString(16)}:${((b[2] << 8) | b[3]).toString(16)}`;
  }
  const [head, tail] = text.split("::");
  const parse = (part: string | undefined) => (part ? part.split(":").map((g) => parseInt(g, 16)) : []);
  const left = parse(head);
  const right = parse(tail);
  const out = tail === undefined ? left : [...left, ...Array(8 - left.length - right.length).fill(0), ...right];
  return out.length === 8 && out.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff) ? out : null;
}

const v4 = (hi: number, lo: number) => `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;

export function isInternalAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return internalV4.check(address, "ipv4");
  if (family !== 6) return true;
  const g = groups(address);
  if (!g) return true;
  const zeros = (n: number) => g.slice(0, n).every((x) => x === 0);
  // IPv4 in IPv6 clothing: URL() writes [::ffff:10.0.0.1] as ::ffff:a00:1, so it is
  // read from the groups, never from the text. Mapped, compatible, NAT64 and 6to4.
  if (zeros(5) && (g[5] === 0xffff || g[5] === 0)) return g[6] === 0 && g[7] <= 1 ? true : internalV4.check(v4(g[6], g[7]), "ipv4");
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) return internalV4.check(v4(g[6], g[7]), "ipv4");
  if (g[0] === 0x2002) return internalV4.check(v4(g[1], g[2]), "ipv4");
  // Unique local fc00::/7, link-local fe80::/10, multicast ff00::/8.
  return (g[0] & 0xfe00) === 0xfc00 || (g[0] & 0xffc0) === 0xfe80 || (g[0] & 0xff00) === 0xff00;
}

export class InternalAddressError extends Error {
  constructor(host: string) {
    super(`${host} is a private or local address (set WEBHOOK_ALLOW_PRIVATE=true to allow it)`);
  }
}

/** Throws for a URL whose host is written as an internal address (names are checked by `publicLookup`). */
export function assertPublicHost(url: URL): void {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && isInternalAddress(host)) throw new InternalAddressError(host);
}

/**
 * A `lookup` for http(s).request that refuses internal answers. The connection
 * uses the very addresses checked here: checking a name first and connecting
 * afterwards would let it change its answer in between (DNS rebinding).
 */
export function publicLookup(
  hostname: string,
  options: LookupOptions,
  callback: (error: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void,
): void {
  lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, "");
    if (addresses.length === 0 || addresses.some((a) => isInternalAddress(a.address))) return callback(new InternalAddressError(hostname), "");
    if (options.all) callback(null, addresses);
    else callback(null, addresses[0].address, addresses[0].family);
  });
}
