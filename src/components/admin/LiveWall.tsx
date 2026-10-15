"use client";

/* eslint-disable @next/next/no-img-element -- photos come from an auth-checked route */
import { useEffect, useMemo, useRef, useState } from "react";
import { mediaUrl } from "@/components/guest/PhotoGrid";
import { useT } from "@/components/I18nProvider";
import { cn } from "@/components/ui";
import type { AdminEvent } from "@/lib/events";
import type { MessageDto } from "@/lib/messages";
import type { PhotoDto } from "@/lib/photos";
import type { WallStyle } from "@/lib/wall";

const POLL_MS = 5_000;
const STYLE_POLL_MS = 20_000;
// In the single layout, one slide in this many is a guestbook message when there are some.
const MESSAGE_EVERY = 4;

type Slide = { kind: "photo"; photo: PhotoDto } | { kind: "message"; message: MessageDto };

interface LiveWallProps {
  eventId: string;
  eventName: string;
  joinUrl: string;
  initialStyle: WallStyle;
  challenges: AdminEvent["challenges"];
}

/** Polls the admin APIs: the wall runs in a signed-in browser, so it sees exactly what the hosts approved. */
function useWallData(eventId: string, style: WallStyle) {
  const [photos, setPhotos] = useState<PhotoDto[]>([]);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const seen = useRef(new Set<string>());
  const fresh = useRef<PhotoDto[]>([]);

  useEffect(() => {
    let alive = true;
    seen.current = new Set();
    fresh.current = [];
    async function poll() {
      const query = style.favoritesOnly ? "status=visible&favorites=1" : "status=visible";
      const res = await fetch(`/api/admin/events/${eventId}/photos?${query}`).catch(() => null);
      if (alive && res?.ok) {
        const data = (await res.json()) as { photos: PhotoDto[] };
        const unseen = data.photos.filter((p) => !seen.current.has(p.id));
        // The first poll fills the rotation; only later arrivals count as "new".
        if (seen.current.size > 0) fresh.current.push(...unseen.reverse());
        unseen.forEach((p) => seen.current.add(p.id));
        setPhotos(data.photos.slice(0, 60));
      }
      if (!style.showMessages) return setMessages([]);
      const m = await fetch(`/api/admin/events/${eventId}/messages?status=visible`).catch(() => null);
      if (alive && m?.ok) setMessages(((await m.json()) as { messages: MessageDto[] }).messages.filter((x) => x.text).slice(0, 30));
    }
    void poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [eventId, style.favoritesOnly, style.showMessages]);

  return { photos, messages, fresh };
}

/** The hosts may change the wall from another tab: it picks the new settings up without a reload. */
function useLiveStyle(eventId: string, initial: WallStyle) {
  const [style, setStyle] = useState(initial);
  useEffect(() => {
    const timer = setInterval(async () => {
      const res = await fetch(`/api/admin/events/${eventId}`).catch(() => null);
      if (res?.ok) {
        const next = ((await res.json()) as { event: AdminEvent }).event.wallStyle;
        setStyle((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
      }
    }, STYLE_POLL_MS);
    return () => clearInterval(timer);
  }, [eventId]);
  return style;
}

/** Projector mode: new photos jump the queue so the room sees them within seconds. */
export function LiveWall({ eventId, eventName, joinUrl, initialStyle, challenges }: LiveWallProps) {
  const t = useT();
  const style = useLiveStyle(eventId, initialStyle);
  const { photos, messages, fresh } = useWallData(eventId, style);
  const [tick, setTick] = useState(0);
  const [current, setCurrent] = useState<Slide | null>(null);
  const index = useRef(0);
  const labels = useMemo(() => new Map(challenges.map((c) => [c.id, c.label])), [challenges]);

  const caption = (photo: PhotoDto) => {
    const challenge = style.showChallenges && photo.challengeId ? labels.get(photo.challengeId) : undefined;
    const name = style.showNames && photo.guestName ? photo.guestName : undefined;
    if (challenge && name) return t("admin.wall.challengeBy", { challenge, name });
    if (challenge) return challenge;
    return name ? t("admin.wall.by", { name }) : "";
  };

  const [lead, setLead] = useState<PhotoDto | null>(null);
  const latest = useRef({ photos, messages, layout: style.layout });
  useEffect(() => {
    latest.current = { photos, messages, layout: style.layout };
  }, [photos, messages, style.layout]);

  // On every tick: a new arrival leads (the single slide, or the big mosaic
  // tile); otherwise the single layout moves to the next slide. Runs in the
  // timer, reading the latest data through a ref, so it never restarts the clock.
  useEffect(() => {
    let n = 0;
    const advance = () => {
      n += 1;
      setTick(n);
      const { photos, messages, layout } = latest.current;
      const upcoming = fresh.current.shift() ?? null;
      if (layout !== "single") return setLead(upcoming);
      if (upcoming) return setCurrent({ kind: "photo", photo: upcoming });
      if (messages.length && n % MESSAGE_EVERY === MESSAGE_EVERY - 1) {
        return setCurrent({ kind: "message", message: messages[Math.floor(n / MESSAGE_EVERY) % messages.length] });
      }
      if (!photos.length) return setCurrent(null);
      index.current = (index.current + 1) % photos.length;
      setCurrent({ kind: "photo", photo: photos[index.current] });
    };
    // The first slide shows as soon as data arrives, then one per `slideSeconds`.
    const first = setTimeout(advance, 600);
    const timer = setInterval(advance, style.slideSeconds * 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [style.slideSeconds, fresh]);

  // Mosaic and grid: the rotation moves one step per tick, behind the new arrival if there is one.
  const offset = photos.length ? tick % photos.length : 0;
  const ordered = useMemo(() => {
    const rotated = [...photos.slice(offset), ...photos.slice(0, offset)];
    return lead ? [lead, ...rotated.filter((p) => p.id !== lead.id)] : rotated;
  }, [photos, offset, lead]);

  const message = messages.length ? messages[Math.floor(tick / 2) % messages.length] : null;
  const empty = photos.length === 0 && !(current?.kind === "message");

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-black text-white">
      <header className="flex shrink-0 items-baseline justify-between gap-6 px-10 pt-7 pb-4">
        <p className="truncate text-4xl font-extrabold tracking-tight [font-stretch:80%]">{eventName}</p>
        {!style.showQr && <p className="shrink-0 text-xl text-white/60">{joinUrl.replace(/^https?:\/\//, "")}</p>}
      </header>

      <main className="relative min-h-0 flex-1 px-10 pb-10">
        {empty ? (
          <p className="grid h-full place-items-center text-4xl font-semibold text-white/60">{t("admin.wall.waiting")}</p>
        ) : style.layout === "single" ? (
          <SingleSlide slide={current ?? (photos[0] ? { kind: "photo", photo: photos[0] } : null)} caption={caption} />
        ) : (
          <TileWall layout={style.layout} photos={ordered} caption={caption} />
        )}
      </main>

      {style.layout !== "single" && style.showMessages && message && (
        <footer key={message.id} className={cn("mx-10 mb-8 flex shrink-0 animate-[wall-in_700ms_ease-out] items-baseline gap-4 rounded-xl bg-white/10 px-6 py-4 text-2xl", style.showQr && "mr-[calc(16vh+18rem)]")}>
          <span className="line-clamp-2 flex-1 text-pretty">“{message.text}”</span>
          {message.guestName && <span className="shrink-0 text-white/60">{message.guestName}</span>}
        </footer>
      )}

      {style.showQr && (
        <aside className="absolute right-8 bottom-8 flex items-center gap-4 rounded-2xl bg-white p-4 text-[#1a1b1d] shadow-2xl">
          <img src={`/api/admin/events/${eventId}/qr?format=svg`} alt="" className="size-[16vh] min-h-24" />
          <p className="max-w-48 text-[clamp(1rem,2.2vh,1.6rem)] leading-tight font-bold text-balance">{t("admin.wall.scan")}</p>
        </aside>
      )}
    </div>
  );
}

function SingleSlide({ slide, caption }: { slide: Slide | null; caption: (p: PhotoDto) => string }) {
  if (!slide) return null;
  if (slide.kind === "message") {
    return (
      <figure key={slide.message.id} className="grid h-full animate-[wall-in_700ms_ease-out] place-items-center">
        <blockquote className="max-w-[70vw] space-y-6 text-center">
          <p className="text-[clamp(2rem,5vh,4.5rem)] leading-tight font-bold text-balance">“{slide.message.text}”</p>
          {slide.message.guestName && <footer className="text-[clamp(1.25rem,3vh,2.25rem)] text-white/60">{slide.message.guestName}</footer>}
        </blockquote>
      </figure>
    );
  }
  const photo = slide.photo;
  return (
    <div className="relative grid h-full place-items-center">
      <img key={`bg-${photo.id}`} src={mediaUrl(photo.id, "display")} alt="" className="absolute inset-0 size-full scale-110 object-cover opacity-25 blur-3xl" />
      {/* A print: white border, wider at the bottom where the photographer is credited. */}
      <figure key={photo.id} className="relative flex max-h-full animate-[wall-in_700ms_ease-out] flex-col bg-white p-[1.2vh] pb-0 shadow-2xl">
        <img src={mediaUrl(photo.id, "display")} alt="" className="max-h-[calc(100dvh-14rem)] max-w-[80vw] object-contain" />
        <figcaption className="flex h-[7vh] min-h-12 items-center justify-center px-4 text-[clamp(1rem,2.4vh,1.75rem)] font-semibold text-[#1a1b1d]">{caption(photo)}</figcaption>
      </figure>
    </div>
  );
}

const TILE_COUNT = { mosaic: 5, grid: 15 } as const;

function TileWall({ layout, photos, caption }: { layout: "mosaic" | "grid"; photos: PhotoDto[]; caption: (p: PhotoDto) => string }) {
  const tiles = photos.slice(0, TILE_COUNT[layout]);
  return (
    <ul role="list" className={cn("grid h-full gap-3", layout === "mosaic" ? "grid-cols-4 grid-rows-2" : "grid-cols-5 grid-rows-3")}>
      {tiles.map((photo, i) => {
        const text = caption(photo);
        return (
          <li key={photo.id} className={cn("relative min-h-0 animate-[wall-in_700ms_ease-out] overflow-hidden rounded-lg bg-white/5", layout === "mosaic" && i === 0 && "col-span-2 row-span-2")}>
            {/* The whole photo, never cropped: the thumbnail is a square crop, so the display
                copy is shown fitted, over a blurred copy of itself that fills the tile. */}
            <img src={mediaUrl(photo.id, "thumb")} alt="" className="absolute inset-0 size-full scale-110 object-cover opacity-40 blur-xl" />
            <img src={mediaUrl(photo.id, "display")} alt="" className="relative size-full object-contain" />
            {text && (
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-3 pt-8 pb-2 text-[clamp(0.9rem,1.8vh,1.4rem)] font-semibold">
                {text}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
