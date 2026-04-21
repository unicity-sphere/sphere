import { useSyncExternalStore } from 'react';

const MQ = '(max-width: 1023px)';
let isMobileValue = typeof window !== 'undefined' ? window.matchMedia(MQ).matches : false;
const listeners = new Set<() => void>();
let mqlBound = false;

function ensureBound() {
  if (mqlBound || typeof window === 'undefined') return;
  mqlBound = true;
  window.matchMedia(MQ).addEventListener('change', (e) => {
    isMobileValue = e.matches;
    for (const l of listeners) l();
  });
}

function subscribe(listener: () => void) {
  ensureBound();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
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
