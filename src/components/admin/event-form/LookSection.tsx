"use client";

import { useT } from "@/components/I18nProvider";
import { cn, Switch } from "@/components/ui";
import { FRAMES, type Frame } from "@/lib/effects";
import { FormSection } from "./FormSection";
import type { SectionProps } from "./state";

/** A sketch of what each frame does to a photo, in the event's color. */
function FramePreview({ frame }: { frame: Frame }) {
  const photo = <span className="block size-full rounded-[2px] bg-gradient-to-br from-ink-faint/50 to-ink-faint/20" />;
  return (
    <span className="grid aspect-[4/3] w-full place-items-stretch overflow-hidden rounded-md bg-sunken p-2" aria-hidden>
      {frame === "none" && photo}
      {frame === "print" && (
        <span className="flex flex-col gap-1 rounded-[2px] bg-white p-1 pb-0 shadow-sm">
          {photo}
          <span className="mx-auto mb-1 h-1 w-1/2 rounded-full bg-ink/30" />
        </span>
      )}
      {frame === "border" && (
        <span className="flex flex-col gap-1 rounded-[2px] bg-accent p-1">
          {photo}
          <span className="mb-0.5 h-1 w-1/2 rounded-full bg-accent-ink/40" />
        </span>
      )}
      {frame === "stamp" && (
        <span className="relative block">
          {photo}
          <span className="absolute right-1 bottom-1 size-3 rounded-full bg-accent ring-2 ring-white" />
        </span>
      )}
    </span>
  );
}

export function LookSection({ form, set }: SectionProps) {
  const t = useT();
  return (
    <FormSection id="look" title={t("admin.look.title")} description={t("admin.form.sectionHints.look")}>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("admin.look.frame")}</legend>
        <div role="radiogroup" aria-label={t("admin.look.frame")} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FRAMES.map((frame) => (
            <label
              key={frame}
              className={cn(
                "flex cursor-pointer flex-col gap-2 rounded-lg p-2 ring-1 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink",
                form.frame === frame ? "bg-surface ring-2 ring-ink" : "ring-line hover:bg-surface/60",
              )}
            >
              <input type="radio" name="frame" value={frame} checked={form.frame === frame} onChange={() => set("frame", frame)} className="sr-only" />
              <FramePreview frame={frame} />
              <span className="text-sm font-medium">{t(`admin.look.frames.${frame}`)}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-ink-muted">{t(`admin.look.frameHints.${form.frame}`)}</p>
      </fieldset>
      <Switch label={t("admin.look.filters")} hint={t("admin.look.filtersHint")} checked={form.captureFilters} onChange={(v) => set("captureFilters", v)} />
    </FormSection>
  );
}
