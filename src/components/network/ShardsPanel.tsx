import { ExternalLink } from 'lucide-react';
import type { NetworkType } from '@unicitylabs/sphere-sdk';
import type { NetworkSnapshot, ShardStatus } from '../../modules/network-status/roundStore';
import { explorerShardUrl, formatAge, formatInteger } from '../../modules/network-status/format';
import { statusColor, type NetworkPalette } from './palette';

const STATUS_LABEL: Record<ShardStatus, string> = {
  ok: 'Healthy',
  stale: 'Stalled',
  unreachable: 'Unreachable',
  unknown: 'Waiting',
};

export function ShardsPanel({ snapshot, network, palette }: { snapshot: NetworkSnapshot; network: NetworkType; palette: NetworkPalette }) {
  const now = snapshot.computedAt;
  return (
    <ul className="divide-y divide-neutral-200 dark:divide-white/[0.06]">
      {snapshot.shards.map((shard) => (
        <li key={shard.shardId} className="flex items-center gap-3 py-2 text-sm">
          <span className="w-16 font-mono text-xs text-neutral-700 dark:text-white/75">Shard {shard.displayId}</span>
          <span className="inline-flex items-center gap-1.5 text-xs w-24" style={{ color: statusColor(shard.status, palette) }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor(shard.status, palette) }} aria-hidden="true" />
            {STATUS_LABEL[shard.status]}
          </span>
          <span className="font-mono text-xs text-neutral-900 dark:text-white/90">#{formatInteger(shard.latestIndex)}</span>
          <span className="ml-auto text-xs text-neutral-500 dark:text-white/40 whitespace-nowrap" title={shard.lastError ?? undefined}>
            {shard.status === 'unreachable' && shard.lastError ? shard.lastError : shard.lastAdvanceAt ? `${formatAge(now - shard.lastAdvanceAt)} ago` : '—'}
          </span>
          <a
            href={explorerShardUrl(network, shard.shardId)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 -m-1 text-neutral-400 hover:text-orange-500 dark:text-white/30 dark:hover:text-brand-orange transition-colors"
            aria-label={`Open shard ${shard.displayId} in the SMT explorer`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </li>
      ))}
    </ul>
  );
}
