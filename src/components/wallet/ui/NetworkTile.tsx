import { Globe } from 'lucide-react';
import type { NetworkType } from '@unicitylabs/sphere-sdk';
import { isTestMoney } from '../../../config/networkCapabilities';

/**
 * The wallet's one rule for colouring a network, lifted out of NetworkModal so every surface
 * that names a network obeys it: COLOUR SAYS WHAT KIND OF MONEY THE NETWORK HOLDS — amber for
 * test, emerald for real — and never which row happens to be selected. `muted` is the separate
 * "cannot be used at all" axis and is the only thing allowed to override the money colour.
 *
 * Both answers come from the fail-closed allowlist in config/networkCapabilities, never from a
 * literal network name, so a network nobody has listed reads as real money until someone lists
 * it on purpose.
 */

/** Two words for what the money here is. */
export function networkMoneyLabel(network: NetworkType): string {
  return isTestMoney(network) ? 'Test money' : 'Real money';
}

interface NetworkTileProps {
  network: NetworkType;
  size?: 'sm' | 'md' | 'lg';
  muted?: boolean;
}

export function NetworkTile({ network, size = 'md', muted = false }: NetworkTileProps) {
  const box = { sm: 'w-8 h-8 rounded-lg', md: 'w-12 h-12 rounded-xl', lg: 'w-16 h-16 rounded-2xl' }[size];
  const glyph = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }[size];
  const tone = muted
    ? 'bg-neutral-500/10 text-neutral-400 dark:text-white/30'
    : isTestMoney(network)
      ? 'bg-amber-500/10 text-amber-500'
      : 'bg-emerald-500/10 text-emerald-500';

  return (
    <div className={`${box} ${tone} flex items-center justify-center shrink-0`}>
      <Globe className={glyph} />
    </div>
  );
}
