"use client";

import { Check, EyeOff, Star, StarOff, Trash2, X } from "lucide-react";
import { useT } from "@/components/I18nProvider";

export type BulkAction = "approve" | "hide" | "favorite" | "unfavorite" | "delete";

const ACTIONS = [
  { action: "approve", icon: Check },
  { action: "hide", icon: EyeOff },
  { action: "favorite", icon: Star },
  { action: "unfavorite", icon: StarOff },
  { action: "delete", icon: Trash2 },
] as const;

/** Appears once photos are selected; sticks to the bottom of the screen so it stays in reach on a phone. */
export function SelectionBar({ count, busy, onAction, onClear }: { count: number; busy: boolean; onAction: (action: BulkAction) => void; onClear: () => void }) {
  const t = useT();
  if (count === 0) return null;
  return (
    <div className="sticky bottom-4 z-20 mx-auto flex w-fit max-w-full flex-wrap items-center gap-1 rounded-xl bg-ink p-1.5 pl-3 text-canvas shadow-xl">
      <span className="mr-2 text-sm font-medium tabular-nums">{t("admin.moderation.selected", { n: count })}</span>
      {ACTIONS.map(({ action, icon: Icon }) => (
        <button
          key={action}
          type="button"
          onClick={() => onAction(action)}
          disabled={busy}
          className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-canvas/15 disabled:opacity-50 ${action === "delete" ? "text-[#ff8a7a]" : ""}`}
        >
          <Icon className="size-4" aria-hidden />
          {t(`admin.moderation.${action}`)}
        </button>
      ))}
      <button type="button" onClick={onClear} aria-label={t("common.cancel")} className="grid size-9 place-items-center rounded-lg hover:bg-canvas/15">
        <X className="size-4" />
      </button>
    </div>
  );
}
