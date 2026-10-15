"use client";

import { Check } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { cn } from "@/components/ui";
import type { Challenge } from "@/lib/challenges";

interface ChallengePickerProps {
  challenges: Challenge[];
  value: string | null;
  onChange: (id: string | null) => void;
  /** Challenges this guest already answered: ticked, still pickable. */
  done: ReadonlySet<string>;
}

/** A row of prompts above the shutter. Picking one tags the next photos; "Free photo" goes back to untagged. */
export function ChallengePicker({ challenges, value, onChange, done }: ChallengePickerProps) {
  const t = useT();
  const chip = (active: boolean) =>
    cn(
      "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors",
      active ? "bg-ink text-canvas" : "bg-surface text-ink ring-1 ring-line-2 hover:bg-sunken",
    );
  return (
    <section className="space-y-2.5" aria-labelledby="challenges-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="challenges-title" className="text-lg font-bold tracking-tight">
          {t("guest.challenges")}
        </h2>
        <span className="text-sm tabular-nums text-ink-muted">{t("guest.challengesDone", { done: done.size, total: challenges.length })}</span>
      </div>
      <div role="radiogroup" aria-labelledby="challenges-title" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        <button type="button" role="radio" aria-checked={value === null} onClick={() => onChange(null)} className={chip(value === null)}>
          {t("guest.freePhoto")}
        </button>
        {challenges.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={value === c.id} onClick={() => onChange(c.id)} className={chip(value === c.id)}>
            {done.has(c.id) && <Check className="size-3.5" aria-label={t("guest.challengeDone")} />}
            {c.label}
          </button>
        ))}
      </div>
    </section>
  );
}
