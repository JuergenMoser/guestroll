"use client";

import { Film, Music } from "lucide-react";
import { useRef, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, Card, CardTitle, Field, Input, SegmentedControl, Switch } from "@/components/ui";
import type { PhotoDto } from "@/lib/photos";
import { containRect, coverRect, fitsByCover, FPS, MAX_PHOTOS, shotAt, timeline } from "@/lib/slideshow";

const SIZES = { landscape: [1920, 1080], portrait: [1080, 1920] } as const;
type Size = keyof typeof SIZES;

async function listPhotos(eventId: string, favorites: boolean): Promise<PhotoDto[]> {
  const out: PhotoDto[] = [];
  let before: number | null = null;
  do {
    const query = new URLSearchParams({ status: "visible" });
    if (favorites) query.set("favorites", "1");
    if (before) query.set("before", String(before));
    const res = await fetch(`/api/admin/events/${eventId}/photos?${query}`);
    if (!res.ok) break;
    const page = (await res.json()) as { photos: PhotoDto[]; nextCursor: number | null };
    out.push(...page.photos);
    before = page.nextCursor;
  } while (before && out.length < MAX_PHOTOS);
  // Oldest first: the video tells the evening in order.
  return out.slice(0, MAX_PHOTOS).reverse();
}

/**
 * Renders the slideshow in this browser (WebCodecs) and downloads an MP4: no
 * video encoder on the server, so the image stays small. Photos load a few
 * ahead of the frame being drawn, never all at once.
 */
