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
  // Public by design: signing in, and accepting an invitation (no account yet). The
  // invitation route is locked by its single-use token instead, tested below.
  const PUBLIC = (f: string) => f.includes(`${path.sep}login${path.sep}`) || f.includes(`${path.sep}invite${path.sep}`);

  it("every admin page except login and invitations checks the session itself", () => {
    const pages = files(path.join(root, "admin"), "page.tsx").filter((f) => !PUBLIC(f));
    expect(pages.length).toBeGreaterThan(5);
    for (const page of pages) expect(fs.readFileSync(page, "utf8"), rel(page)).toMatch(/await require(Event)?AdminPage\(/);
  });

  it("every admin API route except login/logout and invitation acceptance calls requireAdmin", () => {
    const routes = files(path.join(root, "api/admin"), "route.ts").filter(
      (f) => !/login|logout/.test(f) && !f.includes(`${path.sep}invite${path.sep}`) && !f.includes(`api${path.sep}admin${path.sep}oidc${path.sep}`),
    );
    expect(routes.length).toBeGreaterThan(5);
    for (const route of routes) {
      const source = fs.readFileSync(route, "utf8");
      const handlers = source.match(/export async function (GET|POST|PATCH|DELETE|PUT)/g) ?? [];
      const guards = source.match(/await require(Event)?Admin\(request[,)]/g) ?? [];
      expect(guards.length, rel(route)).toBe(handlers.length);
    }
  });

  it("linking an identity asks for the password and the second factor again", () => {
    const route = fs.readFileSync(path.join(root, "api/admin/me/oidc/route.ts"), "utf8");
    expect(route).toContain("verifyAccountPassword(account, password)");
    expect(route).toContain("checkSecondFactor(account");
    // Only that route sets up a link: the sign-in start never does.
    expect(fs.readFileSync(path.join(root, "api/admin/oidc/start/route.ts"), "utf8")).toContain("linkAccountId: undefined");
  });

  it("single sign-on only signs in with the state this browser holds", () => {
    const callback = fs.readFileSync(path.join(root, "api/admin/oidc/callback/route.ts"), "utf8");
    expect(callback).toContain("same(state, expected.state)");
    expect(callback).toContain("oidc.destroy()");
    expect(callback).toContain("hasTwoFactor(account)");
  });

  it("invitation acceptance checks the origin, its token and the demo mode", () => {
    const source = fs.readFileSync(path.join(root, "api/admin/invite/[token]/route.ts"), "utf8");
    expect(source).toContain("if (!isSameOrigin(request))");
    expect(source).toContain("acceptInvitation(");
    expect(source).toContain("config.demo.enabled");
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
    for (const dir of ["api/admin/mail", "api/admin/accounts", "api/admin/invitations", "api/admin/cloud", "api/admin/webhooks", "api/admin/backup", "api/admin/updates"]) {
      for (const route of files(path.join(root, dir), "route.ts")) {
        const source = fs.readFileSync(route, "utf8");
        const handlers = source.match(/export async function (GET|POST|PATCH|DELETE|PUT)/g) ?? [];
        const owner = source.match(/requireAdmin\(request, \{ owner: true[ ,}]/g) ?? [];
        expect(owner.length, rel(route)).toBe(handlers.length);
      }
    }
  });

  it("routes a public demo must not serve declare it themselves", () => {
    // Declared per route rather than matched on the URL: no path spelling slips past.
    for (const dir of ["api/admin/mail", "api/admin/webhooks", "api/admin/accounts", "api/admin/invitations", "api/admin/cloud", "api/admin/backup/run", "api/admin/backup/retention", "api/admin/backup/schedule", "api/admin/backup/restore", "api/admin/backup/stored", "api/admin/updates/check", "api/admin/updates/apply", "api/admin/password", "api/admin/me/two-factor"]) {
      for (const route of files(path.join(root, dir), "route.ts")) {
        const source = fs.readFileSync(route, "utf8");
        const handlers = source.match(/export async function (GET|POST|PATCH|DELETE|PUT)/g) ?? [];
        const marked = source.match(/notInDemo: true/g) ?? [];
        expect(marked.length, rel(route)).toBe(handlers.length);
      }
    }
  });

  it("every guest and gallery-link mutation checks the request origin", () => {
    const routes = [...files(path.join(root, "api/e"), "route.ts"), ...files(path.join(root, "api/g"), "route.ts")];
    for (const route of routes) {
      const source = fs.readFileSync(route, "utf8");
      // Each handler checks it itself, or calls a helper of the same file that does.
      const blocks = source.split(/(?=^(?:export )?(?:async )?function )/m);
      const checking = blocks.filter((b) => b.includes("isSameOrigin(request)")).map((b) => b.match(/function (\w+)/)?.[1]);
      for (const block of blocks.filter((b) => /^export async function (POST|PATCH|PUT|DELETE)\b/.test(b))) {
        const ok = checking.some((name) => name && (block.match(/function (\w+)/)?.[1] === name || block.includes(`${name}(`)));
        expect(ok, `${rel(route)} ${block.match(/function (\w+)/)?.[1]}`).toBe(true);
      }
    }
  });
});
