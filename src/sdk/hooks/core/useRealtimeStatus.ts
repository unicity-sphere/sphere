import { useState, useEffect } from 'react';
import { useSphereContext } from './useSphere';
import { getPayments } from '../../payments';

/**
 * wallet-api session connectivity (sphere-sdk `connection:status`): replaces
 * the old `realtime:status` wake-socket event AND `storage:degraded` — one
 * signal for "is the wallet-api session healthy". A window can be signed-in
 * while degraded, so cross-session updates would only land via the slower
 * poll backstop.
 */
export type RealtimeStatus = 'connected' | 'degraded' | 'offline' | null;

export interface UseRealtimeStatusReturn {
  /** null only while no wallet is mounted; otherwise seeded, never event-dependent. */
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

    // SEED from the getter before subscribing (sphere-sdk >= 0.14.2).
    // `connection:status` can fire DURING Sphere.init — before this component
    // mounts — and during a persistent outage no further transition ever comes,
    // so an event-only indicator would stay blank exactly when it matters most
    // (sphere#473). The getter reads the session's live status, so seed + event
    // cannot disagree.
    setStatus(getPayments(sphere)?.connectionStatus() ?? null);

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