export function SlideshowExport({ eventId, eventName, eventDate, accent, hasFavorites }: { eventId: string; eventName: string; eventDate: string | null; accent: string; hasFavorites: boolean }) {
  const t = useT();
  const [size, setSize] = useState<Size>("landscape");
  const [perPhoto, setPerPhoto] = useState(4);
  const [favorites, setFavorites] = useState(false);
  const [music, setMusic] = useState<File | null>(null);
  const [status, setStatus] = useState<{ phase: "idle" | "loading" | "encoding" | "done" | "error"; progress?: number; text?: string }>({ phase: "idle" });
  const cancel = useRef(false);
  const musicInput = useRef<HTMLInputElement>(null);

  async function render() {
    cancel.current = false;
    setStatus({ phase: "loading" });
    try {
      const mb = await import("mediabunny");
      const [width, height] = SIZES[size];
      const codec = await mb.getFirstEncodableVideoCodec(["avc", "vp9", "hevc", "av1"], { width, height });
      if (!codec || typeof VideoEncoder === "undefined") return setStatus({ phase: "error", text: t("admin.slideshow.unsupported") });

      const photos = await listPhotos(eventId, favorites);
      if (!photos.length) return setStatus({ phase: "error", text: t("admin.slideshow.noPhotos") });
      const tl = timeline(photos.length, perPhoto);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { alpha: false })!;
      const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }), target: new mb.BufferTarget() });
      const video = new mb.CanvasSource(canvas, { codec, bitrate: mb.QUALITY_HIGH, keyFrameInterval: 2 });
      output.addVideoTrack(video, { frameRate: FPS });

      let audio: { source: InstanceType<typeof mb.AudioBufferSource>; buffer: AudioBuffer } | null = null;
      if (music) {
        const decoded = await new AudioContext().decodeAudioData(await music.arrayBuffer()).catch(() => null);
        const audioCodec = decoded && (await mb.getFirstEncodableAudioCodec(["aac", "opus"], { numberOfChannels: decoded.numberOfChannels, sampleRate: decoded.sampleRate }));
        if (decoded && audioCodec) {
          // Cut to the video's length, with a two-second fade at the end.
          const length = Math.min(decoded.length, Math.ceil(tl.duration * decoded.sampleRate));
          const offline = new OfflineAudioContext(decoded.numberOfChannels, length, decoded.sampleRate);
          const node = offline.createBufferSource();
          const gain = offline.createGain();
          node.buffer = decoded;
          gain.gain.setValueAtTime(1, Math.max(0, length / decoded.sampleRate - 2));
          gain.gain.linearRampToValueAtTime(0, length / decoded.sampleRate);
          node.connect(gain).connect(offline.destination);
          node.start();
          const source = new mb.AudioBufferSource({ codec: audioCodec, bitrate: mb.QUALITY_MEDIUM });
          output.addAudioTrack(source);
          audio = { source, buffer: await offline.startRendering() };
        }
      }
      await output.start();

      const cache = new Map<number, Promise<ImageBitmap | null>>();
      const load = (i: number) => {
        if (i < 0 || i >= tl.photos) return Promise.resolve(null);
        if (!cache.has(i)) {
          cache.set(
            i,
            fetch(`/api/media/${photos[i].id}?v=display`)
              .then((r) => (r.ok ? r.blob() : null))
              .then((b) => (b ? createImageBitmap(b) : null))
              .catch(() => null),
          );
        }
        return cache.get(i)!;
      };
      const family = getComputedStyle(document.body).fontFamily;
      const date = eventDate ? new Intl.DateTimeFormat(document.documentElement.lang || undefined, { dateStyle: "long" }).format(new Date(`${eventDate}T12:00:00`)) : "";

      const drawPhoto = (bitmap: ImageBitmap | null, progress: number, index: number, alpha: number) => {
        if (!bitmap) return;
        ctx.globalAlpha = alpha;
        if (fitsByCover(bitmap.width, bitmap.height, width, height)) {
          const r = coverRect(bitmap.width, bitmap.height, width, height, progress, index);
          ctx.drawImage(bitmap, r.x, r.y, r.w, r.h);
        } else {
          const bg = coverRect(bitmap.width, bitmap.height, width, height, 0, 0);
          ctx.filter = "blur(40px) brightness(0.45)";
          ctx.drawImage(bitmap, bg.x, bg.y, bg.w, bg.h);
          ctx.filter = "none";
          const r = containRect(bitmap.width, bitmap.height, width, height, progress);
          ctx.drawImage(bitmap, r.x, r.y, r.w, r.h);
        }
        ctx.globalAlpha = 1;
      };

      const frames = Math.ceil(tl.duration * FPS);
      setStatus({ phase: "encoding", progress: 0 });
      for (let f = 0; f < frames; f++) {
        if (cancel.current) {
          await output.cancel();
          return setStatus({ phase: "idle" });
        }
        const time = f / FPS;
        const shot = shotAt(time, tl);
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, width, height);
        if (shot.kind === "title") {
          ctx.globalAlpha = shot.opacity;
          ctx.fillStyle = accent;
          ctx.fillRect(0, height - Math.round(height * 0.012), width, Math.round(height * 0.012));
          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = `800 ${Math.round(Math.min(width, height) * 0.09)}px ${family}`;
          ctx.fillText(eventName, width / 2, height / 2 - (date ? height * 0.03 : 0), width * 0.9);
          if (date) {
            ctx.font = `500 ${Math.round(Math.min(width, height) * 0.035)}px ${family}`;
            ctx.fillStyle = "rgba(255,255,255,0.7)";
            ctx.fillText(date, width / 2, height / 2 + height * 0.06, width * 0.9);
          }
          ctx.globalAlpha = 1;
        } else {
          // Keep the next couple of photos loading while this one shows.
          void load(shot.index + 1);
          void load(shot.index + 2);
          drawPhoto(await load(shot.index), shot.progress, shot.index, 1);
          if (shot.next) drawPhoto(await load(shot.next.index), 0, shot.next.index, shot.next.mix);
          for (const key of cache.keys()) if (key < shot.index - 1) cache.delete(key);
        }
        await video.add(time, 1 / FPS);
        if (f % FPS === 0) setStatus({ phase: "encoding", progress: f / frames });
      }
      if (audio) await audio.source.add(audio.buffer);
      await output.finalize();

      const blob = new Blob([output.target.buffer!], { type: "video/mp4" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${eventName.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").toLowerCase() || "slideshow"}.mp4`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 60_000);
      setStatus({ phase: "done" });
    } catch (error) {
      console.error("[slideshow]", error);
      setStatus({ phase: "error", text: t("admin.slideshow.failed") });
    }
  }

  const busy = status.phase === "loading" || status.phase === "encoding";
  return (
    <Card className="space-y-5">
      <div className="space-y-1">
        <CardTitle>{t("admin.slideshow.title")}</CardTitle>
        <p className="max-w-prose text-sm text-ink-muted">{t("admin.slideshow.hint")}</p>
      </div>
      <div className="grid gap-5 md:grid-cols-[1fr_10rem]">
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("admin.slideshow.format")}</p>
          <SegmentedControl name={t("admin.slideshow.format")} value={size} options={["landscape", "portrait"] as const} onChange={setSize} label={(v) => t(`admin.slideshow.formats.${v}`)} />
        </div>
        <Field label={t("admin.wallSettings.seconds")}>
          {(id) => <Input id={id} type="number" min={2} max={8} value={perPhoto} onChange={(e) => setPerPhoto(Math.min(8, Math.max(2, Number(e.target.value) || 4)))} />}
        </Field>
      </div>
      {hasFavorites && <Switch label={t("admin.wallSettings.favoritesOnly")} checked={favorites} onChange={setFavorites} />}
      <div className="flex flex-wrap items-center gap-2">
        <input ref={musicInput} type="file" accept="audio/*" hidden onChange={(e) => setMusic(e.target.files?.[0] ?? null)} />
        <Button variant="ghost" size="sm" onClick={() => musicInput.current?.click()} disabled={busy}>
          <Music className="size-4" aria-hidden />
          {music ? music.name : t("admin.slideshow.music")}
        </Button>
        {music && (
          <Button variant="ghost" size="sm" onClick={() => setMusic(null)} disabled={busy}>
            {t("guestbook.discard")}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {busy ? (
          <Button variant="secondary" onClick={() => (cancel.current = true)}>
            {t("common.cancel")}
          </Button>
        ) : (
          <Button onClick={render}>
            <Film className="size-4" aria-hidden />
            {t("admin.slideshow.create")}
          </Button>
        )}
        {status.phase === "loading" && <span className="text-sm text-ink-muted">{t("admin.slideshow.loading")}</span>}
        {status.phase === "encoding" && (
          <span role="status" className="flex min-w-48 flex-1 items-center gap-3 text-sm tabular-nums text-ink-muted">
            <span className="h-1.5 flex-1 rounded-sm bg-sunken">
              <span className="block h-full rounded-sm bg-ink" style={{ width: `${Math.round((status.progress ?? 0) * 100)}%` }} />
            </span>
            {Math.round((status.progress ?? 0) * 100)}%
          </span>
        )}
        {status.phase === "done" && <span className="text-sm text-ok">{t("admin.slideshow.done")}</span>}
        {status.phase === "error" && <span className="text-sm text-danger">{status.text}</span>}
      </div>
    </Card>
  );
}
