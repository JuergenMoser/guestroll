import type { ReactNode } from "react";
import { cn } from "./cn";

const TONES = {
  neutral: "bg-sunken text-ink-soft ring-line",
  accent: "bg-accent text-accent-ink ring-transparent",
  ok: "bg-ok/10 text-ok ring-ok/25",
  danger: "bg-danger/10 text-danger ring-danger/25",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ring-1", TONES[tone])}>
      {children}
    </span>
  );
}
