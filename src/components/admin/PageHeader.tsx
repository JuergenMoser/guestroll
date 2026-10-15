import type { ReactNode } from "react";

export function PageHeader({ kicker, title, actions }: { kicker?: string; title: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        {kicker && <p className="kicker">{kicker}</p>}
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      </div>
      {actions}
    </div>
  );
}
