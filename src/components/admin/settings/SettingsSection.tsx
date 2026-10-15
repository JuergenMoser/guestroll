import type { ReactNode } from "react";
import { cn } from "@/components/ui";

/**
 * One group of settings: what it is and why on the left on wide screens,
 * the controls on the right, a rule between groups. Settings are a form,
 * not a pile of cards (docs/design-prompt.md).
 */
export function SettingsSection({ id, title, description, aside, children, className }: { id?: string; title: string; description?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={cn("grid scroll-mt-24 gap-x-10 gap-y-4 border-t border-line py-8 first:border-t-0 first:pt-2 md:grid-cols-[14rem_minmax(0,1fr)]", className)}>
      <div className="space-y-1.5">
        <h2 className="text-[17px] font-semibold">{title}</h2>
        {description && <p className="text-sm text-pretty text-ink-muted [overflow-wrap:anywhere]">{description}</p>}
        {aside}
      </div>
      <div className="min-w-0 space-y-5">{children}</div>
    </section>
  );
}
