import { CloudOff, RadioTower } from 'lucide-react';
import { useSphereContext, useWalletApiSession, useRealtimeStatus } from '../../sdk/hooks';
import { HeaderTooltip } from './HeaderTooltip';

/**
 * Header badge for the wallet-api session state (#351 / sphere-sdk#515 F3) and
 * the realtime wake-socket liveness (`realtime:status`).
 *
 * Two distinct, ordered states (sign-in is the hard failure, takes priority):
 *  - session 'offline' — the SDK could not sign in, so server custody
 *    (inventory + mailbox) is unreachable even though the app booted. The
 *    2026-06-12 incident class: must be visible, never log-only.
 *  - signed-in but the wake socket is 'reconnecting'/'closed' — cross-session
 *    updates won't arrive in realtime (they fall back to the slower poll
 *    backstop). A window can be signed-in while its wake socket is dead, so
 *    this liveness is surfaced separately from sign-in.
 */
export function WalletApiSessionIndicator() {
  const { walletApiEnabled } = useSphereContext();
  const { status, lastError } = useWalletApiSession();
  const { status: realtimeStatus } = useRealtimeStatus();

  if (!walletApiEnabled) return null;

  if (status === 'offline') {
    return (
      <HeaderTooltip
        label={lastError ?? 'wallet-api sign-in failed — assets are unavailable'}
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

  // Wake-socket degraded while signed-in: realtime updates are delayed (the
  // poll backstop still keeps state correct), so this is a milder warning.
  if (realtimeStatus === 'reconnecting' || realtimeStatus === 'closed') {
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
