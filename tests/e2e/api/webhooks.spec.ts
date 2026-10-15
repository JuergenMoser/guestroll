import { createHmac } from "node:crypto";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { expect, test } from "@playwright/test";
import { admin, client, createEvent } from "../helpers";

// A real HTTP endpoint the app posts to.
const received: { headers: http.IncomingHttpHeaders; body: string }[] = [];
let server: http.Server;
let url = "";

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      received.push({ headers: req.headers, body });
      res.writeHead(req.url === "/broken" ? 500 : 204).end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
test.afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

test.describe("webhooks", () => {
  test("the test button posts a signed notice, and reports a service's refusal", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const created = await host.post("/api/admin/webhooks", { data: { name: "HA", type: "json", url: `${url}/hook`, secret: "shh", kinds: ["guestbook_message"] } });
    expect(created.status()).toBe(201);
    const { webhook } = await created.json();
    expect(webhook.urlHint).toBe(`${url}/…`);

    expect((await (await host.post(`/api/admin/webhooks/${webhook.id}/test`)).json()).ok).toBe(true);
    const last = received.at(-1)!;
    expect(JSON.parse(last.body)).toMatchObject({ kind: "test" });
    expect(last.headers["x-guestroll-signature"]).toBe(`sha256=${createHmac("sha256", "shh").update(last.body).digest("hex")}`);

    const broken = await (await host.post("/api/admin/webhooks", { data: { name: "Broken", type: "json", url: `${url}/broken`, kinds: [] } })).json();
    const res = await host.post(`/api/admin/webhooks/${broken.webhook.id}/test`);
    expect(res.status()).toBe(502);
    expect((await res.json()).message).toContain("500");
  });

  test("a guestbook message is queued for subscribed webhooks", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host, { guestbookEnabled: true });
    const guest = await client(baseURL!);
    await guest.post(`/api/e/${event.slug}/join`);
    await guest.post(`/api/e/${event.slug}/messages`, { multipart: { text: "Hello hosts" } });
    const { deliveries } = await (await host.get("/api/admin/webhooks")).json();
    expect(deliveries.some((d: { kind: string }) => d.kind === "guestbook_message")).toBe(true);
  });

  test("are for owners, with sealed secrets", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const { webhooks } = await (await host.get("/api/admin/webhooks")).json();
    expect(JSON.stringify(webhooks)).not.toContain("shh");
    expect((await host.post("/api/admin/webhooks", { data: { name: "x", type: "json", url: "file:///etc/passwd", kinds: [] } })).status()).toBe(400);
    const anon = await client(baseURL!);
    expect((await anon.get("/api/admin/webhooks")).status()).toBe(401);
  });
});
