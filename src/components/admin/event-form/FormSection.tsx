import type { ReactNode } from "react";

/**
 * One group of settings, laid out like the instance settings: title and what the
 * group is for on the left on wide screens, above on phones; the fields on the right.
 * `id` is the anchor the settings tab's outline links to.
 */
export function FormSection({ id, title, description, children }: { id: string; title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <fieldset id={id} className="grid scroll-mt-24 gap-x-10 gap-y-4 border-t border-line py-8 first:border-t-0 first:pt-2 md:grid-cols-[14rem_minmax(0,1fr)]">
      <legend className="contents">
        <span className="block space-y-1.5">
          <span className="block text-[17px] font-semibold">{title}</span>
          {description && <span className="block text-sm text-pretty text-ink-muted">{description}</span>}
        </span>
      </legend>
      <div className="min-w-0 space-y-5">{children}</div>
    </fieldset>
  );
}
