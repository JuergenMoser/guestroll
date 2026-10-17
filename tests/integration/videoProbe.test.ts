import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { InvalidVideoError, probeVideo } from "@/lib/video/probe";

const fixture = (name: string) => path.join(__dirname, "../fixtures", name);

function tempFile(content: Buffer | string): string {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "guestroll-probe-")), "upload");
  fs.writeFileSync(file, content);
  return file;
}

describe("probeVideo", () => {
  it("reads the container and the length of what phones film", async () => {
    // The audio track runs a few milliseconds past the picture (encoder priming).
    const mp4 = await probeVideo(fixture("clip.mp4"));
    expect(mp4.mediaType).toBe("video/mp4");
    expect(mp4.durationMs).toBeCloseTo(2000, -2);
    const mov = await probeVideo(fixture("clip.mov"));
    expect(mov.mediaType).toBe("video/quicktime");
    expect(mov.durationMs).toBeCloseTo(1500, -2);
    const webm = await probeVideo(fixture("clip.webm"));
    expect(webm.mediaType).toBe("video/webm");
    expect(webm.durationMs).toBeCloseTo(1000, -2);
  });

  it("measures what plays, not what the header claims", async () => {
    // 3 s of video whose headers were edited to announce half a second.
    const lying = await probeVideo(fixture("header-lies.mp4"));
    expect(lying.durationMs).toBeCloseTo(3000, -2);
  });

  it("refuses what isn't a video, whatever it's called", async () => {
    await expect(probeVideo(tempFile("not a video at all"))).rejects.toBeInstanceOf(InvalidVideoError);
    await expect(probeVideo(fixture("sample.heic"))).rejects.toBeInstanceOf(InvalidVideoError);
    // A real MP4 cut short: the header promises data that isn't there.
    await expect(probeVideo(tempFile(fs.readFileSync(fixture("clip.mp4")).subarray(0, 64)))).rejects.toBeInstanceOf(InvalidVideoError);
  });
});
