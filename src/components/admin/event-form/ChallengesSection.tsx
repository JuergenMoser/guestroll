"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { Button, Input } from "@/components/ui";
import { MAX_CHALLENGE_LENGTH, MAX_CHALLENGES } from "@/lib/challenges";
import { FormSection } from "./FormSection";
import type { SectionProps } from "./state";

/** Photo prompts guests can pick before shooting. Ids are kept on edit, so photos stay attached to a renamed challenge. */
export function ChallengesSection({ form, set, errors }: SectionProps) {
  const t = useT();
  const list = form.challenges;
  const update = (next: typeof list) => set("challenges", next);
  const move = (from: number, to: number) => {
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    update(next);
  };

  return (
    <FormSection title={t("admin.challenges.title")}>
      <p className="text-sm text-ink-muted">{t("admin.challenges.hint")}</p>
      {list.length > 0 && (
        <ol className="space-y-2">
          {list.map((challenge, i) => (
            <li key={challenge.id || `new-${i}`} className="flex items-center gap-1.5">
              <span className="w-6 shrink-0 text-right text-sm tabular-nums text-ink-faint">{i + 1}</span>
              <Input
                aria-label={t("admin.challenges.label", { n: i + 1 })}
                value={challenge.label}
                maxLength={MAX_CHALLENGE_LENGTH}
                onChange={(e) => update(list.map((c, j) => (j === i ? { ...c, label: e.target.value } : c)))}
                placeholder={t("admin.challenges.placeholder")}
              />
              <Button size="sm" variant="ghost" aria-label={t("admin.challenges.up")} disabled={i === 0} onClick={() => move(i, i - 1)}>
                <ArrowUp className="size-4" />
              </Button>
              <Button size="sm" variant="ghost" aria-label={t("admin.challenges.down")} disabled={i === list.length - 1} onClick={() => move(i, i + 1)}>
                <ArrowDown className="size-4" />
              </Button>
              <Button size="sm" variant="ghost" aria-label={t("admin.challenges.remove")} onClick={() => update(list.filter((_, j) => j !== i))}>
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ol>
      )}
      {errors.challenges && <p className="text-sm text-danger">{errors.challenges}</p>}
      {list.length < MAX_CHALLENGES && (
        <Button size="sm" variant="secondary" onClick={() => update([...list, { id: "", label: "" }])}>
          <Plus className="size-4" aria-hidden />
          {t("admin.challenges.add")}
        </Button>
      )}
    </FormSection>
  );
}
