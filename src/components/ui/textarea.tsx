import * as React from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "border-border bg-surface text-text-primary min-h-20 w-full rounded-md border px-3 py-2 text-sm",
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
Textarea.displayName = "Textarea";
