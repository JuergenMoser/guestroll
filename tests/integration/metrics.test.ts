import { afterEach, describe, expect, it } from "vitest";
import { freshEnv } from "../helpers/env";

let env: Awaited<ReturnType<typeof freshEnv>> | undefined;
afterEach(() => env?.cleanup());

describe("Prometheus metrics", () => {
  it("renders the text format, labels escaped, every status present", async () => {
    env = await freshEnv();
    const { renderMetrics } = await import("@/lib/metrics");
    expect(renderMetrics([{ name: "x_total", help: "Things.", type: "counter", samples: [{ labels: { v: 'a"b\\c' }, value: 2 }, { value: Number.NaN }] }])).toBe(
      '# HELP x_total Things.\n# TYPE x_total counter\nx_total{v="a\\"b\\\\c"} 2\nx_total 0\n',
    );
  });

  it("counts events, photos by status and guests", async () => {
    env = await freshEnv();
    const events = await import("@/lib/events");
    const photos = await import("@/lib/photos");
    const { collectMetrics, renderMetrics } = await import("@/lib/metrics");
    const open = events.createEvent({ name: "Open" });
    events.createEvent({ name: "Closed", uploadsOpen: false });
    const add = (id: string, guestId: string, status: "visible" | "pending") =>
      photos.insertPhoto({ id, eventId: open.id, guestId, guestName: null, width: 1, height: 1, bytes: 100, status });
    add("11111111-1111-4111-8111-111111111111", "a", "visible");
    add("22222222-2222-4222-8222-222222222222", "a", "pending");
    add("33333333-3333-4333-8333-333333333333", "b", "visible");

    const text = renderMetrics(await collectMetrics());
    expect(text).toContain("guestroll_events 2\n");
    expect(text).toContain("guestroll_events_open 1\n");
    expect(text).toContain('guestroll_photos{status="visible"} 2\n');
    expect(text).toContain('guestroll_photos{status="pending"} 1\n');
    expect(text).toContain('guestroll_photos{status="hidden"} 0\n');
    expect(text).toContain("guestroll_photos_bytes 300\n");
    expect(text).toContain("guestroll_guests 2\n");
    expect(text).toMatch(/guestroll_info\{version="\d+\.\d+\.\d+"\} 1/);
    // Nothing that names an event: those are the hosts' data.
    expect(text).not.toContain("Open");
  });
});
