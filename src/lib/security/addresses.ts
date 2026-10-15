import "server-only";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

// Addresses that are never "the internet": the host itself, the local network,
// cloud metadata (169.254.169.254) and the compose network the updater lives on.
const internal = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  internal.addSubnet(net, prefix, "ipv4");
}
for (const [net, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  internal.addSubnet(net, prefix, "ipv6");
}

export function isInternalAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) return true;
  // ::ffff:10.0.0.1 is 10.0.0.1 in IPv6 clothing.
  const mapped = family === 6 ? address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1] : undefined;
  if (mapped) return internal.check(mapped, "ipv4");
  return internal.check(address, family === 4 ? "ipv4" : "ipv6");
}

export class InternalAddressError extends Error {}

/**
 * Refuses a URL whose host is, or resolves to, an internal address. Checked
 * before connecting, so a name that changes its answer between this lookup
 * and the connection (DNS rebinding) is not covered: this keeps an owner's
 * webhook from probing the server's own network, it is not a sandbox.
 */
export async function assertPublicUrl(url: string): Promise<void> {
  const host = new URL(url).hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address);
  if (addresses.length === 0 || addresses.some(isInternalAddress)) {
    throw new InternalAddressError(`${host} is a private or local address (set WEBHOOK_ALLOW_PRIVATE=true to allow it)`);
  }
}
