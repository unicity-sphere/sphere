/**
 * Cross-tab lock signal (#449 Task 8a). Idle auto-lock and an explicit
 * `lock()` in one tab must lock every other open tab immediately — otherwise
 * a tab that's still "active" (no local idle timer firing) would keep a
 * decrypted Sphere instance alive in memory after another tab decided to
 * lock. Pure module, no React: BroadcastChannel only, guarded for
 * environments where it doesn't exist.
 */
const DEFAULT_CHANNEL_NAME = 'sphere-wallet-lock';
const LOCK_MESSAGE = 'lock';

/** Tell every other tab to lock. No-op where BroadcastChannel is unavailable. */
export function broadcastLock(channelName: string = DEFAULT_CHANNEL_NAME): void {
  if (typeof BroadcastChannel === 'undefined') return;
  const channel = new BroadcastChannel(channelName);
  channel.postMessage(LOCK_MESSAGE);
  channel.close();
}

/**
 * Call `onLock` whenever another tab broadcasts a lock. Returns an
 * unsubscribe function. No-op subscription (unsubscribe is still safe to
 * call) where BroadcastChannel is unavailable.
 */
export function subscribeLockBroadcast(
  channelName: string = DEFAULT_CHANNEL_NAME,
  onLock: () => void,
): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  const channel = new BroadcastChannel(channelName);
  channel.onmessage = (event: MessageEvent) => {
    if (event.data === LOCK_MESSAGE) onLock();
  };
  return () => channel.close();
}
