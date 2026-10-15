"use client";

import { useT } from "@/components/I18nProvider";

/**
 * The little window on a disposable camera that counts the shots left. Here it
 * counts the guest's quota, or the photos sent when there's no limit.
 */
export function ExposureCounter({ remaining, sent }: { remaining: number | null; sent: number }) {
  const t = useT();
  const value = remaining ?? sent;
  return (
    <div className="flex flex-col items-center gap-1" aria-live="polite">
      <span className="grid h-11 min-w-14 place-items-center rounded-md bg-[#1a1b1d] px-2.5 text-2xl font-semibold tabular-nums text-stamp shadow-[inset_0_2px_4px_rgb(0_0_0/0.6)]">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-xs font-medium text-accent-ink/75">{remaining === null ? t("guest.counterSent") : t("guest.counterLeft")}</span>
    </div>
  );
}
