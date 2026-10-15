"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { Lightbox } from "@/components/guest/Lightbox";
import { PhotoGrid } from "@/components/guest/PhotoGrid";
import { useT } from "@/components/I18nProvider";
import { Button, buttonClass, EmptyState } from "@/components/ui";
import type { PhotoDto } from "@/lib/photos";

interface SharedGalleryProps {
  token: string;
  initialPhotos: PhotoDto[];
  initialCursor: number | null;
  total: number;
  allowDownload: boolean;
}

/** The album behind a gallery link: everyone's visible photos, as prints. */
export function SharedGallery({ token, initialPhotos, initialCursor, total, allowDownload }: SharedGalleryProps) {
  const t = useT();
  const [photos, setPhotos] = useState(initialPhotos);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  async function loadMore() {
    if (cursor === null) return;
    setLoading(true);
    const res = await fetch(`/api/g/${token}/photos?before=${cursor}`).catch(() => null);
    if (res?.ok) {
      const data = (await res.json()) as { photos: PhotoDto[]; nextCursor: number | null };
      setPhotos((list) => [...list, ...data.photos.filter((p) => !list.some((q) => q.id === p.id))]);
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
