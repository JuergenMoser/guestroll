import { Logo } from "./Logo";
import { cn } from "./ui";

/** Logo and instance name. `compact` keeps only the logo on phones. */
export function Brand({ name, compact, className }: { name: string; compact?: boolean; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 text-[17px] font-bold tracking-tight", className)}>
      <Logo className="size-7" />
      <span className={cn(compact && "hidden sm:inline")}>{name}</span>
    </span>
  );
}
