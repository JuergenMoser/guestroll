import type { ReactNode } from "react";
import { cn } from "./cn";

/** The blank space where content will appear, with one line saying what to do. */
export function EmptyState({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("border-2 border-dashed border-line-2 px-4 py-10 text-center text-[15px] text-pretty text-ink-muted", className)}>{children}</p>;
}
