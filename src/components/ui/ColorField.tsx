"use client";

import { cn } from "./cn";

/** A swatch that opens the system color picker, with its name beside it. */
export function ColorField({ label, value, onChange, disabled, id }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; id?: string }) {
  return (
    <label className={cn("inline-flex items-center gap-2 rounded-lg bg-surface p-1.5 pr-3 ring-1 ring-line-2", disabled && "opacity-40")}>
      <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="h-8 w-9 cursor-pointer rounded-md bg-transparent" />
      <span className="text-sm">{label}</span>
    </label>
  );
}
