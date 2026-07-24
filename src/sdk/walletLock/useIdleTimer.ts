import { useEffect, useRef } from 'react';

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
  channelName?: string;
}): void {
  const onIdleRef = useRef(opts.onIdle);
  onIdleRef.current = opts.onIdle;

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
      const now = performance.now();
      if (channel && now - lastBroadcast > THROTTLE_MS) {
        lastBroadcast = now;
        channel.postMessage('activity');
      }
    };
    // Remote activity (another tab): rearm only, don't rebroadcast.
    if (channel) channel.onmessage = () => arm();

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onLocalActivity, { passive: true }));
    arm();

    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onLocalActivity));
      channel?.close();
    };
  }, [opts.enabled, opts.timeoutMs, opts.channelName]);
}
