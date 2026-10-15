"use client";

import { useState } from "react";
import { cn } from "@/components/ui";

/**
 * The big round shutter. Drawn in the camera body's ink color so it works on
 * any event color. Exported for custom capture components to reuse.
 */
export function ShutterButton({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label: string }) {
  const [pressed, setPressed] = useState(0);
  return (
    <button
      type="button"
      onClick={() => {
        setPressed((n) => n + 1);
        onClick();
      }}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "grid size-28 place-items-center rounded-full border-[5px] border-accent-ink transition",
        "focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-accent-ink",
        "disabled:opacity-35",
      )}
    >
      <span
        key={pressed}
        className={cn("size-[86px] rounded-full bg-white shadow-[inset_0_-4px_0_rgb(0_0_0/0.12)]", pressed > 0 && "animate-[shutter_220ms_ease-out]")}
      />
    </button>
  );
}
