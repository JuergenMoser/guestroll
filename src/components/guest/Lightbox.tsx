"use client";

/* eslint-disable @next/next/no-img-element -- photos come from an auth-checked route */
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useCallback, useEffect } from "react";
import { useT } from "@/components/I18nProvider";
import { buttonClass } from "@/components/ui";
import type { PhotoDto } from "@/lib/photos";
import { mediaUrl } from "./PhotoGrid";

interface LightboxProps {
  photos: PhotoDto[];
  index: number;
  onIndex: (index: number | null) => void;
  canDownload: (photo: PhotoDto) => boolean;
}

export function Lightbox({ photos, index, onIndex, canDownload }: LightboxProps) {
  const t = useT();
  const photo = photos[index];
  const go = useCallback((delta: number) => onIndex((index + delta + photos.length) % photos.length), [index, onIndex, photos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onIndex(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onIndex]);

  if (!photo) return null;
  return (
    <div role="dialog" aria-modal className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white">
      <div className="flex items-center justify-between p-3">
        <span className="text-sm text-white/70">{photo.guestName ?? ""}</span>
        <div className="flex gap-2">
          {canDownload(photo) && (
            <a href={mediaUrl(photo.id, "original", true)} className={buttonClass("secondary", "sm")}>
              <Download className="size-4" aria-hidden />
              {t("guest.download")}
            </a>
          )}
          <button type="button" onClick={() => onIndex(null)} className={buttonClass("ghost", "sm", "text-white hover:bg-white/10 hover:text-white")} aria-label={t("common.close")}>
            <X className="size-5" />
          </button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-6">
        <img key={photo.id} src={mediaUrl(photo.id, "display")} alt="" className="max-h-full max-w-full object-contain" />
        {photos.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label={t("common.previous")} className="absolute left-2 grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20">
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label={t("common.next")} className="absolute right-2 grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20">
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
