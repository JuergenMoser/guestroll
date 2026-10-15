import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Structural locks: a new admin page or route that forgets its auth check fails
 * here instead of shipping. Next renders layouts and pages in parallel, so the
 * layout check alone is not enough.
 */
const root = path.resolve(__dirname, "../../src/app");

function files(dir: string, name: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return files(full, name);
    return entry.name === name ? [full] : [];
  });
}

const rel = (file: string) => path.relative(root, file);

describe("admin guards", () => {
  it("every admin page except login checks the session itself", () => {
    const pages = files(path.join(root, "admin"), "page.tsx").filter((f) => !f.includes(`${path.sep}login${path.sep}`));
    expect(pages.length).toBeGreaterThan(5);
    for (const page of pages) expect(fs.readFileSync(page, "utf8"), rel(page)).toMatch(/await require(Event)?AdminPage\(/);
  });

  it("every admin API route except login/logout calls requireAdmin", () => {
    const routes = files(path.join(root, "api/admin"), "route.ts").filter((f) => !/login|logout/.test(f));
    expect(routes.length).toBeGreaterThan(5);
    for (const route of routes) {
      const source = fs.readFileSync(route, "utf8");
      const handlers = source.match(/export async function (GET|POST|PATCH|DELETE|PUT)/g) ?? [];
      const guards = source.match(/await require(Event)?Admin\(request[,)]/g) ?? [];
      expect(guards.length, rel(route)).toBe(handlers.length);
    }
  });

  it("routes under an event id check the admin's scope, not just the session", () => {
    const routes = files(path.join(root, "api/admin/events/[id]"), "route.ts");
    expect(routes.length).toBeGreaterThan(5);
    for (const route of routes) {
      const source = fs.readFileSync(route, "utf8");
      expect(source, rel(route)).not.toMatch(/await requireAdmin\(request/);
      // Loading the event from the URL is requireEventAdmin's job: doing it again means bypassing it.
      expect(source, rel(route)).not.toContain("getEventById((await params)");
    }
  });

  it("instance-wide routes are for owners only", () => {
    for (const dir of ["api/admin/mail", "api/admin/accounts"]) {
      for (const route of files(path.join(root, dir), "route.ts")) {
        const source = fs.readFileSync(route, "utf8");
        const handlers = source.match(/export async function (GET|POST|PATCH|DELETE|PUT)/g) ?? [];
        const owner = source.match(/requireAdmin\(request, \{ owner: true \}\)/g) ?? [];
        expect(owner.length, rel(route)).toBe(handlers.length);
      }
    }
  });

  it("every guest mutation checks the request origin", () => {
    const routes = files(path.join(root, "api/e"), "route.ts");
    for (const route of routes) {
      const source = fs.readFileSync(route, "utf8");
      if (source.includes("export async function POST")) expect(source, rel(route)).toContain("isSameOrigin(request)");
    }
  });
});
