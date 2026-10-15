import { cn } from "@/components/ui";

/** The shutter mark. `currentColor` is the ring, so it follows the surrounding text color. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden className={cn("size-6", className)}>
      <circle cx="256" cy="256" r="150" fill="none" stroke="currentColor" strokeWidth="44" />
      <circle cx="256" cy="256" r="94" fill="#ffc72c" />
      <circle cx="404" cy="108" r="26" fill="currentColor" />
    </svg>
  );
}
