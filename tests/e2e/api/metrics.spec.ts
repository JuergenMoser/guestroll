import { expect, test } from "@playwright/test";
import { client } from "../helpers";

test.describe("metrics", () => {
  test("answer Prometheus with the token, and look missing to everyone else", async ({ baseURL }) => {
    const api = await client(baseURL!);
    expect((await api.get("/api/metrics")).status()).toBe(404);
    expect((await api.get("/api/metrics", { headers: { Authorization: "Bearer wrong-token-0123456789x" } })).status()).toBe(404);
    const res = await api.get("/api/metrics", { headers: { Authorization: "Bearer e2e-metrics-token-0123456789" } });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/plain; version=0.0.4");
    const text = await res.text();
    expect(text).toContain("# TYPE guestroll_events gauge");
    expect(text).toMatch(/^guestroll_uptime_seconds \d+$/m);
  });
});
