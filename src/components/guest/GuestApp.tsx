"use client";

import { EyeOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { CaptureHost } from "@/components/upload/CaptureHost";
import { Button } from "@/components/ui";
import type { PublicEvent } from "@/lib/events";
import type { PhotoDto } from "@/lib/photos";
import { Lightbox } from "./Lightbox";
import { NamePrompt } from "./NamePrompt";
import { PhotoGrid } from "./PhotoGrid";

interface GuestAppProps {
  event: PublicEvent;
  guestName: string | null;
  initialPhotos: PhotoDto[];
  initialCursor: number | null;
  closedReason: "closed" | "quota" | null;
  remaining: number | null;
}

const skipKey = (slug: string) => `guestroll:skip-name:${slug}`;

export function GuestApp({ event, guestName, initialPhotos, initialCursor, closedReason, remaining: initialRemaining }: GuestAppProps) {
  const t = useT();
  const [name, setName] = useState(guestName);
  const [askName, setAskName] = useState(false);
  const [photos, setPhotos] = useState(initialPhotos);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (!event.askGuestName || guestName) return;
    let skipped = false;
    try {
      skipped = localStorage.getItem(skipKey(event.slug)) === "1";
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    if (!skipped) setAskName(true);
  }, [event.askGuestName, event.slug, guestName]);

  const onUploaded = useCallback((photo: PhotoDto) => {
    setPhotos((list) => [photo, ...list]);
    setRemaining((n) => (n === null ? null : Math.max(n - 1, 0)));
  }, []);

  async function loadMore() {
    if (cursor === null) return;
    setLoadingMore(true);
    const res = await fetch(`/api/e/${event.slug}/photos?before=${cursor}`).catch(() => null);
    if (res?.ok) {
      const data = (await res.json()) as { photos: PhotoDto[]; nextCursor: number | null };
      setPhotos((list) => [...list, ...data.photos.filter((p) => !list.some((q) => q.id === p.id))]);
      setCursor(data.nextCursor);
    }
    setLoadingMore(false);
  }

  if (askName) {
    return (
      <NamePrompt
        slug={event.slug}
        initial={name ?? ""}
        onDone={(value) => {
          if (value) setName(value);
          else
            try {
              localStorage.setItem(skipKey(event.slug), "1");
            } catch {}
          setAskName(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-10">
      <CaptureHost event={event} closedReason={closedReason} remaining={remaining} onUploaded={onUploaded} />

      {event.askGuestName && name && (
        <p className="text-center text-xs text-ink-400">
          {t("guest.signedAs", { name })}{" "}
          <button type="button" onClick={() => setAskName(true)} className="underline underline-offset-2 hover:text-paper">
            {t("guest.changeName")}
          </button>
        </p>
      )}

      <section className="space-y-3">
        <h2 className="kicker">{t("guest.yourPhotos")}</h2>
        <p className="flex items-center gap-2 text-xs text-ink-400">
          <EyeOff className="size-3.5" aria-hidden />
          {t("guest.privateNotice")}
        </p>

        {photos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink-700 py-10 text-center text-sm text-ink-400">{t("guest.emptyMine")}</p>
        ) : (
          <PhotoGrid photos={photos} onOpen={setOpen} />
        )}

        {cursor !== null && (
          <div className="flex justify-center">
            <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
              {t("common.loadMore")}
            </Button>
          </div>
        )}
      </section>

      {open !== null && (
        <Lightbox photos={photos} index={open} onIndex={setOpen} canDownload={(p) => p.mine} />
      )}
    </div>
  );
}
