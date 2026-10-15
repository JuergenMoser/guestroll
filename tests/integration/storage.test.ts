import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { StorageDriver } from "@/lib/storage/driver";
import { localDriver } from "@/lib/storage/local";
import { checkBucket, s3Driver } from "@/lib/storage/s3";

/**
 * One contract, every driver. The S3 half runs against a real server when
 * S3_TEST_ENDPOINT is set (CI starts MinIO; locally:
 * `docker run -p 9000:9000 minio/minio server /data`), and is skipped otherwise.
 */
async function collect(driver: StorageDriver, prefix?: string) {
  const out: { key: string; size: number }[] = [];
  for await (const item of driver.list(prefix)) out.push(item);
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

async function streamToBuffer(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function contract(name: string, make: () => Promise<{ driver: StorageDriver; cleanup: () => Promise<void> }>) {
  describe(name, () => {
    let driver: StorageDriver;
    let cleanup: () => Promise<void>;
    beforeAll(async () => ({ driver, cleanup } = await make()));
    afterAll(() => cleanup());

    it("writes a file from disk", async () => {
      const source = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "guestroll-src-")), "f.zip");
      fs.writeFileSync(source, "zip-bytes");
      await driver.putFile("backups/f.zip", source, "application/zip");
      expect((await driver.read("backups/f.zip"))?.toString()).toBe("zip-bytes");
    });

    it("writes, reads, streams and deletes", async () => {
      await driver.put("ev/a.thumb.webp", Buffer.from("hello"), "image/webp");
      expect((await driver.read("ev/a.thumb.webp"))?.toString()).toBe("hello");
      const opened = (await driver.open("ev/a.thumb.webp"))!;
      expect(opened.size).toBe(5);
      expect((await streamToBuffer(opened.stream)).toString()).toBe("hello");
      await driver.delete("ev/a.thumb.webp");
      expect(await driver.read("ev/a.thumb.webp")).toBeNull();
      expect(await driver.open("ev/a.thumb.webp")).toBeNull();
      await driver.delete("ev/never-existed.jpg");
    });

    it("overwrites in place", async () => {
      await driver.put("ev/logo.png", Buffer.from("one"), "image/png");
      await driver.put("ev/logo.png", Buffer.from("two!"), "image/png");
      expect((await driver.read("ev/logo.png"))?.toString()).toBe("two!");
    });

    it("lists and deletes by folder without touching its neighbours", async () => {
      await driver.put("keep/x.jpg", Buffer.from("x"), "image/jpeg");
      await driver.put("drop/y.jpg", Buffer.from("yy"), "image/jpeg");
      await driver.put("drop/sub/z.jpg", Buffer.from("zzz"), "image/jpeg");
      expect(await collect(driver, "drop/")).toEqual([
        { key: "drop/sub/z.jpg", size: 3 },
        { key: "drop/y.jpg", size: 2 },
      ]);
      await driver.deletePrefix("drop");
      expect(await collect(driver, "drop/")).toEqual([]);
      expect((await driver.read("keep/x.jpg"))?.toString()).toBe("x");
    });

    it("keeps keys with spaces and accents intact", async () => {
      await driver.put("ev/été 2026.jpg", Buffer.from("s"), "image/jpeg");
      expect((await collect(driver, "ev/")).map((i) => i.key)).toContain("ev/été 2026.jpg");
    });
  });
}

contract("local storage", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "guestroll-storage-"));
  return { driver: localDriver(dir), cleanup: async () => fs.rmSync(dir, { recursive: true, force: true }) };
});

it("local storage refuses keys that climb out of its folder", async () => {
  const driver = localDriver(fs.mkdtempSync(path.join(os.tmpdir(), "guestroll-storage-")));
  await expect(driver.put("../escape.txt", Buffer.from("x"), "text/plain")).rejects.toThrow();
  await expect(driver.read("../../etc/passwd")).rejects.toThrow();
  expect(await driver.capacity()).toMatchObject({ total: expect.any(Number), free: expect.any(Number) });
});

const endpoint = process.env.S3_TEST_ENDPOINT;
describe.runIf(endpoint)("S3", () => {
  const options = {
    endpoint: endpoint!,
    region: "us-east-1",
    bucket: process.env.S3_TEST_BUCKET ?? "guestroll-test",
    accessKeyId: process.env.S3_TEST_ACCESS_KEY ?? "minioadmin",
    secretAccessKey: process.env.S3_TEST_SECRET_KEY ?? "minioadmin",
    forcePathStyle: true,
  };

  contract("S3 storage", async () => {
    // Creates the bucket on a fresh server; "already exists" (409) is fine.
    const { AwsClient } = await import("aws4fetch");
    const admin = new AwsClient({ accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey, region: options.region, service: "s3" });
    await admin.fetch(`${options.endpoint}/${options.bucket}`, { method: "PUT" });
    const prefix = `run-${Date.now()}`;
    const driver = s3Driver({ ...options, prefix });
    await checkBucket(driver);
    return { driver, cleanup: async () => driver.deletePrefix("") };
  });

  it("uploads a large file in parts, and reads it back whole", async () => {
    const driver = s3Driver({ ...options, prefix: `multipart-${Date.now()}` });
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "guestroll-mp-")), "big.bin");
    const big = Buffer.alloc(20 * 1024 * 1024 + 123);
    for (let i = 0; i < big.length; i += 4096) big[i] = i % 251;
    fs.writeFileSync(file, big);
    await driver.putFile("big.bin", file, "application/octet-stream");
    const back = await driver.read("big.bin");
    expect(back?.length).toBe(big.length);
    expect(back?.equals(big)).toBe(true);
    await driver.deletePrefix("");
  });

  it("reports a wrong secret clearly", async () => {
    const driver = s3Driver({ ...options, prefix: "x", secretAccessKey: "wrong-secret" });
    await expect(checkBucket(driver)).rejects.toThrow(/403/);
  });
});
