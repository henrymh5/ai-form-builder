import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn("size-4 animate-spin text-current motion-reduce:animate-none", className)}
      aria-hidden="true"
    />
  );
}
