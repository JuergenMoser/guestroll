import { expect, test } from "@playwright/test";
import { admin, client, createEvent, joinAndUpload, signIn } from "../helpers";

async function organizerOf(baseURL: string, eventIds: string[]) {
  const owner = await admin(baseURL);
  const username = `org${Math.random().toString(36).slice(2, 8)}`;
  const res = await owner.post("/api/admin/accounts", { data: { username, name: "Org", role: "organizer", eventIds } });
  expect(res.status()).toBe(201);
  const { account, password } = await res.json();
  return { owner, account, password: password as string, api: await signIn(baseURL, username, password) };
}

test.describe("accounts", () => {
  test("an older install keeps signing in with the password alone", async ({ baseURL }) => {
    const api = await client(baseURL!);
    expect((await api.post("/api/admin/login", { data: { password: "e2e-admin-password" } })).status()).toBe(200);
  });

  test("an organizer sees and runs only the events given to them", async ({ baseURL }) => {
    const owner = await admin(baseURL!);
    const mine = await createEvent(owner, { name: "Mine" });
    const theirs = await createEvent(owner, { name: "Theirs" });
    const [theirPhoto] = await joinAndUpload(await client(baseURL!), theirs.slug, 1);
    await joinAndUpload(await client(baseURL!), mine.slug, 2);
    const { api } = await organizerOf(baseURL!, [mine.id]);

    const { events } = await (await api.get("/api/admin/events")).json();
    expect(events.map((e: { id: string }) => e.id)).toEqual([mine.id]);
    expect((await api.get(`/api/admin/events/${mine.id}`)).status()).toBe(200);
    expect((await api.patch(`/api/admin/events/${mine.id}`, { data: { description: "ok" } })).status()).toBe(200);
    expect((await (await api.get(`/api/admin/events/${mine.id}/photos`)).json()).photos).toHaveLength(2);

    // Someone else's event looks exactly like a missing one.
    for (const path of ["", "/photos", "/qr", "/shares", "/archive"]) {
      expect((await api.get(`/api/admin/events/${theirs.id}${path}`)).status(), path).toBe(404);
    }
    expect((await api.patch(`/api/admin/events/${theirs.id}`, { data: { name: "x" } })).status()).toBe(404);
    expect((await api.get(`/api/media/${theirPhoto}?v=thumb`)).status()).toBe(404);
    expect((await api.get(`/api/admin/stats?eventId=${theirs.id}`)).status()).toBe(404);
    expect((await (await api.get("/api/admin/stats")).json()).totals).toMatchObject({ events: 1, photos: 2 });

    // Owners' business.
    expect((await api.post("/api/admin/events", { data: { name: "New" } })).status()).toBe(403);
    expect((await api.delete(`/api/admin/events/${mine.id}`)).status()).toBe(403);
    expect((await api.get("/api/admin/mail")).status()).toBe(403);
    expect((await api.get("/api/admin/accounts")).status()).toBe(403);
  });

  test("a password reset signs the person out, and deleting an account closes it", async ({ baseURL }) => {
    const { owner, account, api } = await organizerOf(baseURL!, []);
    expect((await api.get("/api/admin/events")).status()).toBe(200);

    const reset = await (await owner.patch(`/api/admin/accounts/${account.id}`, { data: { resetPassword: true } })).json();
    expect(reset.password).toMatch(/^[a-z0-9]{16}$/);
    expect((await api.get("/api/admin/events")).status()).toBe(401);

    const again = await signIn(baseURL!, account.username, reset.password);
    expect((await owner.delete(`/api/admin/accounts/${account.id}`)).status()).toBe(200);
    expect((await again.get("/api/admin/events")).status()).toBe(401);
  });

  test("the instance always keeps an owner, and the ADMIN_PASSWORD account stays as it is", async ({ baseURL }) => {
    const owner = await admin(baseURL!);
    const { accounts } = await (await owner.get("/api/admin/accounts")).json();
    const self = accounts.find((a: { username: string }) => a.username === "admin");
    expect((await owner.delete(`/api/admin/accounts/${self.id}`)).status()).toBe(400);
    expect((await owner.patch(`/api/admin/accounts/${self.id}`, { data: { role: "organizer" } })).status()).toBe(400);
    expect((await owner.patch(`/api/admin/accounts/${self.id}`, { data: { username: "renamed" } })).status()).toBe(400);
    expect((await owner.patch(`/api/admin/accounts/${self.id}`, { data: { resetPassword: true } })).status()).toBe(400);
  });

  test("usernames are checked and unique", async ({ baseURL }) => {
    const owner = await admin(baseURL!);
    const bad = await owner.post("/api/admin/accounts", { data: { username: "No Spaces!", role: "boss" } });
    expect(Object.keys((await bad.json()).details).sort()).toEqual(["role", "username"]);
    expect((await owner.post("/api/admin/accounts", { data: { username: "admin", role: "organizer" } })).status()).toBe(400);
    const set = await owner.post("/api/admin/accounts", { data: { username: `own${Date.now()}`, role: "owner", password: "chosen-password-1" } });
    expect((await set.json()).password).toBeNull();
  });

  test("everyone edits their own name and alert address", async ({ baseURL }) => {
    const { api } = await organizerOf(baseURL!, []);
    const res = await api.patch("/api/admin/me", { data: { name: "Léa", email: "Lea@Example.test", role: "owner" } });
    expect((await res.json()).account).toMatchObject({ name: "Léa", email: "lea@example.test", role: "organizer" });
  });
});
