import { useSyncExternalStore } from 'react';

// Use Bootstrap-convention breakpoint (1023.98px) to close the fractional-zoom
// gap where a width of 1023.5px would be "mobile" by the integer query but
// "desktop" by lg-min CSS.
const MQ = '(max-width: 1023.98px)';
let isMobileValue = typeof window !== 'undefined' ? window.matchMedia(MQ).matches : false;
const listeners = new Set<() => void>();
let handler: ((e: MediaQueryListEvent) => void) | null = null;
// Cache the MediaQueryList at module scope. Some browsers return a NEW MQL
// instance on each window.matchMedia() call, which would leak listeners if
// subscribe added to MQL-1 but unsubscribe removed from MQL-2.
let mql: MediaQueryList | null = null;

function getMql(): MediaQueryList | null {
  if (typeof window === 'undefined') return null;
  if (!mql) mql = window.matchMedia(MQ);
  return mql;
}

function subscribe(listener: () => void) {
  const m = getMql();
  if (listeners.size === 0 && m) {
    // Refresh on first bind — handles HMR reloads and late-loaded test env.
    isMobileValue = m.matches;
    handler = (e: MediaQueryListEvent) => {
      isMobileValue = e.matches;
      for (const l of listeners) l();
    };
    m.addEventListener('change', handler);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && handler) {
      const m2 = getMql();
      m2?.removeEventListener('change', handler);
      handler = null;
    }
  };
}

function getSnapshot() {
  // When no active subscriber is attached, refresh from matchMedia to avoid
  // returning a stale module-load value on first render (viewport may have
  // changed between module load and first component mount).
  if (listeners.size === 0 && typeof window !== 'undefined') {
    const m = getMql();
    if (m) isMobileValue = m.matches;
  }
  return isMobileValue;
}

function getServerSnapshot() {
  return false;
}

export function useMobileNav() {
  const isMobile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { isMobile };
}

// Dev-only: detach the listener on HMR module disposal so we don't leak
// listeners on the stale MediaQueryList across reloads. On HMR the module
// re-evaluates and `mql` resets to null, but the OLD module's MQL would still
// have `handler` attached without this cleanup.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (mql && handler) {
      mql.removeEventListener('change', handler);
    }
    mql = null;
    handler = null;
    listeners.clear();
  });
}
