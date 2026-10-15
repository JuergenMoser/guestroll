"use client";

import { useId } from "react";
import { cn } from "./cn";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, hint, disabled }: SwitchProps) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="text-sm">
        <span className="block font-medium text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-ink-muted">{hint}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50",
          checked ? "bg-ink" : "bg-line-2",
        )}
      >
        <span
          className={cn("absolute top-0.5 left-0.5 size-5 rounded-full bg-surface shadow-sm transition", checked && "translate-x-5")}
        />
      </button>
    </div>
  );
}
