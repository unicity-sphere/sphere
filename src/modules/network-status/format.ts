import type { NetworkType } from '@unicitylabs/sphere-sdk';

const SMT_EXPLORER_URL = 'https://unicitynetwork.github.io/smt-explorer/';

/** smt-explorer names networks by their gateway, so both testnet aliases are `testnet2`. */
export function explorerNetwork(network: NetworkType): string {
  return network === 'mainnet' ? 'mainnet' : 'testnet2';
}

export function explorerBlockUrl(network: NetworkType, shardId: string, index: number): string {
  const params = new URLSearchParams({ network: explorerNetwork(network), shard: shardId, block: String(index) });
  return `${SMT_EXPLORER_URL}?${params}`;
}

export function explorerShardUrl(network: NetworkType, shardId: string): string {
  const params = new URLSearchParams({ network: explorerNetwork(network), shard: shardId });
  return `${SMT_EXPLORER_URL}?${params}`;
}

const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export function formatInteger(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : integer.format(n);
}

/** `0.4 s`, `12 s`, `3 min` — an age for humans. */
export function formatAge(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1_000) return '<1 s';
  if (ms < 10_000) return `${Math.max(0, ms / 1000).toFixed(1)} s`;
  if (ms < 120_000) return `${Math.round(ms / 1000)} s`;
  return `${Math.round(ms / 60_000)} min`;
}

export function formatSeconds(ms: number | null, digits = 2): string {
  return ms === null ? '—' : (ms / 1000).toFixed(digits);
}

export function formatRate(perSecond: number | null): string {
  if (perSecond === null) return '—';
  if (perSecond === 0) return '0';
  if (perSecond < 0.1) return perSecond.toFixed(3);
  if (perSecond < 10) return perSecond.toFixed(2);
  return integer.format(perSecond);
}

export function formatShare(share: number | null): string {
  return share === null ? '—' : `${(share * 100).toFixed(share > 0 && share < 0.01 ? 1 : 0)}`;
}

/** UTC wall time of a unix-seconds seal timestamp, e.g. `14:03:27`. */
export function formatSealTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(11, 19);
}

export function formatClock(ms: number): string {
  return new Date(ms).toISOString().slice(11, 19);
}
