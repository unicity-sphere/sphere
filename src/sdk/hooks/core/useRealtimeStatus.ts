import { useState, useEffect } from 'react';
import { useSphereContext } from './useSphere';

/**
 * Wake-socket liveness (sphere-sdk `realtime:status`): the true state of the
 * §9 realtime wake channel — DISTINCT from the wallet-api sign-in session
 * (`walletapi:session`). A window can be signed-in while its wake socket is
 * dead, so cross-session updates would only land via the slower poll backstop.
 */
export type RealtimeStatus = 'connecting' | 'connected' | 'reconnecting' | 'closed' | null;

export interface UseRealtimeStatusReturn {
  /** null until the first `realtime:status` event arrives (no SDK getter). */
  status: RealtimeStatus;
}

/**
 * Mirrors the SDK `realtime:status` event into React so the Header can reflect
 * real wake-socket health (connected vs reconnecting/closed) rather than just
 * sign-in state. The wake is only a nudge — this is a liveness indicator, never
 * a correctness gate (the poll backstop carries correctness while reconnecting).
 */
export function useRealtimeStatus(): UseRealtimeStatusReturn {
  const { sphere } = useSphereContext();
  const [status, setStatus] = useState<RealtimeStatus>(null);

  useEffect(() => {
    if (!sphere) {
      setStatus(null);
      return;
    }

    // No SDK getter for the current wake-socket state — seed from the event.
    // The socket emits 'connecting'/'connected' on (re)establish, so the
    // indicator converges within one wake-channel lifecycle.
    const handleStatus = (data: { status: Exclude<RealtimeStatus, null> }) => {
      setStatus(data.status);
    };

    sphere.on('realtime:status', handleStatus);
    return () => {
      sphere.off('realtime:status', handleStatus);
    };
  }, [sphere]);

  return { status };
}
