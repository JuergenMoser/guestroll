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
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-black text-white">
      <header className="flex shrink-0 items-baseline justify-between gap-6 px-10 pt-7 pb-4">
        <p className="truncate text-4xl font-extrabold tracking-tight [font-stretch:80%]">{eventName}</p>
        <p className="shrink-0 text-xl text-white/60">{joinUrl.replace(/^https?:\/\//, "")}</p>
      </header>
      <main className="relative grid min-h-0 flex-1 place-items-center px-10 pb-10">
        {current ? (
          <>
            <img key={`bg-${current.id}`} src={mediaUrl(current.id, "display")} alt="" className="absolute inset-0 size-full scale-110 object-cover opacity-25 blur-3xl" />
            {/* A print: white border, wider at the bottom where the photographer is credited. */}
            <figure key={current.id} className="relative flex max-h-full animate-[wall-in_700ms_ease-out] flex-col bg-white p-[1.2vh] pb-0 shadow-2xl">
              <img src={mediaUrl(current.id, "display")} alt="" className="max-h-[calc(100dvh-14rem)] max-w-[80vw] object-contain" />
              <figcaption className="flex h-[7vh] min-h-12 items-center justify-center text-[clamp(1rem,2.4vh,1.75rem)] font-semibold text-[#1a1b1d]">
                {current.guestName ? t("admin.wall.by", { name: current.guestName }) : ""}
              </figcaption>
            </figure>
          </>
        ) : (
          <p className="text-4xl font-semibold text-white/60">{t("admin.wall.waiting")}</p>
        )}
      </main>
    </div>
  );
}
