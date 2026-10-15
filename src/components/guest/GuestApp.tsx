"use client";

import { EyeOff, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { CaptureHost } from "@/components/upload/CaptureHost";
import { Button, EmptyState, SegmentedControl } from "@/components/ui";
import type { PublicEvent } from "@/lib/events";
import type { PhotoDto } from "@/lib/photos";
import { GuestbookCard } from "@/components/guestbook/GuestbookCard";
import type { MessageDto } from "@/lib/messages";
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
  locale: string;
  initialMessages: MessageDto[];
}

const skipKey = (slug: string) => `guestroll:skip-name:${slug}`;

export function GuestApp({ event, guestName, initialPhotos, initialCursor, closedReason, remaining: initialRemaining, sentCount, contactEmail, locale, initialMessages }: GuestAppProps) {
  const t = useT();
  const [name, setName] = useState(guestName);
  const [askName, setAskName] = useState(false);
  const [photos, setPhotos] = useState(initialPhotos);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [sent, setSent] = useState(sentCount);
  const [open, setOpen] = useState<number | null>(null);
  // The shared album: loaded the first time the guest opens it.
  const [view, setView] = useState<"mine" | "all">("mine");
  const [album, setAlbum] = useState<{ photos: PhotoDto[]; cursor: number | null } | null>(null);
  // From the photos loaded so far: a guest with hundreds of photos may see a tick appear only after "Load more".
  const doneChallenges = useMemo(() => new Set(photos.map((p) => p.challengeId).filter((id): id is string => Boolean(id))), [photos]);

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
    setAlbum((a) => (a && photo.status === "visible" ? { ...a, photos: [photo, ...a.photos] } : a));
    setRemaining((n) => (n === null ? null : Math.max(n - 1, 0)));
    setSent((n) => n + 1);
  }, []);

  async function fetchPage(scope: "mine" | "all", before: number | null) {
    const query = new URLSearchParams(scope === "all" ? { scope: "all" } : {});
    if (before !== null) query.set("before", String(before));
    const res = await fetch(`/api/e/${event.slug}/photos?${query}`).catch(() => null);
    return res?.ok ? ((await res.json()) as { photos: PhotoDto[]; nextCursor: number | null }) : null;
  }

  const merge = (list: PhotoDto[], more: PhotoDto[]) => [...list, ...more.filter((p) => !list.some((q) => q.id === p.id))];

  async function loadMore() {
    setLoadingMore(true);
    if (view === "all" && album && album.cursor !== null) {
      const data = await fetchPage("all", album.cursor);
      if (data) setAlbum({ photos: merge(album.photos, data.photos), cursor: data.nextCursor });
    } else if (view === "mine" && cursor !== null) {
      const data = await fetchPage("mine", cursor);
      if (data) {
        setPhotos((list) => merge(list, data.photos));
        setCursor(data.nextCursor);
      }
    }
    setLoadingMore(false);
  }

  async function showView(next: "mine" | "all") {
    setView(next);
    setOpen(null);
    if (next === "all" && !album) {
      setLoadingMore(true);
      const data = await fetchPage("all", null);
      setAlbum(data ? { photos: data.photos, cursor: data.nextCursor } : { photos: [], cursor: null });
      setLoadingMore(false);
    }
  }

  const shown = view === "all" ? (album?.photos ?? []) : photos;
  const shownCursor = view === "all" ? (album?.cursor ?? null) : cursor;

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
      <CaptureHost event={event} doneChallenges={doneChallenges} closedReason={closedReason} remaining={remaining} sent={sent} onUploaded={onUploaded} />

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">{view === "all" ? t("guest.albumTitle") : t("guest.yourPhotos")}</h2>
          <p className="flex items-center gap-1.5 text-sm text-ink-muted">
            {event.sharedAlbum === "off" ? <EyeOff className="size-3.5 shrink-0" aria-hidden /> : <Users className="size-3.5 shrink-0" aria-hidden />}
            {event.sharedAlbum === "off" ? t("guest.privateNotice") : event.albumShared ? t("guest.sharedNotice") : t("guest.sharedLaterNotice")}
          </p>
        </div>

        {event.albumShared && (
          <SegmentedControl
            role="tabs"
            name={t("guest.albumTitle")}
            value={view}
            options={["mine", "all"] as const}
            onChange={showView}
            label={(v) => (v === "mine" ? t("guest.yourPhotos") : t("guest.albumTitle"))}
          />
        )}

        {shown.length === 0 ? (
          <EmptyState>{view === "all" ? (loadingMore ? t("common.loading") : t("guest.emptyAlbum")) : t("guest.emptyMine")}</EmptyState>
        ) : (
          <>
            <PhotoGrid photos={shown} onOpen={setOpen} />
            {view === "mine" && <p className="text-sm text-ink-muted">{t("guest.deleteHint")}</p>}
          </>
        )}

        {shownCursor !== null && (
          <div className="flex justify-center">
            <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
              {t("common.loadMore")}
            </Button>
          </div>
        )}
      </section>

      {event.guestbookEnabled && (
        <GuestbookCard slug={event.slug} voice={event.guestbookVoice} locale={locale} initialMessages={initialMessages} disabled={closedReason === "closed"} />
      )}

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
        <Lightbox
          photos={shown}
          index={open}
          onIndex={setOpen}
          canDownload={(p) => p.mine}
          onDelete={async (photo) => {
            const res = await fetch(`/api/e/${event.slug}/photos/${photo.id}`, { method: "DELETE" }).catch(() => null);
            if (!res?.ok) return;
            setPhotos((list) => list.filter((p) => p.id !== photo.id));
            setAlbum((a) => (a ? { ...a, photos: a.photos.filter((p) => p.id !== photo.id) } : a));
            // A deleted photo gives its slot back when there's a per-guest limit.
            setRemaining((n) => (n === null ? null : n + 1));
            setSent((n) => Math.max(n - 1, 0));
            setOpen(shown.length > 1 ? Math.min(open, shown.length - 2) : null);
          }}
        />
      )}
    </div>
  );
}
