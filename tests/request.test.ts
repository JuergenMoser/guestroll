import { afterEach, describe, expect, it, vi } from "vitest";

async function load(trustProxy: boolean) {
  vi.resetModules();
  vi.stubEnv("TRUST_PROXY", trustProxy ? "true" : "false");
  return import("@/lib/security/request");
}

const req = (headers: Record<string, string>, body?: BodyInit) =>
  new Request("http://localhost/api", { method: "POST", headers, body, duplex: "half" } as RequestInit);

afterEach(() => vi.unstubAllEnvs());

describe("clientIp", () => {
  it("ignores forwarded headers unless a proxy is trusted", async () => {
    const { clientIp } = await load(false);
    expect(clientIp(req({ "x-forwarded-for": "1.2.3.4" }))).toBe("direct");
  });

  it("takes the proxy-appended (last) address, not the client-supplied first one", async () => {
    const { clientIp } = await load(true);
    expect(clientIp(req({ "x-forwarded-for": "6.6.6.6, 1.2.3.4" }))).toBe("1.2.3.4");
  });
});

describe("isSameOrigin", () => {
  it("accepts a matching origin and rejects a missing or foreign one", async () => {
    const { isSameOrigin } = await load(false);
    expect(isSameOrigin(req({ origin: "http://app.test", host: "app.test" }))).toBe(true);
    expect(isSameOrigin(req({ origin: "http://evil.test", host: "app.test" }))).toBe(false);
    expect(isSameOrigin(req({ host: "app.test" }))).toBe(false);
  });

  it("only honours x-forwarded-host behind a trusted proxy", async () => {
    const untrusted = await load(false);
    expect(untrusted.isSameOrigin(req({ origin: "http://evil.test", host: "app.test", "x-forwarded-host": "evil.test" }))).toBe(false);
    const trusted = await load(true);
    expect(trusted.isSameOrigin(req({ origin: "https://photos.test", host: "node:3000", "x-forwarded-host": "photos.test" }))).toBe(true);
  });
});

describe("readBodyCapped", () => {
  it("rejects a declared length above the cap without reading", async () => {
    const { readBodyCapped, BodyTooLargeError } = await load(false);
    await expect(readBodyCapped(req({ "content-length": "100" }, "x"), 10)).rejects.toBeInstanceOf(BodyTooLargeError);
  });

  it("stops a streamed body that exceeds the cap", async () => {
    const { readBodyCapped, BodyTooLargeError } = await load(false);
    const stream = new ReadableStream({
      start(controller) {
        for (let i = 0; i < 5; i++) controller.enqueue(new Uint8Array(4));
        controller.close();
      },
    });
    await expect(readBodyCapped(req({}, stream), 10)).rejects.toBeInstanceOf(BodyTooLargeError);
    expect((await readBodyCapped(req({}, "hello"), 10)).byteLength).toBe(5);
  });
});
