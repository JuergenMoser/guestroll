"use client";

import { useT } from "@/components/I18nProvider";
import { Button, Field, Input } from "@/components/ui";
import { FormSection } from "./FormSection";
import type { SectionProps } from "./state";

export function AccessSection({ form, set, errors, hasCode }: SectionProps & { hasCode: boolean }) {
  const t = useT();
  return (
    <FormSection title={t("admin.form.sections.access")}>
      <Field label={t("admin.form.accessCode")} hint={hasCode ? t("admin.form.accessCodeSet") : t("admin.form.accessCodeHint")} error={errors.accessCode}>
        {(id, describedBy) => (
          <div className="flex flex-wrap gap-2">
            <Input
              id={id}
              aria-describedby={describedBy}
              value={form.accessCode}
              onChange={(e) => set("accessCode", e.target.value)}
              autoComplete="off"
              minLength={6}
              maxLength={64}
              placeholder={hasCode ? "••••••" : ""}
              className="min-w-0 flex-1 tracking-wider"
            />
            {hasCode && (
              <Button variant="secondary" onClick={() => set("removeCode", true)}>
                {t("admin.form.removeCode")}
              </Button>
            )}
          </div>
        )}
      </Field>
    </FormSection>
  );
}
