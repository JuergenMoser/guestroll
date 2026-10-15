"use client";

import { cn } from "./cn";

interface SegmentedControlProps<T extends string> {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  label: (value: T) => string;
  /** Accessible name of the group. */
  name: string;
  /** `tabs` for view switchers (filters), `radio` for a setting. */
  role?: "radio" | "tabs";
  className?: string;
}

export function SegmentedControl<T extends string>({ value, options, onChange, label, name, role = "radio", className }: SegmentedControlProps<T>) {
  const tabs = role === "tabs";
  return (
    <div
      role={tabs ? "tablist" : "radiogroup"}
      aria-label={name}
      className={cn("flex max-w-full gap-0.5 overflow-x-auto rounded-lg bg-canvas p-0.5 ring-1 ring-line", className)}
    >
      {options.map((option) => {
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            role={tabs ? "tab" : "radio"}
            {...(tabs ? { "aria-selected": active } : { "aria-checked": active })}
            onClick={() => onChange(option)}
            className={cn(
              "flex-1 shrink-0 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
              active ? "bg-surface font-medium text-ink shadow-sm" : "text-ink-muted hover:text-ink",
            )}
          >
            {label(option)}
          </button>
        );
      })}
    </div>
  );
}
