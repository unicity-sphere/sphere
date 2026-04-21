import { useCallback, useSyncExternalStore } from 'react';

// ── Types ───────────────────────────────────────────────────────────────────

export type MobileView = 'home' | 'messages' | 'wallet' | 'apps';
export type MessagesSubView = 'list' | 'conversation';

interface MobileNavState {
  activeView: MobileView;
  messagesSubView: MessagesSubView;
}

// ── State store (module-level, no persistence) ──────────────────────────────

const defaultState: MobileNavState = {
  activeView: 'home',
  messagesSubView: 'list',
};

let state: MobileNavState = { ...defaultState };
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

function update(partial: Partial<MobileNavState>) {
  state = { ...state, ...partial };
  emitChange();
}

// ── isMobile media query ────────────────────────────────────────────────────

const MQ = '(max-width: 1023px)';
let isMobileValue = typeof window !== 'undefined' ? window.matchMedia(MQ).matches : false;
const mobileListeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.matchMedia(MQ).addEventListener('change', (e) => {
    isMobileValue = e.matches;
    for (const l of mobileListeners) l();
  });
}

function subscribeMobile(listener: () => void) {
  mobileListeners.add(listener);
  return () => mobileListeners.delete(listener);
}

function getMobileSnapshot() {
  return isMobileValue;
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useMobileNav() {
  const nav = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const isMobile = useSyncExternalStore(subscribeMobile, getMobileSnapshot, () => false);

  const setActiveView = useCallback((view: MobileView) => {
    update({ activeView: view });
    // Reset messages sub-view when switching away
    if (view !== 'messages') {
      update({ activeView: view, messagesSubView: 'list' });
    }
  }, []);

  const setMessagesSubView = useCallback((sub: MessagesSubView) => {
    update({ messagesSubView: sub });
  }, []);

  return {
    activeView: nav.activeView,
    messagesSubView: nav.messagesSubView,
    setActiveView,
    setMessagesSubView,
    isMobile,
  };
}
