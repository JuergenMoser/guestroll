"use client";

import { Camera, Expand, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { applyEffects } from "@/components/upload/applyEffects";
import type { PublicEvent } from "@/lib/events";

type Phase = "starting" | "ready" | "countdown" | "sending" | "done" | "error";

const COUNTDOWN = 3;
// Long enough to look at yourself, short enough for the next group in line.
const SHOW_RESULT_MS = 5_000;

/**
 * A tablet on a stand: the live camera, one big button, a countdown, and the
 * photo goes straight into the album with the event's frame. The device was set
 * up with the booth link; the server checks that link's key on every photo.
 */
export function BoothApp({ event, boothKey }: { event: PublicEvent; boothKey: string }) {
  const t = useT();
  const video = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>("starting");
  const [error, setError] = useState<string>("");
  const [count, setCount] = useState(COUNTDOWN);
  const [flash, setFlash] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [taken, setTaken] = useState(0);

  // Join as the booth, then open the camera.
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    (async () => {
      const joined = await fetch(`/api/e/${event.slug}/booth`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: boothKey }) }).catch(() => null);
      if (!joined?.ok) {
        setError(t("booth.invalid"));
        return setPhase("error");
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(t("booth.noCamera"));
        return setPhase("error");
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      } catch {
        setError(t("booth.cameraDenied"));
        return setPhase("error");
      }
      if (cancelled || !video.current) return stream.getTracks().forEach((track) => track.stop());
      video.current.srcObject = stream;
      await video.current.play().catch(() => {});
      setPhase("ready");
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [event.slug, boothKey, t]);

  // A booth runs for hours: keep the screen on (the browser drops the lock when the tab hides).
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = () => navigator.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    void request();
    const onVisible = () => document.visibilityState === "visible" && void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
    };
  }, []);

  const capture = useCallback(async () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d")!;
    // Saved as people saw themselves on screen: mirrored, like the preview.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return setPhase("ready");
    setPhase("sending");
    const shot = await applyEffects(new File([blob], "booth.jpg", { type: "image/jpeg" }), { filter: "none", frame: event.frame, event }).catch(() => new File([blob], "booth.jpg", { type: "image/jpeg" }));
    setResult(URL.createObjectURL(shot));

    const body = new FormData();
    body.append("photo", shot, "booth.jpg");
    // A busy server answers 429: wait a moment and send again, the photo isn't lost.
    for (let attempt = 0; attempt < 6; attempt++) {
      const res = await fetch(`/api/e/${event.slug}/photos`, { method: "POST", body }).catch(() => null);
      if (res?.ok) {
        setTaken((n) => n + 1);
        return setPhase("done");
      }
      if (res && res.status !== 429 && res.status !== 507) break;
      await new Promise((r) => setTimeout(r, 2_000 + attempt * 1_000));
    }
    setError(t("booth.sendFailed"));
    setPhase("error");
  }, [event, t]);

  function start() {
    if (phase !== "ready") return;
    setPhase("countdown");
    setCount(COUNTDOWN);
    let n = COUNTDOWN;
    const tick = setInterval(() => {
      n -= 1;
      if (n > 0) return setCount(n);
      clearInterval(tick);
      void capture();
    }, 1_000);
  }

  // Back to the camera on its own after showing the photo.
  useEffect(() => {
    if (phase !== "done") return;
    const timer = setTimeout(() => {
      setResult((url) => {
        if (url) URL.revokeObjectURL(url);
        return null;
      });
      setPhase("ready");
    }, SHOW_RESULT_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black text-white select-none" onClick={start}>
      <video ref={video} playsInline muted className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />

      {result && (phase === "sending" || phase === "done") && (
        // eslint-disable-next-line @next/next/no-img-element -- a local blob of the photo just taken
        <img src={result} alt="" className="absolute inset-0 m-auto max-h-[85%] max-w-[90%] object-contain shadow-2xl" />
      )}

      {flash && <div className="absolute inset-0 bg-white" aria-hidden />}

      <header className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-5">
        <p className="text-xl font-bold tracking-tight">{event.name}</p>
        <div className="flex items-center gap-3">
          {taken > 0 && <span className="text-sm text-white/80 tabular-nums">{t("booth.taken", { n: taken })}</span>}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void document.documentElement.requestFullscreen?.().catch(() => {});
            }}
            aria-label={t("booth.fullscreen")}
            className="grid size-10 place-items-center rounded-full bg-white/15 hover:bg-white/25"
          >
            <Expand className="size-5" aria-hidden />
          </button>
        </div>
      </header>

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 bg-gradient-to-t from-black/70 to-transparent p-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        {phase === "ready" && (
          <button type="button" className="flex flex-col items-center gap-3" aria-label={t("booth.take")}>
            <span className="grid size-28 place-items-center rounded-full border-[6px] border-white bg-accent text-accent-ink shadow-xl">
              <Camera className="size-12" aria-hidden />
            </span>
            <span className="text-2xl font-semibold">{t("booth.tap")}</span>
          </button>
        )}
        {phase === "sending" && <p className="text-2xl font-semibold">{t("booth.sending")}</p>}
        {phase === "done" && <p className="text-2xl font-semibold">{t("booth.sent")}</p>}
        {phase === "starting" && <p className="text-xl text-white/80">{t("booth.starting")}</p>}
      </div>

      {phase === "countdown" && (
        <div className="absolute inset-0 grid place-items-center" aria-live="assertive">
          <span key={count} className="booth-count text-[28vmin] leading-none font-black drop-shadow-2xl">
            {count}
          </span>
        </div>
      )}

      {phase === "error" && (
        <div className="absolute inset-0 grid place-items-center bg-black/80 p-8 text-center">
          <div className="max-w-md space-y-5">
            <p className="text-xl">{error}</p>
            <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-semibold text-black">
              <RotateCcw className="size-4" aria-hidden />
              {t("booth.retry")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
