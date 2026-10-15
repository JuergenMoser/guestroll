import type { ReactNode } from "react";

/** One group of settings: its title on the left on wide screens, above on phones. */
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-x-10 gap-y-5 border-t border-line py-8 first:border-t-0 first:pt-0 md:grid-cols-[11rem_1fr]">
      <legend className="contents">
        <span className="text-[17px] font-semibold">{title}</span>
      </legend>
      <div className="min-w-0 space-y-5">{children}</div>
    </fieldset>
  );
}
