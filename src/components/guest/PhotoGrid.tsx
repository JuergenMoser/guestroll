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
  /** `prints`: white-bordered prints for guests. `sheet`: a tight contact sheet for admins. */
  variant?: "prints" | "sheet";
  className?: string;
}

export function PhotoGrid({ photos, onOpen, selected, onToggle, variant = "prints", className }: PhotoGridProps) {
  const t = useT();
  const sheet = variant === "sheet";
  return (
    <ul
      role="list"
      className={cn(sheet ? "grid grid-cols-3 gap-1 sm:grid-cols-5 lg:grid-cols-8" : "grid grid-cols-3 gap-3 sm:grid-cols-4", className)}
    >
      {photos.map((photo, index) => {
        const isSelected = selected?.has(photo.id) ?? false;
        return (
          <li key={photo.id} className={cn("relative", !sheet && "print")}>
            <button
              type="button"
              onClick={() => (onToggle ? onToggle(photo.id) : onOpen?.(index))}
              aria-pressed={onToggle ? isSelected : undefined}
              aria-label={photo.guestName ?? t("admin.anonymous")}
              className="block aspect-square w-full overflow-hidden bg-sunken focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ink"
            >
              <img
                src={mediaUrl(photo.id, "thumb")}
                alt=""
                loading="lazy"
                decoding="async"
                className={cn("size-full object-cover", photo.status === "hidden" && "opacity-30 grayscale")}
              />
            </button>
            {isSelected && <span className="pointer-events-none absolute inset-0 ring-4 ring-accent ring-inset" />}
            {photo.status === "pending" && (
              <span
                className={cn("pointer-events-none absolute grid size-6 place-items-center rounded-full bg-surface text-ink shadow-sm", sheet ? "top-1 left-1" : "top-2.5 left-2.5")}
                title={t("guest.pendingReview")}
              >
                <Clock className="size-3.5" aria-label={t("guest.pendingReview")} />
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
