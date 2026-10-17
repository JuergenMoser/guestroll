"use client";

import { useT } from "@/components/I18nProvider";
import { Field, Input, Select, Switch } from "@/components/ui";
import type { CaptureMode } from "@/lib/constants";
import { FormSection } from "./FormSection";
import type { SectionProps } from "./state";

// Most common first: the camera-only mode is the reason the app exists.
const MODE_ORDER: CaptureMode[] = ["camera", "both", "picker"];

export function UploadsSection({ form, set, errors, videoMaxSeconds }: SectionProps & { videoMaxSeconds?: number }) {
  const t = useT();
  return (
    <FormSection id="uploads" title={t("admin.form.sections.uploads")} description={t("admin.form.sectionHints.uploads")}>
      <Switch label={t("admin.form.uploadsOpen")} checked={form.uploadsOpen} onChange={(v) => set("uploadsOpen", v)} />
      <Field label={t("admin.form.uploadsCloseAt")} error={errors.uploadsCloseAt}>
        {(id) => <Input id={id} type="datetime-local" value={form.uploadsCloseAt} onChange={(e) => set("uploadsCloseAt", e.target.value)} />}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("admin.form.captureMode")}>
          {(id) => (
            <Select id={id} value={form.captureMode} onChange={(e) => set("captureMode", e.target.value as CaptureMode)}>
              {MODE_ORDER.map((mode) => (
                <option key={mode} value={mode}>
                  {t(`admin.form.captureModes.${mode}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t("admin.form.maxPhotos")} hint={t("admin.form.maxPhotosHint")} error={errors.maxPhotosPerGuest}>
          {(id) => (
            <Input id={id} type="number" min={0} max={10000} value={form.maxPhotosPerGuest} onChange={(e) => set("maxPhotosPerGuest", Number(e.target.value) || 0)} />
          )}
        </Field>
      </div>
      <Switch
        label={t("admin.form.allowVideos")}
        hint={[t("admin.form.allowVideosHint"), videoMaxSeconds ? t("admin.form.allowVideosLimit", { n: videoMaxSeconds }) : ""].join(" ").trim()}
        checked={form.allowVideos}
        onChange={(v) => set("allowVideos", v)}
      />
      <Field label={t("admin.form.moderation")}>
        {(id) => (
          <Select id={id} value={form.moderation} onChange={(e) => set("moderation", e.target.value as SectionProps["form"]["moderation"])}>
            <option value="post">{t("admin.form.moderationModes.post")}</option>
            <option value="pre">{t("admin.form.moderationModes.pre")}</option>
          </Select>
        )}
      </Field>
    </FormSection>
  );
}
