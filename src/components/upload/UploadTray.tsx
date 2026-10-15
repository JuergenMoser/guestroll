"use client";

/* eslint-disable @next/next/no-img-element -- local object URLs, next/image can't optimise them */
import { Check, RotateCcw, X } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { errorText } from "@/lib/i18n/errors";
import type { UploadItem } from "./useUploadQueue";

interface UploadTrayProps {
  items: UploadItem[];
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function UploadTray({ items, onRetry, onDismiss }: UploadTrayProps) {
  const t = useT();
  if (items.length === 0) return null;
  const active = items.filter((i) => i.status !== "done" && i.status !== "error").length;

  return (
    <section aria-live="polite" className="space-y-2">
      {active > 0 && <p className="kicker">{t("guest.uploading", { n: active })}</p>}
      <ul role="list" className="flex gap-2 overflow-x-auto pb-1">
        {items.slice(0, 12).map((item) => (
          <li key={item.id} className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-ink-800 ring-1 ring-ink-700">
            <img src={item.preview} alt="" className="size-full object-cover" />
            {item.status === "uploading" || item.status === "compressing" || item.status === "queued" ? (
              <span className="absolute inset-x-0 bottom-0 h-1 bg-ink-950/60">
                <span className="block h-full bg-accent transition-[width]" style={{ width: `${Math.round(item.progress * 100)}%` }} />
              </span>
            ) : item.status === "done" ? (
              <span className="absolute inset-0 grid place-items-center bg-ink-950/40" title={t("guest.uploaded")}>
                <Check className="size-6 text-ok" aria-label={t("guest.uploaded")} />
              </span>
            ) : (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-ink-950/70 p-1 text-center">
                <span className="sr-only">{errorText(t, item.error)}</span>
                <span className="flex gap-1">
                  <button type="button" onClick={() => onRetry(item.id)} aria-label={t("common.retry")} className="rounded-full bg-ink-800 p-1">
                    <RotateCcw className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => onDismiss(item.id)} aria-label={t("common.close")} className="rounded-full bg-ink-800 p-1">
                    <X className="size-3.5" />
                  </button>
                </span>
              </span>
            )}
          </li>
        ))}
      </ul>
      {items
        .filter((i) => i.status === "error")
        .slice(0, 1)
        .map((i) => (
          <p key={i.id} role="alert" className="text-sm text-danger">
            {errorText(t, i.error)}
          </p>
        ))}
    </section>
  );
}
