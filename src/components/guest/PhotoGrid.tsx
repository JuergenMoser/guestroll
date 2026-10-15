"use client";

/* eslint-disable @next/next/no-img-element -- photos come from an auth-checked route, not a static asset */
import { Clock } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { cn } from "@/components/ui";
import type { PhotoDto } from "@/lib/photos";

export const mediaUrl = (id: string, variant: "thumb" | "display" | "original", download = false) =>
  `/api/media/${id}?v=${variant}${download ? "&download=1" : ""}`;

interface PhotoGridProps {
  photos: PhotoDto[];
  onOpen?: (index: number) => void;
  selected?: ReadonlySet<string>;
  onToggle?: (id: string) => void;
  className?: string;
}

export function PhotoGrid({ photos, onOpen, selected, onToggle, className }: PhotoGridProps) {
  const t = useT();
  return (
    <ul role="list" className={cn("grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-6", className)}>
      {photos.map((photo, index) => {
        const isSelected = selected?.has(photo.id) ?? false;
        return (
          <li key={photo.id} className="relative aspect-square">
            <button
              type="button"
              onClick={() => (onToggle ? onToggle(photo.id) : onOpen?.(index))}
              aria-pressed={onToggle ? isSelected : undefined}
              aria-label={photo.guestName ?? t("admin.anonymous")}
              className={cn(
                "block size-full overflow-hidden rounded-md bg-ink-800 focus-visible:outline-2 focus-visible:outline-accent",
                isSelected && "ring-3 ring-accent ring-inset",
              )}
            >
              <img
                src={mediaUrl(photo.id, "thumb")}
                alt=""
                loading="lazy"
                decoding="async"
                className={cn("size-full object-cover transition", isSelected && "scale-90 rounded", photo.status === "hidden" && "opacity-30")}
              />
            </button>
            {photo.status === "pending" && (
              <span className="pointer-events-none absolute top-1 left-1 rounded-full bg-ink-950/80 p-1" title={t("guest.pendingReview")}>
                <Clock className="size-3 text-accent" aria-label={t("guest.pendingReview")} />
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
