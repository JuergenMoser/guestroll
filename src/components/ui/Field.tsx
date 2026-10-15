import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

const control =
  "w-full rounded-md bg-surface px-3 py-2 text-[15px] text-ink ring-1 ring-line-2 placeholder:text-ink-faint " +
  "focus:outline-none focus:ring-2 focus:ring-ink";

interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: (id: string, describedBy?: string) => ReactNode;
}

export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  const hintId = hint || error ? `${id}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children(id, hintId)}
      {(hint || error) && (
        <p id={hintId} className={cn("text-xs", error ? "text-danger" : "text-ink-muted")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "min-h-24 resize-y", className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(control, "appearance-none", className)} {...props} />;
}
