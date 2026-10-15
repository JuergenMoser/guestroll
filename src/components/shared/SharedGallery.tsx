"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { Lightbox } from "@/components/guest/Lightbox";
import { PhotoGrid } from "@/components/guest/PhotoGrid";
import { useT } from "@/components/I18nProvider";
import { Button, buttonClass, cn, EmptyState } from "@/components/ui";
import type { Challenge } from "@/lib/challenges";
import type { PhotoDto } from "@/lib/photos";

interface SharedGalleryProps {
  token: string;
  initialPhotos: PhotoDto[];
  initialCursor: number | null;
  total: number;
  allowDownload: boolean;
  challenges: Challenge[];
}

/** The album behind a gallery link: everyone's visible photos, as prints. */
export function SharedGallery({ token, initialPhotos, initialCursor, total, allowDownload, challenges }: SharedGalleryProps) {
  const t = useT();
  const [photos, setPhotos] = useState(initialPhotos);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [challengeId, setChallengeId] = useState("");

  async function fetchPage(challenge: string, before?: number) {
    const query = new URLSearchParams();
    if (challenge) query.set("challenge", challenge);
    if (before) query.set("before", String(before));
    const res = await fetch(`/api/g/${token}/photos?${query}`).catch(() => null);
    return res?.ok ? ((await res.json()) as { photos: PhotoDto[]; nextCursor: number | null }) : null;
  }

  async function loadMore() {
    if (cursor === null) return;
    setLoading(true);
    const data = await fetchPage(challengeId, cursor);
    if (data) {
      setPhotos((list) => [...list, ...data.photos.filter((p) => !list.some((q) => q.id === p.id))]);
      setCursor(data.nextCursor);
    }
    setLoading(false);
  }

  async function pick(id: string) {
    setChallengeId(id);
    setLoading(true);
    const data = await fetchPage(id);
    if (data) {
      setPhotos(data.photos);
      setCursor(data.nextCursor);
    }
    setLoading(false);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted tabular-nums">{t("shared.photos", { n: total })}</p>
        {allowDownload && total > 0 && (
          <a href={`/api/g/${token}/archive`} className={buttonClass("secondary", "sm")}>
            <Download className="size-4" aria-hidden />
            {t("shared.downloadAll")}
          </a>
        )}
      </div>
      {challenges.length > 0 && (
        <div role="radiogroup" aria-label={t("shared.byChallenge")} className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {[{ id: "", label: t("shared.allPhotos") }, ...challenges].map((c) => (
            <button
              key={c.id || "all"}
              type="button"
              role="radio"
              aria-checked={challengeId === c.id}
              onClick={() => pick(c.id)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                challengeId === c.id ? "bg-ink text-canvas" : "bg-surface text-ink ring-1 ring-line-2 hover:bg-sunken",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
      {photos.length === 0 ? <EmptyState>{t("shared.empty")}</EmptyState> : <PhotoGrid photos={photos} onOpen={setOpen} className="sm:grid-cols-4 lg:grid-cols-5" />}
      {cursor !== null && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={loadMore} loading={loading}>
            {t("common.loadMore")}
          </Button>
        </div>
      )}
      {open !== null && <Lightbox photos={photos} index={open} onIndex={setOpen} canDownload={() => allowDownload} />}
    </section>
  );
}
