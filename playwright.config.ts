import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3210);
// A fresh data folder per run: the suite never touches a developer's data.
const DATA_DIR = path.join(os.tmpdir(), `guestroll-e2e-${Date.now()}`);
export const ADMIN_PASSWORD = "e2e-admin-password";
// The SMTP sink started by tests/e2e/api/mail.spec.ts.
export const SMTP_PORT = Number(process.env.E2E_SMTP_PORT ?? 2626);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    // Locally, the installed Chrome; in CI, the Chromium installed by `npx playwright install`.
    channel: process.env.CI ? undefined : "chrome",
  },
  projects: [
    { name: "api", testMatch: /api\/.*\.spec\.ts/ },
    { name: "desktop", testMatch: /browser\/admin.*\.spec\.ts/, use: { ...devices["Desktop Chrome"], channel: process.env.CI ? undefined : "chrome" } },
    { name: "mobile", testMatch: /browser\/guest.*\.spec\.ts/, use: { ...devices["Pixel 7"], channel: process.env.CI ? undefined : "chrome" } },
  ],
  webServer: {
    command: "node scripts/start.mjs",
    url: `http://127.0.0.1:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
      DATA_DIR,
      ADMIN_PASSWORD,
      SECURE_COOKIES: "false",
      DEFAULT_LOCALE: "en",
      // Generous limits: the suite fires many requests from one IP.
      RATE_LIMIT_UPLOADS_PER_MINUTE: "200",
      RATE_LIMIT_UNLOCK_PER_MINUTE: "50",
      RATE_LIMIT_LOGIN_PER_MINUTE: "50",
      // Small, so the size limit can be tested without sending 25 MB.
      MAX_UPLOAD_MB: "2",
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: String(SMTP_PORT),
      SMTP_FROM: "Guestroll <photos@example.test>",
      ADMIN_EMAIL: "host@example.test",
      PUBLIC_URL: `http://127.0.0.1:${PORT}`,
    },
  },
});
