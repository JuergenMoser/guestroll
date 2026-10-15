"use client";

import { useLocale, useT } from "@/components/I18nProvider";
import { Field, Select, Switch } from "@/components/ui";
import { LOCALES } from "@/lib/constants";
import { localeOptionLabel } from "@/lib/i18n/locale";
import { FormSection } from "./FormSection";
import type { EventFormState, SectionProps } from "./state";

export function GuestsSection({ form, set }: SectionProps) {
  const t = useT();
  const uiLocale = useLocale();
  return (
    <FormSection title={t("admin.form.sections.guests")}>
      <Field label={t("admin.form.defaultLocale")} hint={t("admin.form.defaultLocaleHint")}>
        {(id, describedBy) => (
          <Select id={id} aria-describedby={describedBy} value={form.defaultLocale} onChange={(e) => set("defaultLocale", e.target.value as EventFormState["defaultLocale"])}>
            <option value="">{t("admin.form.autoLocale")}</option>
            {LOCALES.map((locale) => (
              <option key={locale} value={locale} lang={locale}>
                {localeOptionLabel(locale, uiLocale)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Switch label={t("admin.form.askGuestName")} checked={form.askGuestName} onChange={(v) => set("askGuestName", v)} />
    </FormSection>
  );
}
