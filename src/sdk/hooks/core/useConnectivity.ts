import { useState, useEffect } from 'react';
import { useSphereContext } from './useSphere';

/**
 * Backend reachability state, mirroring the SDK's ConnectivityBackendStatus.
 * `'unknown'` is the initial state before the first probe lands.
 */
export type ConnectivityBackendStatus = 'up' | 'down' | 'degraded' | 'unknown';

/**
 * Snapshot of the SDK's `sphere.connectivity.status()` for the three
 * backends the SDK pings (issue #312): aggregator, IPFS, Nostr.
 *
 * `lastOnlineAt`  — ms-epoch of the most recent moment all three were `'up'`
 * `lastChangedAt` — ms-epoch of the most recent backend transition
 */
export interface UseConnectivityReturn {
  aggregator: ConnectivityBackendStatus;
  ipfs: ConnectivityBackendStatus;
  nostr: ConnectivityBackendStatus;
  lastOnlineAt: number | null;
  lastChangedAt: number;
}

const INITIAL: UseConnectivityReturn = {
  aggregator: 'unknown',
  ipfs: 'unknown',
  nostr: 'unknown',
  lastOnlineAt: null,
  lastChangedAt: 0,
};

/**
 * Hook that exposes the SDK's `sphere.connectivity` snapshot as reactive
 * React state. Resubscribes when the Sphere instance changes (e.g. on
 * wallet load / switch).
 *
 * The status is read synchronously on mount via `sphere.connectivity.status()`
 * so the very first render reflects the latest known value (not always
 * `'unknown'`) when the wallet has been alive for a while.
 */
export function useConnectivity(): UseConnectivityReturn {
  const { sphere } = useSphereContext();
  const [state, setState] = useState<UseConnectivityReturn>(INITIAL);

  useEffect(() => {
    if (!sphere) {
      setState(INITIAL);
      return;
    }

    // Capture current snapshot synchronously — avoids a flicker through
    // 'unknown' when the wallet has been online for a while before this
    // component mounted.
    try {
      const snapshot = sphere.connectivity.status();
      setState({
        aggregator: snapshot.aggregator,
        ipfs: snapshot.ipfs,
        nostr: snapshot.nostr,
        lastOnlineAt: snapshot.lastOnlineAt,
        lastChangedAt: snapshot.lastChangedAt,
      });
    } catch {
      // sphere.connectivity may not be wired when the wallet is in the
      // legacy / no-oracle configuration. Leave the INITIAL state.
    }

    const unsubscribe = sphere.connectivity.subscribe((snapshot) => {
      setState({
        aggregator: snapshot.aggregator,
        ipfs: snapshot.ipfs,
        nostr: snapshot.nostr,
        lastOnlineAt: snapshot.lastOnlineAt,
        lastChangedAt: snapshot.lastChangedAt,
      });
    });

    // Production-observed issue: after a Sphere re-init (mode switch,
    // mnemonic re-import, etc.), the SDK's per-backend pingers may
    // have been bumped to their long backoff (15s → 60s → 5m) by
    // probes that fired during the transient disconnect window. The
    // banner would then show IPFS/Nostr as 'down' for minutes after
    // the underlying transports recovered. Forcing an immediate ping
    // here pulls fresh probe results within seconds, regardless of
    // where the backoff schedule currently is.
    //
    // Fire-and-forget: any throw from .ping() is best-effort and
    // surfaces through the SDK's own event bus.
    try {
      void sphere.connectivity.ping('all').catch(() => undefined);
    } catch {
      // sphere.connectivity stub may not implement ping; ignore.
    }

    return unsubscribe;
  }, [sphere]);

  return state;
}
