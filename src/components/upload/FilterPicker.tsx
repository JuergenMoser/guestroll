"use client";

import { useT } from "@/components/I18nProvider";
import { cn } from "@/components/ui";
import { FILTERS, type Filter } from "@/lib/effects";

// A gradient per filter, so the chip hints at the look without decoding a photo.
const SWATCH: Record<Filter, string> = {
  none: "linear-gradient(135deg,#7aa7d9,#f2c66d)",
  bw: "linear-gradient(135deg,#222,#ddd)",
  warm: "linear-gradient(135deg,#d9894a,#f6d38b)",
  vintage: "linear-gradient(135deg,#8a6a4a,#e5cfa5)",
  vivid: "linear-gradient(135deg,#0a84ff,#ff375f)",
};

/** Applied to the next photos when they're sent, never to ones already queued. */
export function FilterPicker({ value, onChange }: { value: Filter; onChange: (filter: Filter) => void }) {
  const t = useT();
  return (
    <div role="radiogroup" aria-label={t("guest.filters")} className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
      {FILTERS.map((f) => (
        <button
          key={f}
          type="button"
          role="radio"
          aria-checked={value === f}
          onClick={() => onChange(f)}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-full py-1.5 pr-3.5 pl-1.5 text-sm font-medium transition-colors",
            value === f ? "bg-ink text-canvas" : "bg-surface text-ink ring-1 ring-line-2 hover:bg-sunken",
          )}
        >
          <span className="size-6 rounded-full ring-1 ring-black/10" style={{ background: SWATCH[f] }} aria-hidden />
          {t(`guest.filterNames.${f}`)}
        </button>
      ))}
    </div>
  );
}
