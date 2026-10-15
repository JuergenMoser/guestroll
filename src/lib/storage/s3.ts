import "server-only";
import { Readable } from "node:stream";
import { AwsClient } from "aws4fetch";
import type { StorageDriver } from "./driver";

export interface S3Options {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  prefix: string;
  forcePathStyle: boolean;
}

export class S3Error extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const decodeXml = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

/**
 * S3 through signed `fetch` calls (aws4fetch, no SDK): the handful of
 * operations the app uses are plain HTTP, and the full AWS SDK would add
 * megabytes and a long tail of dependencies to the image.
 */
export function s3Driver(options: S3Options): StorageDriver {
  const client = new AwsClient({ accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey, region: options.region, service: "s3" });
  const endpoint = new URL(options.endpoint);
  const base = options.forcePathStyle
    ? `${endpoint.origin}/${options.bucket}`
    : `${endpoint.protocol}//${options.bucket}.${endpoint.host}`;
  const fullKey = (key: string) => (options.prefix ? `${options.prefix}/${key}` : key);
  const url = (key: string) => `${base}/${fullKey(key).split("/").map(encodeURIComponent).join("/")}`;

  async function call(input: string, init?: RequestInit & { allow404?: boolean }): Promise<Response> {
    const res = await client.fetch(input, init);
    if (res.ok || (init?.allow404 && res.status === 404)) return res;
    const body = await res.text().catch(() => "");
    const code = /<Code>([^<]+)<\/Code>/.exec(body)?.[1];
    throw new S3Error(res.status, `S3 ${init?.method ?? "GET"} failed: ${res.status}${code ? ` ${code}` : ""}`);
  }

  async function* listRaw(prefix: string): AsyncIterable<{ key: string; size: number }> {
    let token: string | undefined;
    do {
      const query = new URLSearchParams({ "list-type": "2", prefix: fullKey(prefix), "max-keys": "1000" });
      if (token) query.set("continuation-token", token);
      const xml = await (await call(`${base}?${query}`)).text();
      for (const [, block] of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
        const key = decodeXml(/<Key>([\s\S]*?)<\/Key>/.exec(block)?.[1] ?? "");
        const size = Number(/<Size>(\d+)<\/Size>/.exec(block)?.[1] ?? 0);
        yield { key: options.prefix ? key.slice(options.prefix.length + 1) : key, size };
      }
      token = /<IsTruncated>true<\/IsTruncated>/.test(xml) ? decodeXml(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/.exec(xml)?.[1] ?? "") : undefined;
    } while (token);
  }

  const driver: StorageDriver = {
    name: "s3",
    async put(key, body, contentType) {
      await call(url(key), { method: "PUT", body: new Uint8Array(body), headers: { "Content-Type": contentType, "Content-Length": String(body.length) } });
    },
    async read(key) {
      const res = await call(url(key), { allow404: true });
      return res.status === 404 ? null : Buffer.from(await res.arrayBuffer());
    },
    async open(key) {
      const res = await call(url(key), { allow404: true });
      if (res.status === 404 || !res.body) return null;
      return { stream: Readable.fromWeb(res.body as import("node:stream/web").ReadableStream), size: Number(res.headers.get("content-length") ?? 0) };
    },
    async delete(key) {
      await call(url(key), { method: "DELETE", allow404: true });
    },
    async deletePrefix(prefix) {
      // One DELETE per object: DeleteObjects needs a Content-MD5 some S3 clones
      // compute differently, and deleting an event isn't a hot path.
      const keys: string[] = [];
      for await (const item of listRaw(prefix ? `${prefix}/` : "")) keys.push(item.key);
      for (let i = 0; i < keys.length; i += 16) await Promise.all(keys.slice(i, i + 16).map((k) => driver.delete(k)));
    },
    list(prefix = "") {
      return listRaw(prefix);
    },
    async capacity() {
      return null;
    },
  };
  return driver;
}

/** Fails loudly at startup instead of on the first upload. */
export async function checkBucket(driver: StorageDriver): Promise<void> {
  const probe = `.guestroll-probe-${Date.now()}`;
  await driver.put(probe, Buffer.from("ok"), "text/plain");
  const back = await driver.read(probe);
  await driver.delete(probe);
  if (back?.toString() !== "ok") throw new Error("S3 bucket answered, but a written file couldn't be read back");
}
