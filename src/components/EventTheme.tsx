import type { CSSProperties, ReactNode } from "react";

const HEX = /^#[0-9a-f]{6}$/i;

/** Scopes the event's accent color to its pages through the `--accent` CSS variable. */
export function EventTheme({ color, children, className }: { color: string; children: ReactNode; className?: string }) {
  const style = { "--accent": HEX.test(color) ? color : undefined } as CSSProperties;
  return (
    <div style={style} className={className}>
      {children}
    </div>
  );
}
