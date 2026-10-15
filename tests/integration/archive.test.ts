import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { freshEnv } from "../helpers/env";

let env: Awaited<ReturnType<typeof freshEnv>>;
beforeEach(async () => {
  env = await freshEnv();
});
afterEach(() => env.cleanup());

/** Entry names from a ZIP's central directory (signature 0x02014b50). */
function zipEntries(zip: Buffer): string[] {
  const names: string[] = [];
  for (let i = 0; i < zip.length - 46; i++) {
    if (zip.readUInt32LE(i) !== 0x02014b50) continue;
    const length = zip.readUInt16LE(i + 28);
    names.push(zip.subarray(i + 46, i + 46 + length).toString("utf8"));
  }
  return names;
}

describe("archiveResponse", () => {
  it("streams every photo, numbered in order, named after the guest", async () => {
    const { createEvent } = await import("@/lib/events");
    const { insertPhoto, listForArchive } = await import("@/lib/photos");
    const { writePhotoFiles } = await import("@/lib/storage/files");
    const { newId } = await import("@/lib/security/ids");
    const { archiveResponse } = await import("@/lib/archive");

    const event = createEvent({ name: "Julie & Thomas" });
    for (const [name, status] of [["Léa", "visible"], [null, "visible"], ["Hidden", "hidden"]] as const) {
      const id = newId();
      await writePhotoFiles(event.id, id, { original: Buffer.from(`jpeg-${id}`), display: Buffer.from("d"), thumb: Buffer.from("t") });
      insertPhoto({ id, eventId: event.id, guestId: "g", guestName: name, width: 1, height: 1, bytes: 1, status });
      await new Promise((r) => setTimeout(r, 3));
    }

    const res = archiveResponse(event, listForArchive(event.id, "visible"));
    expect(res.headers.get("content-type")).toBe("application/zip");
    expect(res.headers.get("content-disposition")).toContain('filename="julie-thomas.zip"');
    const names = zipEntries(Buffer.from(await res.arrayBuffer()));
    expect(names).toHaveLength(2);
    expect(names[0]).toMatch(/^0001-lea-[0-9a-f]{8}\.jpg$/);
    expect(names[1]).toMatch(/^0002-guest-[0-9a-f]{8}\.jpg$/);

    const all = archiveResponse(event, listForArchive(event.id, "all"));
    expect(zipEntries(Buffer.from(await all.arrayBuffer()))).toHaveLength(3);
  });
});
