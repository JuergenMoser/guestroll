"use client";

import { EyeOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { CaptureHost } from "@/components/upload/CaptureHost";
import { Button, EmptyState } from "@/components/ui";
import type { PublicEvent } from "@/lib/events";
import type { PhotoDto } from "@/lib/photos";
import { GuestContactCard } from "./GuestContactCard";
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
  sentCount: number;
  contactEmail: string | null;
}

const skipKey = (slug: string) => `guestroll:skip-name:${slug}`;

export function GuestApp({ event, guestName, initialPhotos, initialCursor, closedReason, remaining: initialRemaining, sentCount, contactEmail }: GuestAppProps) {
  const t = useT();
  const [name, setName] = useState(guestName);
  const [askName, setAskName] = useState(false);
  const [photos, setPhotos] = useState(initialPhotos);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [sent, setSent] = useState(sentCount);
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
    setSent((n) => n + 1);
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
    <div className="space-y-9">
      <CaptureHost event={event} closedReason={closedReason} remaining={remaining} sent={sent} onUploaded={onUploaded} />

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">{t("guest.yourPhotos")}</h2>
          <p className="flex items-center gap-1.5 text-sm text-ink-muted">
            <EyeOff className="size-3.5 shrink-0" aria-hidden />
            {t("guest.privateNotice")}
          </p>
        </div>

        {photos.length === 0 ? (
          <EmptyState>{t("guest.emptyMine")}</EmptyState>
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

      {event.collectGuestEmails && <GuestContactCard slug={event.slug} initialEmail={contactEmail} />}

      {event.askGuestName && name && (
        <p className="text-sm text-ink-muted">
          {t("guest.signedAs", { name })}{" "}
          <button type="button" onClick={() => setAskName(true)} className="font-medium text-ink underline underline-offset-2">
            {t("guest.changeName")}
          </button>
        </p>
      )}

      {open !== null && (
        <Lightbox photos={photos} index={open} onIndex={setOpen} canDownload={(p) => p.mine} />
      )}
    </div>
  );
}
