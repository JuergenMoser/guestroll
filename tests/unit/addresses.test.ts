import { describe, expect, it } from "vitest";
import { assertPublicUrl, isInternalAddress } from "@/lib/security/addresses";

describe("internal addresses", () => {
  it("knows the host, the local network and cloud metadata", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.20.0.5", "192.168.1.10", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "::", "fd12:3456::1", "fe80::1", "::ffff:10.0.0.1", "::ffff:127.0.0.1"]) {
      expect(isInternalAddress(ip), ip).toBe(true);
    }
  });

  it("lets public addresses through", () => {
    for (const ip of ["1.1.1.1", "142.250.74.14", "172.32.0.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"]) {
      expect(isInternalAddress(ip), ip).toBe(false);
    }
  });

  it("checks URLs by their host, brackets and all", async () => {
    await expect(assertPublicUrl("http://127.0.0.1:9900/apply")).rejects.toThrow("WEBHOOK_ALLOW_PRIVATE");
    await expect(assertPublicUrl("http://[::1]/x")).rejects.toThrow();
    await expect(assertPublicUrl("http://169.254.169.254/latest/meta-data")).rejects.toThrow();
    await expect(assertPublicUrl("https://1.1.1.1/hook")).resolves.toBeUndefined();
  });
});
