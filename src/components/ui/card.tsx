import * as React from "react";
import { cn } from "@/lib/cn";

/** Standard card — Style-Guide §23.9: white surface, thin border, moderate radius. */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border-border bg-surface rounded-lg border p-5 shadow-sm", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-text-primary text-base font-semibold", className)} {...props} />;
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-text-secondary text-sm", className)} {...props} />;
}
