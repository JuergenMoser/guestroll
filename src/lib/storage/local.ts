import "server-only";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import type { StorageDriver } from "./driver";

export function localDriver(root: string): StorageDriver {
  const resolve = (key: string) => {
    const file = path.resolve(/*turbopackIgnore: true*/ root, key);
    // Defence in depth: keys come from keys.ts, but a key must never leave the root.
    if (!file.startsWith(path.resolve(/*turbopackIgnore: true*/ root) + path.sep)) throw new Error("Invalid storage key");
    return file;
  };

  async function* walk(dir: string): AsyncIterable<{ key: string; size: number }> {
    const entries = await fsp.readdir(/*turbopackIgnore: true*/ dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) yield* walk(full);
      else if (entry.isFile() && !entry.name.endsWith(".tmp")) {
        const stat = await fsp.stat(/*turbopackIgnore: true*/ full);
        yield { key: path.relative(root, full).split(path.sep).join("/"), size: stat.size };
      }
    }
  }

  return {
    name: "local",
    async put(key, body) {
      const file = resolve(key);
      await fsp.mkdir(path.dirname(file), { recursive: true });
      // Write then rename: a reader never sees a half-written file.
      const tmp = `${file}.${process.pid}.tmp`;
      await fsp.writeFile(/*turbopackIgnore: true*/ tmp, body, { mode: 0o640 });
      await fsp.rename(tmp, file);
    },
    async putFile(key, source) {
      const file = resolve(key);
      await fsp.mkdir(path.dirname(file), { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      await fsp.copyFile(/*turbopackIgnore: true*/ source, tmp);
      await fsp.rename(tmp, file);
    },
    async read(key) {
      return fsp.readFile(/*turbopackIgnore: true*/ resolve(key)).catch(() => null);
    },
    async open(key, range) {
      const file = resolve(key);
      const stat = await fsp.stat(/*turbopackIgnore: true*/ file).catch(() => null);
      if (!stat?.isFile()) return null;
      if (range) return { stream: fs.createReadStream(/*turbopackIgnore: true*/ file, range), size: range.end - range.start + 1 };
      return { stream: fs.createReadStream(/*turbopackIgnore: true*/ file), size: stat.size };
    },
    async delete(key) {
      await fsp.rm(resolve(key), { force: true });
    },
    async deletePrefix(prefix) {
      await fsp.rm(resolve(prefix), { recursive: true, force: true });
    },
    list(prefix = "") {
      return walk(prefix ? resolve(prefix) : root);
    },
    async capacity() {
      const disk = await fsp.statfs(/*turbopackIgnore: true*/ root).catch(() => null);
      if (!disk || disk.blocks === 0) return null;
      return { total: disk.blocks * disk.bsize, free: disk.bavail * disk.bsize };
    },
  };
}
