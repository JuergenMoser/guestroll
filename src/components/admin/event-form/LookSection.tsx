"use client";

import { useT } from "@/components/I18nProvider";
import { SegmentedControl, Switch } from "@/components/ui";
import { FRAMES } from "@/lib/effects";
import { FormSection } from "./FormSection";
import type { SectionProps } from "./state";

export function LookSection({ form, set }: SectionProps) {
  const t = useT();
  return (
    <FormSection title={t("admin.look.title")}>
      <div className="space-y-2">
        <p className="text-sm font-medium">{t("admin.look.frame")}</p>
        <SegmentedControl name={t("admin.look.frame")} value={form.frame} options={FRAMES} onChange={(v) => set("frame", v)} label={(v) => t(`admin.look.frames.${v}`)} />
        <p className="text-xs text-ink-muted">{t(`admin.look.frameHints.${form.frame}`)}</p>
      </div>
      <Switch label={t("admin.look.filters")} hint={t("admin.look.filtersHint")} checked={form.captureFilters} onChange={(v) => set("captureFilters", v)} />
    </FormSection>
  );
}
