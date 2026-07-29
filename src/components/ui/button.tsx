import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/**
 * Button — Style-Guide §23.6. Primary is the only Teal-filled variant;
 * destructive is never Teal. Icon buttons use the `icon` size and require
 * an accessible name via `aria-label` (enforced by callers, not the type).
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium " +
    "transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white hover:bg-primary-hover active:bg-primary-active",
        secondary: "border border-border bg-surface text-text-primary hover:bg-surface-subtle",
        ghost: "text-text-primary hover:bg-surface-subtle",
        destructive: "border border-error/30 bg-error-subtle text-error hover:bg-error/10",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-9 px-4",
        lg: "h-10 px-5",
        icon: "h-9 w-9 shrink-0 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

/** Icon-only button — always requires an accessible name (plan §23.6). */
export type IconButtonProps = Omit<ButtonProps, "size"> & {
  "aria-label": string;
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "ghost", ...props }, ref) => (
    <Button ref={ref} variant={variant} size="icon" className={className} {...props} />
  ),
);
IconButton.displayName = "IconButton";
