// Starts the production build (`npm run build` first) without Docker: copies the
// static assets and migrations next to the standalone server, then runs it.
// Every environment variable is passed through (PORT, DATA_DIR, ADMIN_PASSWORD…).
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildDir = process.env.GUESTROLL_BUILD_DIR || ".next";
const standalone = path.join(root, buildDir, "standalone");
if (!fs.existsSync(path.join(standalone, "server.js"))) {
  console.error("No production build found: run `npm run build` first.");
  process.exit(1);
}

fs.cpSync(path.join(root, buildDir, "static"), path.join(standalone, buildDir, "static"), { recursive: true });
fs.cpSync(path.join(root, "drizzle"), path.join(standalone, "drizzle"), { recursive: true });
if (fs.existsSync(path.join(root, "public"))) fs.cpSync(path.join(root, "public"), path.join(standalone, "public"), { recursive: true });
if (fs.existsSync(path.join(root, "assets"))) fs.cpSync(path.join(root, "assets"), path.join(standalone, "assets"), { recursive: true });

const env = { ...process.env, DATA_DIR: path.resolve(process.env.DATA_DIR ?? path.join(root, "data")) };
const server = spawn(process.execPath, ["server.js"], { cwd: standalone, env, stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
server.on("exit", (code) => process.exit(code ?? 0));
