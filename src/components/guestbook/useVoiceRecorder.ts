"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const MAX_RECORDING_SECONDS = 120;

// Safari records mp4/AAC, Chrome and Firefox webm or ogg/Opus: take the first the browser supports.
const TYPES = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"];

export type RecorderState =
  | { phase: "idle" }
  | { phase: "recording"; seconds: number }
  | { phase: "ready"; blob: Blob; url: string; seconds: number }
  | { phase: "error"; reason: "unsupported" | "denied" };

/** Records one voice note, stopping by itself at the time limit. */
export function useVoiceRecorder() {
  const [state, setState] = useState<RecorderState>({ phase: "idle" });
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef(0);
  const url = useRef<string | null>(null);

  const cleanupStream = () => {
    recorder.current?.stream.getTracks().forEach((track) => track.stop());
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  const stop = useCallback(() => {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }, []);

  const start = useCallback(async () => {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState({ phase: "error", reason: "unsupported" });
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setState({ phase: "error", reason: "denied" });
      return;
    }
    const mimeType = TYPES.find((type) => MediaRecorder.isTypeSupported(type));
    // ~48 kbit/s keeps two minutes well under the 3 MB the server accepts.
    const rec = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 48_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      cleanupStream();
      const seconds = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
      const blob = new Blob(chunks, { type: rec.mimeType || mimeType || "audio/webm" });
      if (url.current) URL.revokeObjectURL(url.current);
      url.current = URL.createObjectURL(blob);
      setState({ phase: "ready", blob, url: url.current, seconds: Math.min(seconds, MAX_RECORDING_SECONDS) });
    };
    recorder.current = rec;
    startedAt.current = Date.now();
    rec.start(1000);
    setState({ phase: "recording", seconds: 0 });
    timer.current = setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt.current) / 1000);
      if (seconds >= MAX_RECORDING_SECONDS) stop();
      else setState({ phase: "recording", seconds });
    }, 250);
  }, [stop]);

  const reset = useCallback(() => {
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
    setState({ phase: "idle" });
  }, []);

  useEffect(
    () => () => {
      if (recorder.current?.state === "recording") recorder.current.stop();
      cleanupStream();
      if (url.current) URL.revokeObjectURL(url.current);
    },
    [],
  );

  return { state, start, stop, reset };
}

export const formatSeconds = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
