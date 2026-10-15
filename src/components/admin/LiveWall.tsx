"use client";

/* eslint-disable @next/next/no-img-element -- photos come from an auth-checked route */
import { useEffect, useRef, useState } from "react";
import { mediaUrl } from "@/components/guest/PhotoGrid";
import { useT } from "@/components/I18nProvider";
import type { PhotoDto } from "@/lib/photos";

const POLL_MS = 5_000;
const SLIDE_MS = 6_000;

/**
 * Projector mode. New photos jump the queue so the room sees them within
 * seconds; between arrivals it cycles through the latest visible ones.
 */
export function LiveWall({ eventId, eventName, joinUrl }: { eventId: string; eventName: string; joinUrl: string }) {
  const t = useT();
  const [photos, setPhotos] = useState<PhotoDto[]>([]);
  const [current, setCurrent] = useState<PhotoDto | null>(null);
  const seen = useRef(new Set<string>());
  const fresh = useRef<PhotoDto[]>([]);
  const index = useRef(0);

  useEffect(() => {
    let alive = true;
    async function poll() {
      const res = await fetch(`/api/admin/events/${eventId}/photos?status=visible`).catch(() => null);
      if (!alive || !res?.ok) return;
      const data = (await res.json()) as { photos: PhotoDto[] };
      const unseen = data.photos.filter((p) => !seen.current.has(p.id));
      // The first poll fills the rotation; only later arrivals count as "new".
      if (seen.current.size > 0) fresh.current.push(...unseen.reverse());
      unseen.forEach((p) => seen.current.add(p.id));
      setPhotos(data.photos.slice(0, 40));
    }
    void poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [eventId]);

  useEffect(() => {
    const next = () => {
      const upcoming = fresh.current.shift();
      if (upcoming) return setCurrent(upcoming);
      if (photos.length === 0) return;
      index.current = (index.current + 1) % photos.length;
      setCurrent(photos[index.current]);
    };
    if (!current) next();
    const timer = setInterval(next, SLIDE_MS);
    return () => clearInterval(timer);
  }, [photos, current]);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black text-white">
      {current ? (
        <>
          <img key={`bg-${current.id}`} src={mediaUrl(current.id, "display")} alt="" className="absolute inset-0 size-full scale-110 object-cover opacity-30 blur-2xl" />
          <img
            key={current.id}
            src={mediaUrl(current.id, "display")}
            alt=""
            className="absolute inset-0 m-auto max-h-[86%] max-w-[86%] animate-[wall-in_700ms_ease-out] border-[10px] border-white object-contain shadow-2xl"
          />
          {current.guestName && (
            <p className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 px-5 py-2 text-2xl font-semibold">
              {t("admin.wall.by", { name: current.guestName })}
            </p>
          )}
        </>
      ) : (
        <p className="absolute inset-0 grid place-items-center text-4xl font-semibold text-white/60">{t("admin.wall.waiting")}</p>
      )}
      <div className="absolute top-6 left-8 space-y-1">
        <p className="text-lg text-white/70">{joinUrl.replace(/^https?:\/\//, "")}</p>
        <p className="text-4xl font-extrabold tracking-tight [font-stretch:80%]">{eventName}</p>
      </div>
    </div>
  );
}
