"use client";

/* eslint-disable @next/next/no-img-element -- local object URLs, next/image can't optimise them */
import { Check, Film, RotateCcw, X } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { errorText } from "@/lib/i18n/errors";
import type { UploadItem } from "./useUploadQueue";

interface UploadTrayProps {
  items: UploadItem[];
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
}

/** Prints sliding out of the camera, one per photo in the queue. */
export function UploadTray({ items, onRetry, onDismiss }: UploadTrayProps) {
  const t = useT();
  if (items.length === 0) return null;
  const active = items.filter((i) => i.status !== "done" && i.status !== "error").length;
  const failed = items.find((i) => i.status === "error");

  return (
    <section aria-live="polite" className="space-y-2">
      <ul role="list" className="flex gap-3 overflow-x-auto px-1 pt-1 pb-2">
        {items.slice(0, 12).map((item) => (
          <li key={item.id} className="print relative w-20 shrink-0 animate-[print-in_420ms_cubic-bezier(.2,.8,.2,1)]">
            {item.preview ? (
              <img src={item.preview} alt="" className="aspect-square w-full object-cover" />
            ) : (
              <span className="grid aspect-square w-full place-items-center bg-ink text-canvas">
                <Film className="size-6" aria-hidden />
              </span>
            )}
            {item.video && item.preview && (
              <span className="absolute top-1.5 left-1.5 grid size-5 place-items-center rounded-full bg-ink/80 text-canvas">
                <Film className="size-3" aria-hidden />
              </span>
            )}
            {item.status === "done" ? (
              <span className="absolute right-1 bottom-1 grid size-5 place-items-center rounded-full bg-ok text-white" title={t("guest.uploaded")}>
                <Check className="size-3.5" aria-label={t("guest.uploaded")} />
              </span>
            ) : item.status === "error" ? (
              <span className="absolute inset-1.5 flex items-center justify-center gap-1 bg-white/85">
                <button type="button" onClick={() => onRetry(item.id)} aria-label={t("common.retry")} className="grid size-8 place-items-center rounded-md bg-ink text-white">
                  <RotateCcw className="size-4" />
                </button>
                <button type="button" onClick={() => onDismiss(item.id)} aria-label={t("common.close")} className="grid size-8 place-items-center rounded-md bg-surface ring-1 ring-line-2">
                  <X className="size-4" />
                </button>
              </span>
            ) : (
              <span className="absolute inset-x-1.5 bottom-1.5 h-1 bg-white/70">
                <span className="block h-full bg-ink transition-[width]" style={{ width: `${Math.max(Math.round(item.progress * 100), 4)}%` }} />
              </span>
            )}
          </li>
        ))}
      </ul>
      {active > 0 && <p className="text-sm text-ink-muted">{t(items.some((i) => i.resumed && i.status !== "done" && i.status !== "error") ? "guest.resumed" : "guest.uploading", { n: active })}</p>}
      {failed && (
        <p role="alert" className="text-sm font-medium text-danger">
          {errorText(t, failed.error)}
        </p>
      )}
    </section>
  );
}
