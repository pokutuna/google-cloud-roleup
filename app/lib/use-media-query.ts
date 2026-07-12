import { useEffect, useState } from "react";

function getInitialMatch(query: string): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(query).matches;
}

/**
 * Subscribes to a CSS media query via matchMedia. SSR-safe: this app renders
 * with ssr:false, but the initial render still happens before hydration can
 * read the real viewport, so we start from a safe default and sync in an
 * effect to keep the first client render consistent.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => getInitialMatch(query));

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** Tailwind's `md` breakpoint is 768px, so below that counts as mobile. */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
