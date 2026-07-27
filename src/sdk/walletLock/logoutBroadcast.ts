/**
 * Cross-tab logout / wallet-deleted signal (graceful lock §8.1).
 *
 * `deleteWallet()` wipes IndexedDB and localStorage but does NOT reload the
 * page, so a neighbouring tab keeps a live decrypted Sphere over storage that
 * no longer exists — and, now that a Connect session survives a lock, keeps
 * serving a dApp from it with the deleted wallet's granted permissions.
 *
 * Deliberately NOT modelled on lockBroadcast's fire-and-forget string message:
 * a lock is idempotent and a loopback is harmless, but a logout teardown races
 * deleteWallet()'s own re-initialize(). The message therefore carries a per-tab
 * sender id and a tab ignores its own.
 *
 * Pure module, no React: BroadcastChannel only, guarded for environments where
 * it does not exist.
 */
export const LOGOUT_CHANNEL_NAME = 'sphere-wallet-logout';

const LOGOUT_MESSAGE = 'logout';

/** Identifies THIS tab for the lifetime of the document. Not a secret. */
const SENDER_ID = `tab-${Math.random().toString(36).slice(2)}`;

interface LogoutMessage {
  type: string;
  sender: string;
}

/** Tell every OTHER tab the wallet was deleted / logged out. */
export function broadcastLogout(channelName: string = LOGOUT_CHANNEL_NAME): void {
  if (typeof BroadcastChannel === 'undefined') return;
  const channel = new BroadcastChannel(channelName);
  channel.postMessage({ type: LOGOUT_MESSAGE, sender: SENDER_ID } satisfies LogoutMessage);
  channel.close();
}

/**
 * Call `onLogout` when ANOTHER tab broadcasts a logout. Returns an unsubscribe
 * function. No-op subscription (unsubscribe still safe to call) where
 * BroadcastChannel is unavailable.
 */
export function subscribeLogoutBroadcast(
  channelName: string = LOGOUT_CHANNEL_NAME,
  onLogout: () => void,
): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  const channel = new BroadcastChannel(channelName);
  channel.onmessage = (event: MessageEvent) => {
    const data = event.data as Partial<LogoutMessage> | undefined;
    if (!data || typeof data !== 'object') return;
    if (data.type !== LOGOUT_MESSAGE) return;
    if (data.sender === SENDER_ID) return; // our own tab — already tearing down
    onLogout();
  };
  return () => channel.close();
}
