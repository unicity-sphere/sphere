// System notification manager for incoming-call alerts.
//
// Uses the Web Notifications API. Notifications:
//   - Pop up at the OS-level (typically bottom-right on Windows/Linux,
//     top-right on macOS) — visible even when the Sphere tab is inactive
//     or minimized.
//   - Play a system ring sound that bypasses the page's autoplay policy
//     (the OS handles audio, not the page).
//   - Stay visible until interacted with (requireInteraction: true).
//   - Clicking focuses the Sphere tab and closes the notification, so the
//     user lands on the in-page Accept/Decline UI.
//
// Action buttons (Accept/Decline directly in the notification) require a
// Service Worker — out of scope for this iteration. Click-to-focus is
// the simpler pattern most browsers honor consistently.

let activeNotification: Notification | null = null;

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Request notification permission. Returns the resolved permission state
 * ('granted', 'denied', or 'default'). Safe to call repeatedly — only the
 * first call shows the prompt; subsequent calls return the cached state.
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
  peerName: string;
  isVideo: boolean;
  onClick?: () => void;
}

/**
 * Show a system notification for an incoming call. Idempotent: replaces
 * any existing call notification (via the 'incoming-call' tag).
 */
export function showIncomingCallNotification(opts: IncomingCallNotificationOptions): void {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;

  // Close previous notification (if any) before creating new one
  hideIncomingCallNotification();

  try {
    const notification = new Notification(
      `Incoming ${opts.isVideo ? 'video' : 'voice'} call`,
      {
        body: `From ${opts.peerName}`,
        icon: '/UnicityLogo.svg',
        tag: 'sphere-incoming-call',
        requireInteraction: true,
        // silent:false ensures the system ring sound plays — bypasses
        // any page-level audio autoplay restriction.
        silent: false,
      },
    );
    notification.onclick = () => {
      window.focus();
      notification.close();
      opts.onClick?.();
    };
    activeNotification = notification;
  } catch (err) {
    console.warn('[telco] showIncomingCallNotification failed:', err);
  }
}

export function hideIncomingCallNotification(): void {
  if (activeNotification) {
    try { activeNotification.close(); } catch { /* noop */ }
    activeNotification = null;
  }
}
