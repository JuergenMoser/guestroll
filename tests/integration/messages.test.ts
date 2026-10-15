import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { freshEnv } from "../helpers/env";

let env: Awaited<ReturnType<typeof freshEnv>>;
beforeEach(async () => (env = await freshEnv()));
afterEach(() => env.cleanup());

describe("guestbook access", () => {
  async function setup(guestbookInGallery = false) {
    const events = await import("@/lib/events");
    const m = await import("@/lib/messages");
    const event = events.createEvent({ name: "Book", guestbookEnabled: true, guestbookInGallery });
    const add = (guestId: string, status: "visible" | "pending" | "hidden") =>
      m.insertMessage({ id: crypto.randomUUID(), eventId: event.id, guestId, guestName: null, text: "hi", audioExt: null, audioBytes: null, audioSeconds: null, status });
    return { event: events.getEventById(event.id)!, m, add };
  }

  it("lets a guest hear their own notes only, never hidden ones", async () => {
    const { event, m, add } = await setup();
    const mine = add("alice", "pending");
    const theirs = add("bob", "visible");
    const alice = { guestId: "alice", unlocked: [event.id] };
    expect(m.canViewMessage(event, mine, alice)).toBe(true);
    expect(m.canViewMessage(event, theirs, alice)).toBe(false);
    expect(m.canViewMessage(event, add("alice", "hidden"), alice)).toBe(false);
    // Joining is required, as for photos.
    expect(m.canViewMessage(event, mine, { guestId: "alice", unlocked: [] })).toBe(false);
    expect(m.canViewMessage(event, theirs, { admin: { all: true }, unlocked: [] })).toBe(true);
    expect(m.canViewMessage(event, theirs, { admin: { all: false, eventIds: ["other"] }, unlocked: [] })).toBe(false);
  });

  it("opens visible messages to gallery links only when the hosts share the guestbook", async () => {
    const link = (eventId: string) => ({ unlocked: [], shares: [{ shareId: "s", eventId, allowDownload: false, favoritesOnly: false }] });
    const closed = await setup(false);
    expect(closed.m.canViewMessage(closed.event, closed.add("x", "visible"), link(closed.event.id))).toBe(false);
    const shared = await setup(true);
    expect(shared.m.canViewMessage(shared.event, shared.add("x", "visible"), link(shared.event.id))).toBe(true);
    expect(shared.m.canViewMessage(shared.event, shared.add("x", "pending"), link(shared.event.id))).toBe(false);
  });

  it("stores voice notes under the event, and deleting removes the file", async () => {
    const { event, m } = await setup();
    const { storage } = await import("@/lib/storage");
    const msg = m.insertMessage({ id: crypto.randomUUID(), eventId: event.id, guestId: "a", guestName: null, text: "", audioExt: "ogg", audioBytes: 3, audioSeconds: 1, status: "visible" });
    await storage().put(m.audioKey(msg), Buffer.from("ogg"), "audio/ogg");
    expect(m.audioKey(msg)).toBe(`${event.id}/messages/${msg.id}.ogg`);
    expect(() => m.audioKey({ ...msg, audioExt: "../x" })).toThrow();
    expect(await m.deleteMessages([msg.id], event.id, "someone-else")).toBe(0);
    expect(await m.deleteMessages([msg.id], event.id, "a")).toBe(1);
    expect(await storage().read(m.audioKey(msg))).toBeNull();
  });
});
