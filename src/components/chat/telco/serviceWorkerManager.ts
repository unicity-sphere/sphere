// Service worker registration + message bus for telco-sw.js.
//
// The SW handles incoming-call notifications with action buttons. The main
// app communicates with it via postMessage in both directions:
//   page → SW: { type: 'show-incoming-call' | 'hide-incoming-call' }
//   SW → page: { type: 'telco-action', action: 'accept'|'decline'|'click'|'dismiss', callId }

const SW_PATH = '/telco-sw.js';

let registration: ServiceWorkerRegistration | null = null;
let registerPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export function isServiceWorkerSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

/**
 * Register the telco service worker. Idempotent — repeated calls return the
 * same Promise. Returns null if SW is unsupported or registration failed.
 */
export function registerTelcoServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (registerPromise) return registerPromise;
  if (!isServiceWorkerSupported()) {
    registerPromise = Promise.resolve(null);
    return registerPromise;
  }
  registerPromise = navigator.serviceWorker.register(SW_PATH, { scope: '/' })
    .then(async (reg) => {
      registration = reg;
      // Wait until there's an active worker so postMessage works.
      if (!reg.active) {
        await new Promise<void>((resolve) => {
          const w = reg.installing || reg.waiting;
          if (!w) { resolve(); return; }
          const onState = () => {
            if (w.state === 'activated') {
              w.removeEventListener('statechange', onState);
              resolve();
            }
          };
          w.addEventListener('statechange', onState);
        });
      }
      console.log('[telco] Service worker registered');
      return reg;
    })
    .catch((err) => {
      console.warn('[telco] SW registration failed:', err);
      return null;
    });
  return registerPromise;
}

/**
 * Send a message to the service worker. Uses navigator.serviceWorker.controller
 * (the SW that controls this page) when available; falls back to the
 * registration's active worker for tabs that haven't yet been claimed by the SW
 * (typical on first load before reload).
 */
export function postToServiceWorker(message: unknown): void {
  if (!isServiceWorkerSupported()) return;
  const target = navigator.serviceWorker.controller || registration?.active;
  if (!target) return;
  target.postMessage(message);
}

export type TelcoAction = 'accept' | 'decline' | 'click' | 'dismiss';

export interface TelcoActionMessage {
  type: 'telco-action';
  action: TelcoAction;
  callId: string;
  peerPubkey?: string;
}

/**
 * Subscribe to messages from the SW. Returns an unsubscribe function.
 */
export function onServiceWorkerMessage(
  handler: (data: TelcoActionMessage) => void,
): () => void {
  if (!isServiceWorkerSupported()) return () => {};
  const listener = (event: MessageEvent) => {
    const d = event.data as TelcoActionMessage | undefined;
    if (d?.type === 'telco-action') handler(d);
  };
  navigator.serviceWorker.addEventListener('message', listener);
  return () => navigator.serviceWorker.removeEventListener('message', listener);
}

/** Returns true if the SW is registered AND active (ready to handle messages). */
export function isServiceWorkerReady(): boolean {
  return !!(registration?.active);
}
