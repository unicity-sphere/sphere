import { useState } from 'react';
import { Coins } from 'lucide-react';
import { TokenRegistry } from '@unicitylabs/sphere-sdk';

interface TokenIconProps {
  coinId: string;
  size?: number;
  className?: string;
}

export function TokenIcon({ coinId, size = 32, className = '' }: TokenIconProps) {
  const [errored, setErrored] = useState(false);

  const registry = TokenRegistry.getInstance();
  const def = registry.getDefinition(coinId);
  const iconUrl = registry.getIconUrl(coinId);

  if (!errored && iconUrl) {
    return (
      <img
        src={iconUrl}
        alt={def?.symbol ?? 'token'}
        width={size}
        height={size}
        onError={() => setErrored(true)}
        className={`rounded-full bg-white ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  // Fallback: symbol badge or coin icon
  const initial = def?.symbol?.slice(0, 2) ?? def?.name?.slice(0, 2)?.toUpperCase();
  if (initial) {
    return (
      <div
        className={`rounded-full bg-linear-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center font-bold ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {initial}
      </div>
    );
  }
  return (
    <div
      className={`rounded-full bg-neutral-200 dark:bg-white/8 flex items-center justify-center text-neutral-500 dark:text-white/55 ${className}`}
      style={{ width: size, height: size }}
    >
      <Coins style={{ width: size * 0.55, height: size * 0.55 }} />
    </div>
  );
}
