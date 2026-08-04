import { useState, useEffect } from 'react';
import { useSphereContext } from './useSphere';

/**
 * wallet-api session connectivity (sphere-sdk `connection:status`): replaces
 * the old `realtime:status` wake-socket event AND `storage:degraded` — one
 * signal for "is the wallet-api session healthy". A window can be signed-in
 * while degraded, so cross-session updates would only land via the slower
 * poll backstop.
 */
export type RealtimeStatus = 'connected' | 'degraded' | 'offline' | null;

export interface UseRealtimeStatusReturn {
  /** null until the first `connection:status` event arrives (no SDK getter). */
  status: RealtimeStatus;
}

/**
 * Mirrors the SDK `connection:status` event into React so the Header can
 * reflect real session health (connected vs degraded/offline) rather than just
 * sign-in state. This is a liveness indicator, never a correctness gate (the
 * poll backstop carries correctness while degraded).
 */
export function useRealtimeStatus(): UseRealtimeStatusReturn {
  const { sphere } = useSphereContext();
  const [status, setStatus] = useState<RealtimeStatus>(null);

  useEffect(() => {
    if (!sphere) {
      setStatus(null);
      return;
    }

    // No SDK getter for the current connection state — seed from the event.
    // The session emits 'connected' on (re)establish, so the indicator
    // converges within one connection lifecycle.
    const handleStatus = (data: { status: Exclude<RealtimeStatus, null> }) => {
      setStatus(data.status);
    };

    sphere.on('connection:status', handleStatus);
    return () => {
      sphere.off('connection:status', handleStatus);
    };
  }, [sphere]);

  return { status };
}
