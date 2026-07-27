import { useEffect, useRef } from 'react';

/**
 * Activity that rearms the idle timer. STRICT by policy (graceful lock §8.5):
 * `message` is deliberately ABSENT. Traffic from a framed dApp arrives as a
 * window `message` event, and counting it would let an embedded page hold the
 * wallet unlocked forever by polling. The cost — a user working inside a
 * cross-origin agent tab looks idle, because DOM events there do not bubble to
 * the wallet window — is acceptable only because a lock no longer drops the
 * dApp connection: the host answers WALLET_LOCKED (4009) and the wallet lights
 * a passive badge. An explicit SDK activity ping on user gesture is the
 * follow-up; do not "fix" surprise auto-locks by adding `message` here —
 * tests/unit/sdk/walletLock/idlePolicyStrict.test.tsx guards it.
 */
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'] as const;
const THROTTLE_MS = 1000;

/**
 * Fires `onIdle` after `timeoutMs` with no user activity in ANY tab. Activity is
 * shared across tabs via BroadcastChannel so an idle background tab never locks
 * an actively-used one. No-op when disabled or timeoutMs is null. See #449.
 */
export function useIdleTimer(opts: {
  timeoutMs: number | null;
  enabled: boolean;
  onIdle: () => void;
  /**
   * Fired on every observed activity, local or from another tab. Used to refresh the remembered
   * unlock's expiry so a long working session is not cut short by a reload — throttle inside the
   * callback, this fires as often as the user moves.
   */
  onActivity?: () => void;
  channelName?: string;
}): void {
  const onIdleRef = useRef(opts.onIdle);
  onIdleRef.current = opts.onIdle;
  const onActivityRef = useRef(opts.onActivity);
  onActivityRef.current = opts.onActivity;

  useEffect(() => {
    if (!opts.enabled || opts.timeoutMs == null) return;
    const timeoutMs = opts.timeoutMs;
    const channelName = opts.channelName ?? 'sphere-wallet-activity';

    let timer: ReturnType<typeof setTimeout>;
    // -Infinity so the very first activity is never throttle-gated (see #449 review).
    let lastBroadcast = -Infinity;
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(channelName) : null;

    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => onIdleRef.current(), timeoutMs);
    };
    // Local activity: rearm + tell other tabs (throttled).
    const onLocalActivity = () => {
      arm();
      onActivityRef.current?.();
      const now = performance.now();
      if (channel && now - lastBroadcast > THROTTLE_MS) {
        lastBroadcast = now;
        channel.postMessage('activity');
      }
    };
    // Remote activity (another tab): rearm only, don't rebroadcast.
    if (channel) channel.onmessage = () => {
      arm();
      onActivityRef.current?.();
    };

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onLocalActivity, { passive: true }));
    arm();

    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onLocalActivity));
      channel?.close();
    };
  }, [opts.enabled, opts.timeoutMs, opts.channelName]);
}
