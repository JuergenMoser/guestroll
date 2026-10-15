"use client";

import { useT } from "@/components/I18nProvider";
import { Switch } from "@/components/ui";
import { FormSection } from "./FormSection";
import type { SectionProps } from "./state";

export function GuestbookSection({ form, set }: SectionProps) {
  const t = useT();
  return (
    <FormSection id="guestbook" title={t("guestbook.title")} description={t("admin.form.sectionHints.guestbook")}>
      <Switch label={t("admin.form.guestbookEnabled")} hint={t("admin.form.guestbookEnabledHint")} checked={form.guestbookEnabled} onChange={(v) => set("guestbookEnabled", v)} />
      {form.guestbookEnabled && (
        <div className="space-y-5 border-l-2 border-line pl-4">
          <Switch label={t("admin.form.guestbookVoice")} hint={t("admin.form.guestbookVoiceHint")} checked={form.guestbookVoice} onChange={(v) => set("guestbookVoice", v)} />
          <Switch label={t("admin.form.guestbookInGallery")} hint={t("admin.form.guestbookInGalleryHint")} checked={form.guestbookInGallery} onChange={(v) => set("guestbookInGallery", v)} />
        </div>
      )}
    </FormSection>
  );
}
