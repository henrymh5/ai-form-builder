import Image from "next/image";
import { cn } from "@/lib/cn";

/** Intrinsic size of `public/logo.png` — keeps the aspect ratio correct wherever it renders. */
const LOGO_WIDTH = 780;
const LOGO_HEIGHT = 161;

/**
 * The Flowdesk wordmark. Placeholder artwork for the portfolio build.
 *
 * The image already contains the product name, so it carries an empty `alt` and the name is
 * exposed to assistive tech via the wrapper's `aria-label` — otherwise screen readers would
 * announce "Flowdesk" twice wherever a visible heading sits next to it.
 */
export function Logo({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/logo.png"
      alt=""
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      priority={priority}
      className={cn("h-auto w-auto object-contain", className)}
    />
  );
}
