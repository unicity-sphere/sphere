import { CloudOff, RadioTower } from 'lucide-react';
import { useSphereContext, useRealtimeStatus } from '../../sdk/hooks';
import { HeaderTooltip } from './HeaderTooltip';

/**
 * Header badge for the wallet-api session health, driven solely by the SDK's
 * `connection:status` event (mirrored by useRealtimeStatus).
 *
 * Post-flip (sdk 0.14.1): `sphere.walletApiSessionStatus` and the
 * `walletapi:session` event are deleted — sign-in state and connection
 * liveness are one consolidated signal now:
 *  - 'offline' — the wallet-api session is unreachable (sign-in failed or the
 *    backend is down), so server custody (inventory + mailbox) is unavailable.
 *    The 2026-06-12 incident class: must be visible, never log-only.
 *  - 'degraded' — signed-in but realtime updates are paused; cross-session
 *    changes fall back to the slower poll backstop. A milder warning.
 */
export function WalletApiSessionIndicator() {
  const { walletApiEnabled } = useSphereContext();
  const { status } = useRealtimeStatus();

  if (!walletApiEnabled) return null;

  if (status === 'offline') {
    return (
      <HeaderTooltip
        label="Wallet API unreachable — assets are unavailable until the connection recovers"
      >
        <div className="relative flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-lg sm:rounded-xl bg-red-500/10">
          <span className="relative">
            <CloudOff className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 dark:text-red-500" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
          </span>
          <span className="text-xs font-medium text-red-400 dark:text-red-500">
            Wallet API offline
          </span>
        </div>
      </HeaderTooltip>
    );
  }

  // Connection degraded while signed-in: realtime updates are delayed (the
  // poll backstop still keeps state correct), so this is a milder warning.
  if (status === 'degraded') {
    return (
      <HeaderTooltip
        label="Realtime updates paused — reconnecting. Changes from other windows may be delayed."
      >
        <div className="relative flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-lg sm:rounded-xl bg-amber-500/10">
          <span className="relative">
            <RadioTower className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 dark:text-amber-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500" />
          </span>
          <span className="text-xs font-medium text-amber-500 dark:text-amber-400">
            Reconnecting
          </span>
        </div>
      </HeaderTooltip>
    );
  }

  return null;
}
