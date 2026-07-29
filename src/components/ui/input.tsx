import * as React from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

/** Text input — Style-Guide §23.7 (default/hover/focus/error/disabled states). */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "border-border bg-surface text-text-primary h-9 w-full rounded-md border px-3 text-sm",
        "placeholder:text-text-muted",
        "hover:border-border-strong",
        "disabled:bg-surface-subtle disabled:text-text-disabled disabled:cursor-not-allowed",
        invalid && "border-error",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
