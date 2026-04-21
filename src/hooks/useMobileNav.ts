import { useSyncExternalStore } from 'react';

// Use Bootstrap-convention breakpoint (1023.98px) to close the fractional-zoom
// gap where a width of 1023.5px would be "mobile" by the integer query but
// "desktop" by lg-min CSS.
const MQ = '(max-width: 1023.98px)';
let isMobileValue = typeof window !== 'undefined' ? window.matchMedia(MQ).matches : false;
const listeners = new Set<() => void>();
let handler: ((e: MediaQueryListEvent) => void) | null = null;

function subscribe(listener: () => void) {
  if (listeners.size === 0 && typeof window !== 'undefined') {
    const mql = window.matchMedia(MQ);
    // Refresh on first bind — handles HMR reloads and late-loaded test env.
    isMobileValue = mql.matches;
    handler = (e: MediaQueryListEvent) => {
      isMobileValue = e.matches;
      for (const l of listeners) l();
    };
    mql.addEventListener('change', handler);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== 'undefined' && handler) {
      window.matchMedia(MQ).removeEventListener('change', handler);
      handler = null;
    }
  };
}

function getSnapshot() {
  return isMobileValue;
}

function getServerSnapshot() {
  return false;
}

export function useMobileNav() {
  const isMobile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { isMobile };
}
