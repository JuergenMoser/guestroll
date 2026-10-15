import { expect, test } from "@playwright/test";
import { admin, client, createEvent, uniqueSuffix } from "../helpers";

test.describe("invitations", () => {
  test("the invited organizer picks their login, gets their events, and the link works once", async ({ baseURL }) => {
    const owner = await admin(baseURL!);
    const theirs = await createEvent(owner);
    const other = await createEvent(owner);
    const created = await owner.post("/api/admin/invitations", { data: { email: "lea@example.test", role: "organizer", eventIds: [theirs.id] } });
    expect(created.status()).toBe(201);
    const { url, invitation } = await created.json();
    const token = url.split("/admin/invite/")[1];
    expect((await (await owner.get("/api/admin/invitations")).json()).invitations.map((i: { id: string }) => i.id)).toContain(invitation.id);

    const lea = await client(baseURL!);
    expect(await (await lea.get(`/admin/invite/${token}`)).text()).toContain("lea@example.test");
    const username = `lea${uniqueSuffix(6)}`;
    // A taken username doesn't spend the invitation.
    expect((await lea.post(`/api/admin/invite/${token}`, { data: { username: "admin", password: "a-long-password" } })).status()).toBe(400);
    expect((await lea.post(`/api/admin/invite/${token}`, { data: { username, name: "Léa", password: "short" } })).status()).toBe(400);
    expect((await lea.post(`/api/admin/invite/${token}`, { data: { username, name: "Léa", password: "a-long-password" } })).status()).toBe(201);

    // Signed in, with their event only.
    const events = (await (await lea.get("/api/admin/events")).json()).events.map((e: { id: string }) => e.id);
    expect(events).toEqual([theirs.id]);
    expect(events).not.toContain(other.id);

    // Spent: the link answers like an unknown one.
    const again = await client(baseURL!);
    expect((await again.post(`/api/admin/invite/${token}`, { data: { username: `x${username}`, password: "a-long-password" } })).status()).toBe(404);
    expect(await (await again.get(`/admin/invite/${token}`)).text()).toContain("expired, was already used or was revoked");
  });

  test("a revoked invitation opens nothing, and only owners invite", async ({ baseURL }) => {
    const owner = await admin(baseURL!);
    const { url, invitation } = await (await owner.post("/api/admin/invitations", { data: { email: "max@example.test", role: "owner" } })).json();
    expect((await owner.delete(`/api/admin/invitations/${invitation.id}`)).status()).toBe(200);
    const max = await client(baseURL!);
    expect((await max.post(`/api/admin/invite/${url.split("/admin/invite/")[1]}`, { data: { username: `max${uniqueSuffix(6)}`, password: "a-long-password" } })).status()).toBe(404);
    expect((await owner.post("/api/admin/invitations", { data: { email: "not-an-email", role: "owner" } })).status()).toBe(400);
    expect((await max.post("/api/admin/invitations", { data: { email: "x@example.test", role: "owner" } })).status()).toBe(401);
  });
});
