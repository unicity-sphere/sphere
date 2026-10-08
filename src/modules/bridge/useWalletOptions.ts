import { useEffect, useState } from 'react';

import type { BridgeAsset, BridgeWalletOption } from './types';

/** One way to sign, with its availability as it was when last read. */
export interface WalletChoice {
  readonly wallet: BridgeWalletOption;
  readonly available: boolean;
}

/**
 * The asset's wallet options, re-read every second while mounted: an extension can inject
 * or announce itself after the screen has rendered. The list only changes identity when an
 * option appears, disappears or changes availability, so a steady page does not re-render.
 */
export function useWalletOptions(asset: BridgeAsset | undefined): readonly WalletChoice[] {
  const [choices, setChoices] = useState<readonly WalletChoice[]>(() => read(asset));
  useEffect(() => {
    const refresh = () => {
      const next = read(asset);
      setChoices((prev) => (sameChoices(prev, next) ? prev : next));
    };
    refresh();
    const id = setInterval(refresh, 1000);
    return () => clearInterval(id);
  }, [asset]);
  return choices;
}

function read(asset: BridgeAsset | undefined): WalletChoice[] {
  return (asset?.wallets() ?? []).map((wallet) => ({ wallet, available: wallet.isAvailable() }));
}

function sameChoices(a: readonly WalletChoice[], b: readonly WalletChoice[]): boolean {
  return a.length === b.length && a.every((c, i) => c.wallet.id === b[i].wallet.id && c.available === b[i].available);
}
