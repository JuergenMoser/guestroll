import { describe, expect, it } from "vitest";
import { assertPublicHost, isInternalAddress, publicLookup } from "@/lib/security/addresses";

describe("internal addresses", () => {
  it("knows the host, the local network and cloud metadata", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.20.0.5", "192.168.1.10", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "::", "fd12:3456::1", "fe80::1", "ff02::1"]) {
      expect(isInternalAddress(ip), ip).toBe(true);
    }
  });

  it("sees IPv4 hidden inside IPv6, in every spelling", () => {
    // URL() turns [::ffff:10.0.0.1] into ::ffff:a00:1: matching the dotted text missed it.
    for (const ip of ["::ffff:10.0.0.1", "::ffff:a00:1", "::ffff:7f00:1", "0:0:0:0:0:ffff:a9fe:a9fe", "::10.0.0.1", "64:ff9b::a00:1", "64:ff9b::127.0.0.1", "2002:a00:1::1", "2002:7f00:1::"]) {
      expect(isInternalAddress(ip), ip).toBe(true);
    }
    for (const ip of ["::ffff:8.8.8.8", "::ffff:808:808", "64:ff9b::808:808", "2002:808:808::1"]) {
      expect(isInternalAddress(ip), ip).toBe(false);
    }
  });

  it("lets public addresses through", () => {
    for (const ip of ["1.1.1.1", "142.250.74.14", "172.32.0.1", "2606:4700:4700::1111"]) {
      expect(isInternalAddress(ip), ip).toBe(false);
    }
  });

  it("refuses internal hosts written in a URL, however they are spelled", () => {
    for (const url of ["http://127.0.0.1:9900/apply", "http://[::1]/x", "http://169.254.169.254/latest", "http://[::ffff:10.0.0.1]/", "http://0x7f.1/", "http://2130706433/"]) {
      expect(() => assertPublicHost(new URL(url)), url).toThrow("WEBHOOK_ALLOW_PRIVATE");
    }
    expect(() => assertPublicHost(new URL("https://1.1.1.1/hook"))).not.toThrow();
    expect(() => assertPublicHost(new URL("https://ntfy.sh/topic"))).not.toThrow();
  });

  it("refuses a name that resolves to an internal address, at connection time", async () => {
    const error = await new Promise((resolve) => publicLookup("localhost", {}, (err) => resolve(err)));
    expect(String(error)).toContain("WEBHOOK_ALLOW_PRIVATE");
  });
});
