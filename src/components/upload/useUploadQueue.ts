"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Filter, Frame } from "@/lib/effects";
import type { PublicEvent } from "@/lib/events";
import type { PhotoDto } from "@/lib/photos";
import { applyEffects } from "./applyEffects";

export type UploadStatus = "queued" | "compressing" | "uploading" | "done" | "error";

export interface UploadItem {
  id: string;
  file: File;
  /** Challenge picked when the photo was taken; sent with it. */
  challengeId: string | null;
  /** Applied in the browser before compression (see applyEffects). */
  filter: Filter;
  preview: string;
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
const PERMANENT = new Set(["too_large", "invalid_image", "uploads_closed", "quota_reached", "forbidden", "not_found"]);

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

function send(url: string, file: File, challengeId: string | null, onProgress: (ratio: number) => void): Promise<PhotoDto> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const body = new FormData();
    body.append("photo", file, file.name || "photo.jpg");
    if (challengeId) body.append("challenge", challengeId);
    xhr.open("POST", url);
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

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    while (queue.current.length) {
      const item = queue.current.shift()!;
      patch(item.id, { status: "compressing", error: undefined });
      const fx = effectsRef.current;
      const withEffects = fx ? await applyEffects(item.file, { filter: item.filter, frame: fx.frame, event: fx.event }).catch(() => item.file) : item.file;
      const file = await compress(withEffects);

      for (let attempt = 1; ; attempt++) {
        await waitOnline();
        patch(item.id, { status: "uploading", progress: 0 });
        try {
          const photo = await send(endpoint, file, item.challengeId, (progress) => patch(item.id, { progress }));
          patch(item.id, { status: "done", progress: 1 });
          onUploadedRef.current(photo);
          break;
        } catch (error) {
          const code = (error as Error).message;
          if (PERMANENT.has(code) || attempt >= MAX_ATTEMPTS) {
            patch(item.id, { status: "error", error: code });
            break;
          }
          await wait(code === "rate_limited" ? 5_000 : 1_500 * attempt);
        }
      }
    }
    running.current = false;
  }, [endpoint, patch]);

  const add = useCallback(
    (files: File[], challengeId: string | null = null, filter: Filter = "none") => {
      const added = files.map<UploadItem>((file) => ({
        id: crypto.randomUUID(),
        file,
        challengeId,
        filter,
        preview: URL.createObjectURL(file),
        status: "queued",
        progress: 0,
      }));
      queue.current.push(...added);
      setItems((list) => [...added, ...list]);
      void run();
    },
    [run],
  );

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
    setItems((list) => {
      const item = list.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return list.filter((i) => i.id !== id);
    });
  }, []);

  return { items, add, retry, dismiss };
}
