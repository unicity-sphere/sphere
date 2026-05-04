// System notification manager for incoming-call alerts.
//
// Two paths, picked at runtime:
//
// (a) SERVICE-WORKER NOTIFICATION (preferred when SW is registered)
//     - Includes Accept/Decline action buttons in the OS popup itself
//     - User can answer/reject without focusing the Sphere tab
//     - SW broadcasts the action via postMessage; CallProvider picks it up
//
// (b) DIRECT NOTIFICATION API (fallback for browsers without SW or when
//     registration failed)
//     - No action buttons (browser limitation outside SW context)
//     - Click-to-focus the tab; user picks Accept/Decline in-page

import { isServiceWorkerReady, postToServiceWorker } from './serviceWorkerManager';

let activeFallbackNotification: Notification | null = null;

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Request notification permission. Returns the resolved permission state.
 * Safe to call repeatedly — only the first call shows the prompt.
 */
export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

interface IncomingCallNotificationOptions {
  callId: string;
  peerPubkey: string;
  peerName: string;
  isVideo: boolean;
  /** Called when the user clicks the notification body (no Accept/Decline). */
  onClick?: () => void;
}

/**
 * Show a system notification for an incoming call. If the SW is registered,
 * the notification includes Accept/Decline action buttons. Idempotent —
 * replaces any previous incoming-call notification.
 */
export function showIncomingCallNotification(opts: IncomingCallNotificationOptions): void {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;

  hideIncomingCallNotification();

  const title = `Incoming ${opts.isVideo ? 'video' : 'voice'} call`;
  const body = `From ${opts.peerName}`;

  // Preferred: SW-backed notification with action buttons
  if (isServiceWorkerReady()) {
    postToServiceWorker({
      type: 'show-incoming-call',
      title,
      body,
      icon: '/UnicityLogo.svg',
      callId: opts.callId,
      peerPubkey: opts.peerPubkey,
    });
    return;
  }

  // Fallback: direct Notification API (no actions, click-to-focus only)
  try {
    const n = new Notification(title, {
      body,
      icon: '/UnicityLogo.svg',
      tag: 'sphere-incoming-call',
      requireInteraction: true,
      silent: false,
    });
    n.onclick = () => {
      window.focus();
      n.close();
      opts.onClick?.();
    };
    activeFallbackNotification = n;
  } catch (err) {
    console.warn('[telco] showIncomingCallNotification failed:', err);
  }
}

export function hideIncomingCallNotification(): void {
  if (isServiceWorkerReady()) {
    postToServiceWorker({ type: 'hide-incoming-call' });
  }
  if (activeFallbackNotification) {
    try { activeFallbackNotification.close(); } catch { /* noop */ }
    activeFallbackNotification = null;
  }
}
