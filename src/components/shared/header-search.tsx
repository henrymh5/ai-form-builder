"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

/**
 * Global form search. Submits to `/forms?search=…`, which is the same filter the list page
 * already reads — so the header shares one search implementation with the list rather than
 * introducing a second one.
 */
export function HeaderSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  // The platform is unknown during SSR, so the hint renders only after mount — showing the
  // wrong modifier on the server and correcting it would be a hydration mismatch.
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const modifierKey = isMounted && /mac|iphone|ipad/i.test(navigator.userAgent) ? "⌘" : "Strg+";

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Ctrl/Cmd+K focuses search, the convention users expect.
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        return;
      }
      if (event.key === "Escape" && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const query = value.trim();
    router.push(query ? `/forms?search=${encodeURIComponent(query)}` : "/forms");
    inputRef.current?.blur();
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="relative hidden md:block">
      <Search
        className="text-text-muted pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
        aria-hidden
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Formulare suchen …"
        aria-label="Formulare suchen"
        className="border-border bg-surface-subtle text-text-primary placeholder:text-text-muted focus:border-primary focus:bg-surface h-9 w-56 rounded-md border pr-10 pl-8 text-sm transition-colors lg:w-72"
      />
      {isMounted ? (
        <kbd
          aria-hidden
          className="border-border bg-surface text-text-muted pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded border px-1.5 py-0.5 text-[10px] font-medium lg:block"
        >
          {modifierKey}K
        </kbd>
      ) : null}
    </form>
  );
}
