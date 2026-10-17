"use client";

export const isVideoFile = (file: Blob) => file.type.startsWith("video/");

const MAX_SIDE = 1280;

function once(target: HTMLVideoElement, event: string, ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} timed out`)), ms);
    target.addEventListener(event, () => (clearTimeout(timer), resolve()), { once: true });
    target.addEventListener("error", () => (clearTimeout(timer), reject(new Error("video error"))), { once: true });
  });
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", 0.85));
}

/** For a video this browser can't decode (HEVC on some Androids): a dark frame with a play sign. */
function placeholder(): Promise<Blob> {
  const canvas = document.createElement("canvas");
  [canvas.width, canvas.height] = [1280, 720];
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#1a1b1d";
  ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(590, 300);
  ctx.lineTo(590, 420);
  ctx.lineTo(694, 360);
  ctx.closePath();
  ctx.fill();
  return canvasBlob(canvas);
}

/**
 * The frame the album shows for a video, and its length, read in the browser:
 * the server has no decoder, and the phone has the best one there is. The
 * length is null when the browser couldn't tell; the server checks it anyway.
 */
export async function videoPoster(file: Blob): Promise<{ poster: Blob; durationMs: number | null }> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  let durationMs: number | null = null;
  try {
    await once(video, "loadedmetadata", 10_000);
    if (Number.isFinite(video.duration) && video.duration > 0) durationMs = Math.round(video.duration * 1000);
    // iOS loads no frame until playback starts: a muted play is allowed without a tap.
    await video.play().catch(() => {});
    video.pause();
    // Half a second in: the first frame is often black, or the phone still moving.
    video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
    await once(video, "seeked", 5_000).catch(() => {});
    if (!video.videoWidth || video.readyState < 2) throw new Error("no frame");
    const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    return { poster: await canvasBlob(canvas), durationMs };
  } catch {
    return { poster: await placeholder(), durationMs };
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
