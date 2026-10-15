"use client";

import { useT } from "@/components/I18nProvider";
import { Field, Input, Switch } from "@/components/ui";
import { FormSection } from "./FormSection";
import type { SectionProps } from "./state";

/** What happens once uploads close: the admin summary and the gallery link for guests. */
export function AfterSection({ form, set, errors }: SectionProps) {
  const t = useT();
  return (
    <FormSection id="after" title={t("admin.form.sectionAfter")} description={t("admin.form.afterHint")}>
      <Switch label={t("admin.form.notifyAdminSummary")} checked={form.notifyAdminSummary} onChange={(v) => set("notifyAdminSummary", v)} />
      <Switch label={t("admin.form.collectGuestEmails")} checked={form.collectGuestEmails} onChange={(v) => set("collectGuestEmails", v)} />
      <Switch
        label={t("admin.form.emailGuestsGallery")}
        checked={form.emailGuestsGallery}
        onChange={(v) => {
          set("emailGuestsGallery", v);
          // Sending the link needs addresses to send it to.
          if (v) set("collectGuestEmails", true);
        }}
      />
      {form.emailGuestsGallery && (
        <div className="space-y-5 border-l-2 border-line pl-4">
          <Field label={t("admin.form.galleryLinkDays")} hint={t("admin.form.galleryLinkDaysHint")} error={errors.galleryLinkDays}>
            {(id, describedBy) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                type="number"
                min={0}
                max={3650}
                value={form.galleryLinkDays}
                onChange={(e) => set("galleryLinkDays", Number(e.target.value) || 0)}
                className="max-w-32"
              />
            )}
          </Field>
          <Switch label={t("admin.form.galleryLinkDownload")} checked={form.galleryLinkDownload} onChange={(v) => set("galleryLinkDownload", v)} />
          <Switch
            label={t("admin.form.galleryLinkFavorites")}
            hint={t("admin.form.galleryLinkFavoritesHint")}
            checked={form.galleryLinkFavorites}
            onChange={(v) => set("galleryLinkFavorites", v)}
          />
          <Switch
            label={t("admin.form.galleryMailIncludesPassword")}
            hint={t("admin.form.galleryMailIncludesPasswordHint")}
            checked={form.galleryMailIncludesPassword}
            onChange={(v) => set("galleryMailIncludesPassword", v)}
          />
        </div>
      )}
    </FormSection>
  );
}
