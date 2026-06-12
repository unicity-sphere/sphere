import { useState, useEffect } from 'react';
import { useSphereContext } from './useSphere';

export type WalletApiSessionStatus = 'online' | 'offline' | null;

export interface UseWalletApiSessionReturn {
  /** null until the first sign-in attempt resolves, then 'online'/'offline'. */
  status: WalletApiSessionStatus;
  /** Error string from the last 'offline' transition; null while online. */
  lastError: string | null;
}

/**
 * wallet-api session health (#351 / sphere-sdk#515 F3): the SDK records a
 * failed wallet-api sign-in (`walletapi:session` event +
 * `sphere.walletApiSessionStatus`) instead of silently degrading. This hook
 * mirrors that state into React so the Header can show an offline badge.
 */
export function useWalletApiSession(): UseWalletApiSessionReturn {
  const { sphere } = useSphereContext();
  const [status, setStatus] = useState<WalletApiSessionStatus>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (!sphere) {
      setStatus(null);
      setLastError(null);
      return;
    }

    // Seed from the getter — the event may have fired during Sphere.init,
    // before this hook mounted.
    setStatus(sphere.walletApiSessionStatus);

    const handleSession = (data: { status: 'online' | 'offline'; error?: string }) => {
      setStatus(data.status);
      setLastError(
        data.status === 'offline' ? (data.error ?? 'wallet-api sign-in failed') : null,
      );
    };

    sphere.on('walletapi:session', handleSession);
    return () => {
      sphere.off('walletapi:session', handleSession);
    };
  }, [sphere]);

  return { status, lastError };
}
