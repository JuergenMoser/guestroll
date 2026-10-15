import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, hashRecoveryCode, hotp, newRecoveryCodes, newTotpSecret, otpauthUri, verifyTotp } from "@/lib/auth/totp";

// RFC 6238, appendix B: the SHA-1 seed "12345678901234567890", 8 digits.
const seed = Buffer.from("12345678901234567890");
const vectors: [number, string][] = [
  [59, "94287082"],
  [1111111109, "07081804"],
  [1111111111, "14050471"],
  [1234567890, "89005924"],
  [2000000000, "69279037"],
  [20000000000, "65353130"],
];

describe("TOTP", () => {
  it("matches the RFC 6238 test vectors", () => {
    for (const [seconds, code] of vectors) expect(hotp(seed, Math.floor(seconds / 30), 8)).toBe(code);
  });

  it("round-trips base32 the way authenticator apps write it", () => {
    expect(base32Encode(seed)).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    expect(base32Decode("gezd gnbv gy3t qojq gezd gnbv gy3t qojq")).toEqual(seed);
    expect(base32Decode(newTotpSecret())).toHaveLength(20);
    expect(() => base32Decode("not base32!")).toThrow();
  });

  it("accepts the current code and one step of drift, refuses older ones and replays", () => {
    const secret = base32Encode(seed);
    const now = 1_234_567_890_000;
    const step = Math.floor(now / 30_000);
    const code = (s: number) => hotp(seed, s);
    expect(verifyTotp(secret, code(step), now)).toBe(step);
    expect(verifyTotp(secret, code(step - 1), now)).toBe(step - 1);
    expect(verifyTotp(secret, code(step + 1), now)).toBe(step + 1);
    expect(verifyTotp(secret, code(step - 2), now)).toBeNull();
    expect(verifyTotp(secret, `${code(step).slice(0, 3)} ${code(step).slice(3)}`, now)).toBe(step);
    // Once used, the same step (and any before it) is refused.
    expect(verifyTotp(secret, code(step), now, step)).toBeNull();
    expect(verifyTotp(secret, "12345", now)).toBeNull();
    expect(verifyTotp(secret, "abcdef", now)).toBeNull();
  });

  it("writes an otpauth URI apps can scan, and single-use recovery codes", () => {
    const uri = new URL(otpauthUri("JBSWY3DPEHPK3PXP", "lea", "Guestroll"));
    expect(uri.protocol).toBe("otpauth:");
    expect(uri.host).toBe("totp");
    expect(decodeURIComponent(uri.pathname)).toBe("/Guestroll:lea");
    expect(uri.searchParams.get("issuer")).toBe("Guestroll");
    const codes = newRecoveryCodes();
    expect(new Set(codes).size).toBe(10);
    expect(codes[0]).toMatch(/^[a-z2-7]{4}-[a-z2-7]{4}$/);
    expect(hashRecoveryCode(codes[0].toUpperCase().replace("-", " "))).toBe(hashRecoveryCode(codes[0]));
  });
});
