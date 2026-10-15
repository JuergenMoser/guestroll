import type { ReactNode } from "react";

/** `context` is a breadcrumb-like line above the title, only when it adds something (the date of an event, its parent section). */
export function PageHeader({ context, title, actions }: { context?: ReactNode; title: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 [&>*]:min-w-0">
      <div className="space-y-2">
        {context && <p className="text-sm text-ink-muted">{context}</p>}
        <h1 className="text-[2rem] leading-tight font-bold tracking-tight">{title}</h1>
      </div>
      {actions}
    </div>
  );
}
