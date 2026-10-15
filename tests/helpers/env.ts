import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { vi } from "vitest";

/**
 * Points DATA_DIR at a fresh temporary folder and reloads every module, so
 * config, the database and the rate limiters start from scratch. Returns the
 * folder and a cleanup function for afterEach.
 */
export async function freshEnv(extra: Record<string, string> = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "guestroll-test-"));
  vi.resetModules();
  // Module-level singletons live on globalThis to survive dev reloads: clear them too.
  const g = globalThis as Record<string, unknown>;
  delete g.guestrollDb;
  delete g.guestrollLimiters;
  delete g.guestrollUploadLocks;
  delete g.guestrollStorage;
  vi.stubEnv("DATA_DIR", dir);
  vi.stubEnv("ADMIN_PASSWORD", "test-admin-password");
  for (const [key, value] of Object.entries(extra)) vi.stubEnv(key, value);
  return {
    dir,
    cleanup() {
      vi.unstubAllEnvs();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}
