"use client";

import { cn } from "@/components/ui";

/** The big round camera button. Exported for custom capture components to reuse. */
export function ShutterButton({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "group relative grid size-24 place-items-center rounded-full ring-4 ring-accent transition",
        "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-paper",
        "disabled:opacity-40 disabled:ring-ink-600",
      )}
    >
      <span className="size-[76px] rounded-full bg-paper transition group-active:scale-90 group-disabled:bg-ink-600" />
    </button>
  );
}
