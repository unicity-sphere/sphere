import { CloudOff } from 'lucide-react';
import { useSphereContext, useWalletApiSession } from '../../sdk/hooks';
import { HeaderTooltip } from './HeaderTooltip';

/**
 * Header badge for the wallet-api session state (#351 / sphere-sdk#515 F3).
 *
 * Renders ONLY when the wallet-api composition is active and the session is
 * 'offline' — i.e. the SDK could not sign in to the backend, so server
 * custody (inventory + mailbox) is not reachable even though the app booted.
 * The 2026-06-12 incident class: this state must be visible, never log-only.
 */
export function WalletApiSessionIndicator() {
  const { walletApiEnabled } = useSphereContext();
  const { status, lastError } = useWalletApiSession();

  if (!walletApiEnabled || status !== 'offline') return null;

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
