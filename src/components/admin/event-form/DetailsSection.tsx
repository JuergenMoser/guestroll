"use client";

import { useT } from "@/components/I18nProvider";
import { ColorField, Field, Input, Textarea } from "@/components/ui";
import { FormSection } from "./FormSection";
import type { SectionProps } from "./state";

export function DetailsSection({ form, set, errors }: SectionProps) {
  const t = useT();
  return (
    <FormSection title={t("admin.form.sections.details")}>
      <Field label={t("admin.form.name")} error={errors.name}>
        {(id) => <Input id={id} value={form.name} onChange={(e) => set("name", e.target.value)} required maxLength={80} />}
      </Field>
      <Field label={t("admin.form.description")} hint={t("admin.form.descriptionHint")} error={errors.description}>
        {(id) => <Textarea id={id} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={500} />}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("admin.form.date")} error={errors.eventDate}>
          {(id) => <Input id={id} type="date" value={form.eventDate} onChange={(e) => set("eventDate", e.target.value)} />}
        </Field>
        <Field label={t("admin.form.color")} error={errors.accentColor}>
          {(id) => <ColorField id={id} label={form.accentColor} value={form.accentColor} onChange={(v) => set("accentColor", v)} />}
        </Field>
      </div>
    </FormSection>
  );
}
