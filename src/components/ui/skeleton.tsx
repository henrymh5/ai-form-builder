import { cn } from "@/lib/cn";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-surface-subtle animate-pulse rounded-md", className)}
      aria-hidden="true"
      {...props}
    />
  );
}
