import type { ConnectionQuality } from './types';

interface QualityIndicatorProps {
  quality: ConnectionQuality | null;
}

export function QualityIndicator({ quality }: QualityIndicatorProps) {
  if (!quality) return null;

  const bars = quality.tier === 'high' ? 4
    : quality.tier === 'medium' ? 3
    : quality.tier === 'low' ? 2
    : 1;

  const color = bars >= 3 ? 'bg-green-400' : bars === 2 ? 'bg-yellow-400' : 'bg-red-400';

  return (
    <div className="flex items-end gap-0.5 h-4" title={`Quality: ${quality.tier} (RTT: ${Math.round(quality.rtt)}ms)`}>
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className={`w-1 rounded-full transition-colors ${
            i <= bars ? color : 'bg-white/20'
          }`}
          style={{ height: `${i * 25}%` }}
        />
      ))}
    </div>
  );
}
