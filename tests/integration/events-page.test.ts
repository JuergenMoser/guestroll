import { afterEach, describe, expect, it } from "vitest";
import { freshEnv } from "../helpers/env";

let env: Awaited<ReturnType<typeof freshEnv>> | undefined;
afterEach(() => env?.cleanup());

describe("paging the event list", () => {
  it("walks every event once, and a page past the end shows the last", async () => {
    env = await freshEnv();
    const events = await import("@/lib/events");
    for (let i = 0; i < 7; i++) events.createEvent({ name: `Event ${i}` });

    const first = events.pageEvents({ all: true }, { perPage: 3 });
    expect(first).toMatchObject({ total: 7, page: 1, pageCount: 3 });
    const seen = [1, 2, 3].flatMap((page) => events.pageEvents({ all: true }, { page, perPage: 3 }).events.map((e) => e.id));
    expect(new Set(seen).size).toBe(7);

    const beyond = events.pageEvents({ all: true }, { page: 99, perPage: 3 });
    expect(beyond.page).toBe(3);
    expect(beyond.events).toHaveLength(1);
    expect(events.pageEvents({ all: true }, { page: -4, perPage: 3 }).page).toBe(1);
  });

  it("searches names, taking % and _ literally", async () => {
    env = await freshEnv();
    const events = await import("@/lib/events");
    events.createEvent({ name: "Wedding of Julie" });
    events.createEvent({ name: "50% off party" });
    events.createEvent({ name: "Office_party" });
    events.createEvent({ name: "Office party" });

    expect(events.pageEvents({ all: true }, { q: "wedding" }).events.map((e) => e.name)).toEqual(["Wedding of Julie"]);
    expect(events.pageEvents({ all: true }, { q: "%" }).events.map((e) => e.name)).toEqual(["50% off party"]);
    expect(events.pageEvents({ all: true }, { q: "office_" }).events.map((e) => e.name)).toEqual(["Office_party"]);
    expect(events.pageEvents({ all: true }, { q: "  " }).total).toBe(4);
  });

  it("keeps organizers to their events, searched or not", async () => {
    env = await freshEnv();
    const events = await import("@/lib/events");
    const mine = events.createEvent({ name: "Party A" });
    events.createEvent({ name: "Party B" });
    const scope = { all: false, eventIds: [mine.id] };
    expect(events.pageEvents(scope, { q: "party" }).events.map((e) => e.id)).toEqual([mine.id]);
    expect(events.pageEvents({ all: false, eventIds: [] })).toMatchObject({ total: 0, events: [] });
    expect(events.listEventNames(scope)).toEqual([{ id: mine.id, name: "Party A" }]);
  });

  it("counts each page's photos like the full list", async () => {
    env = await freshEnv({ DEMO_MODE: "true" });
    const { seedDemo } = await import("@/lib/demo/seed");
    await seedDemo();
    const events = await import("@/lib/events");
    const all = events.listEvents({ all: true });
    const paged = [1, 2, 3].flatMap((page) => events.pageEvents({ all: true }, { page, perPage: 1 }).events);
    const counts = (list: typeof all) => Object.fromEntries(list.map((e) => [e.id, [e.photoCount, e.pendingCount, e.bytes]]));
    expect(counts(paged)).toEqual(counts(all));
    expect(paged.reduce((n, e) => n + e.photoCount, 0)).toBe(42);
  });
});
