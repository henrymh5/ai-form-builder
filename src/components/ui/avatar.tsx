import { cn } from "@/lib/cn";

/**
 * Derives up to two initials from a display name, ignoring connectives so
 * "Henry von Korte" reads as "HK" rather than "HV".
 */
export function initialsFrom(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0 && !/^(von|van|de|der|den|di|da|zu)$/i.test(part));
  const source = parts.length > 0 ? parts : name.trim().split(/\s+/);
  const letters = [source[0], source.length > 1 ? source[source.length - 1] : undefined]
    .filter((part): part is string => Boolean(part))
    .map((part) => [...part][0] ?? "")
    .join("");
  return letters.toUpperCase() || "?";
}

const SIZE_CLASS = {
  sm: "size-7 text-[11px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
} as const;

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}

/**
 * User avatar with an initials fallback.
 *
 * Marked `aria-hidden` throughout: it always accompanies the name in visible text or an
 * `aria-label` on its trigger, so announcing the initials again would be noise.
 */
export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const base = cn(
    "shrink-0 overflow-hidden rounded-full object-cover",
    SIZE_CLASS[size],
    className,
  );

  if (src) {
    // A plain <img>, not next/image: avatar URLs come from arbitrary providers, and
    // next/image would need every one of those hosts allow-listed in next.config.ts.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" aria-hidden className={base} />;
  }

  return (
    <span
      aria-hidden
      className={cn(
        base,
        "bg-primary-subtle text-primary-text flex items-center justify-center font-semibold",
      )}
    >
      {initialsFrom(name)}
    </span>
  );
}
