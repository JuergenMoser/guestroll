"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Filter, Frame } from "@/lib/effects";
import type { PublicEvent } from "@/lib/events";
import type { PhotoDto } from "@/lib/photos";
import { applyEffects } from "./applyEffects";
import { claimResume, listPending, removePending, savePending, scopeOf } from "./pendingStore";
import { isVideoFile, videoPoster } from "./videoPoster";

export type UploadStatus = "queued" | "compressing" | "uploading" | "done" | "error";

export interface UploadItem {
  id: string;
  file: File;
  /** Where it goes: an item resumed from an earlier visit keeps the table it was taken at. */
  endpoint: string;
  /** Left unsent by an earlier visit and picked up again. */
  resumed?: boolean;
  /** Challenge picked when the photo was taken; sent with it. */
  challengeId: string | null;
  /** Applied in the browser before compression (see applyEffects). Photos only. */
  filter: Filter;
  /** Empty for a video until its poster is drawn. */
  preview: string;
  video: boolean;
  status: UploadStatus;
  progress: number;
  /** API error code (`too_large`, `quota_reached`…), translated by the UI. */
  error?: string;
}

// Big enough to keep detail for prints, small enough to upload over a crowded
// venue's 4G in a few seconds.
const MAX_DIMENSION = 3200;
const MAX_ATTEMPTS = 3;
// Errors that will fail identically on retry: don't hammer the server.
const PERMANENT = new Set(["too_large", "invalid_image", "invalid_video", "video_too_long", "videos_off", "uploads_closed", "quota_reached", "forbidden", "not_found"]);
// The server allows the same second of slack (see the photos route).
const DURATION_SLACK_MS = 1_000;

class Refused extends Error {}

async function compress(file: File): Promise<File> {
  try {
    const { default: imageCompression } = await import("browser-image-compression");
    return await imageCompression(file, {
      maxWidthOrHeight: MAX_DIMENSION,
      maxSizeMB: 6,
      initialQuality: 0.88,
      // Its worker loads the library from a CDN: blocked by the page's CSP, and a
      // request to a third party from every guest. Compression runs in the page.
      useWebWorker: false,
      fileType: "image/jpeg",
      preserveExif: false,
    });
  } catch {
    // Browsers that can't decode the file (HEIC on desktop Chrome…) send the
    // original; the server knows how to convert it.
    return file;
  }
}

/** A photo goes as a form; a video as its poster then itself (see lib/video/receive.ts). */
type Payload = { photo: File } | { video: File; poster: Blob };

function send(url: string, payload: Payload, challengeId: string | null, onProgress: (ratio: number) => void): Promise<PhotoDto> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let body: FormData | Blob;
    if ("photo" in payload) {
      body = new FormData();
      body.append("photo", payload.photo, payload.photo.name || "photo.jpg");
      if (challengeId) body.append("challenge", challengeId);
      xhr.open("POST", url);
    } else {
      body = new Blob([payload.poster, payload.video]);
      const target = new URL(url, location.origin);
      if (challengeId) target.searchParams.set("challenge", challengeId);
      xhr.open("POST", target.pathname + target.search);
      xhr.setRequestHeader("Content-Type", "application/vnd.guestroll.video");
      xhr.setRequestHeader("X-Poster-Bytes", String(payload.poster.size));
    }
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let json: { photo?: PhotoDto; error?: string } = {};
      try {
        json = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && json.photo) resolve(json.photo);
      else reject(new Error(json.error ?? "generic"));
    };
    xhr.onerror = () => reject(new Error(navigator.onLine ? "generic" : "offline"));
    xhr.send(body);
  });
}

// Page-wide, not per hook: a queue unmounted mid-upload keeps sending, and a
// remount resuming its files from the store would send them a second time.
const queuedIds = new Set<string>();

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function waitOnline(): Promise<void> {
  if (navigator.onLine) return Promise.resolve();
  return new Promise((resolve) => window.addEventListener("online", () => resolve(), { once: true }));
}

/**
 * Sequential upload queue. One file at a time matches the server's one-upload-
 * per-guest lock, keeps the phone responsive, and gives honest progress.
 */
