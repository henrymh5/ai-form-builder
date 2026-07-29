import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/**
 * Status badge — Style-Guide §23.8. Semantic color is always paired with
 * text/label, never color alone.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-surface-subtle text-text-secondary",
        success: "bg-success-subtle text-success",
        warning: "bg-warning-subtle text-warning",
        error: "bg-error-subtle text-error",
        info: "bg-info-subtle text-info",
        primary: "bg-primary-subtle text-primary-text",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
