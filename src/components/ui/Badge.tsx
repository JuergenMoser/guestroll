import type { ReactNode } from "react";
import { cn } from "./cn";

const TONES = {
  neutral: "bg-ink-800 text-ink-300 ring-ink-700",
  accent: "bg-accent/15 text-accent ring-accent/30",
  ok: "bg-ok/10 text-ok ring-ok/30",
  danger: "bg-danger/10 text-danger ring-danger/30",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1", TONES[tone])}>
      {children}
    </span>
  );
}