export function useUploadQueue(endpoint: string, onUploaded: (photo: PhotoDto) => void, effects?: { frame: Frame; event: PublicEvent }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const queue = useRef<UploadItem[]>([]);
  const running = useRef(false);
  const onUploadedRef = useRef(onUploaded);
  const effectsRef = useRef(effects);
  useEffect(() => {
    onUploadedRef.current = onUploaded;
    effectsRef.current = effects;
  }, [onUploaded, effects]);

  const patch = useCallback((id: string, change: Partial<UploadItem>) => {
    setItems((list) => list.map((item) => (item.id === id ? { ...item, ...change } : item)));
  }, []);

  const preparePhoto = useCallback(async (item: UploadItem) => {
    const fx = effectsRef.current;
    const withEffects = fx ? await applyEffects(item.file, { filter: item.filter, frame: fx.frame, event: fx.event }).catch(() => item.file) : item.file;
    return compress(withEffects);
  }, []);

  const prepareVideo = useCallback(
    async (item: UploadItem): Promise<Payload> => {
      const limits = effectsRef.current?.event.videos;
      if (!limits) throw new Refused("videos_off");
      if (item.file.size > limits.maxBytes) throw new Refused("too_large");
      const { poster, durationMs } = await videoPoster(item.file);
      if (durationMs !== null && durationMs > limits.maxSeconds * 1000 + DURATION_SLACK_MS) throw new Refused("video_too_long");
      if (!item.preview) patch(item.id, { preview: URL.createObjectURL(poster) });
      return { video: item.file, poster };
    },
    [patch],
  );

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    while (queue.current.length) {
      const item = queue.current.shift()!;
      patch(item.id, { status: "compressing", error: undefined });
      let payload: Payload;
      try {
        payload = item.video ? await prepareVideo(item) : { photo: await preparePhoto(item) };
      } catch (error) {
        // Checked on the phone, before sending 100 MB the server would refuse.
        const code = error instanceof Refused ? error.message : "generic";
        void removePending(item.id);
        patch(item.id, { status: "error", error: code });
        continue;
      }

      for (let attempt = 1; ; attempt++) {
        await waitOnline();
        patch(item.id, { status: "uploading", progress: 0 });
        try {
          const photo = await send(item.endpoint, payload, item.challengeId, (progress) => patch(item.id, { progress }));
          void removePending(item.id);
          patch(item.id, { status: "done", progress: 1 });
          onUploadedRef.current(photo);
          break;
        } catch (error) {
          const code = (error as Error).message;
          if (code === "rate_limited") {
            // The server is busy, not failing: wait our turn without using up an attempt.
            // The jitter keeps a room of phones from all coming back at the same second.
            attempt--;
            await wait(4_000 + Math.random() * 4_000);
            continue;
          }
          if (PERMANENT.has(code) || attempt >= MAX_ATTEMPTS) {
            // A network that gave up stays saved for the next visit; a refusal never changes.
            if (PERMANENT.has(code)) void removePending(item.id);
            patch(item.id, { status: "error", error: code });
            break;
          }
          await wait(1_500 * attempt);
        }
      }
    }
    running.current = false;
  }, [patch, preparePhoto, prepareVideo]);

  const enqueue = useCallback(
    (added: UploadItem[]) => {
      for (const item of added) queuedIds.add(item.id);
      queue.current.push(...added);
      setItems((list) => [...added, ...list]);
      void run();
    },
    [run],
  );

  const add = useCallback(
    (files: File[], challengeId: string | null = null, filter: Filter = "none") => {
      const added = files.map<UploadItem>((file) => ({
        id: crypto.randomUUID(),
        file,
        endpoint,
        challengeId,
        filter,
        // A video's own URL won't show in an <img>: its poster replaces it once drawn.
        preview: isVideoFile(file) ? "" : URL.createObjectURL(file),
        video: isVideoFile(file),
        status: "queued",
        progress: 0,
      }));
      // Saved before anything is sent: closing the page from here on loses nothing.
      for (const item of added) {
        void savePending({ id: item.id, endpoint, scope: scopeOf(endpoint), file: item.file, name: item.file.name, challengeId, filter, createdAt: Date.now() });
      }
      enqueue(added);
    },
    [endpoint, enqueue],
  );

  // Once per page: what an earlier visit to this event left unsent goes first.
  const scope = scopeOf(endpoint);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!(await claimResume(scope)) || cancelled) return;
      // Photos taken while the list was read are already queued: they are saved too.
      const pending = (await listPending(scope)).filter((p) => !queuedIds.has(p.id));
      if (cancelled || pending.length === 0) return;
      enqueue(
        pending.map<UploadItem>((p) => {
          const file = new File([p.file], p.name || "photo.jpg", { type: p.file.type });
          const video = isVideoFile(file);
          return { id: p.id, file, endpoint: p.endpoint, resumed: true, challengeId: p.challengeId, filter: p.filter, preview: video ? "" : URL.createObjectURL(file), video, status: "queued", progress: 0 };
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [scope, enqueue]);

  const retry = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      patch(id, { status: "queued", error: undefined, progress: 0 });
      queue.current.push(item);
      void run();
    },
    [items, patch, run],
  );

  const dismiss = useCallback((id: string) => {
    // Dismissing a failed photo is the guest giving up on it.
    void removePending(id);
    setItems((list) => {
      const item = list.find((i) => i.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return list.filter((i) => i.id !== id);
    });
  }, []);

  return { items, add, retry, dismiss };
}
