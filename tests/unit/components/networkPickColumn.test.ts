import { describe, it, expect } from 'vitest';
import { pickColumn } from '@/components/network/pickColumn';
import type { Column } from '@/modules/network-status/roundStore';
import type { RoundSummary } from '@/modules/network-status/types';

function column(rootRound: number, x: number, shards: string[]): Column {
  const cells = new Map<string, RoundSummary>(
    shards.map((shardId) => [shardId, { shardId, index: 1, createdAt: x, totalCommitments: 0, rootHash: 'h', empty: true, seal: null }]),
  );
  return { rootRound, createdAt: x, certifiedAt: 0, signers: [], cells, totalCommitments: 0 };
}

describe('pickColumn', () => {
  // Shards 10 and 11 sealed one root round ahead: their column sits 6 px left of the others'.
  const ahead = column(99, 94, ['10', '11']);
  const rest = column(100, 100, ['00', '01']);
  const columns = [ahead, rest];
  const xOf = (c: Column) => c.createdAt;

  it("on a shard row, picks the column holding that shard's block even when another column is nearer", () => {
    expect(pickColumn(columns, xOf, 99, '10', 12)).toBe(ahead);
    expect(pickColumn(columns, xOf, 95, '00', 12)).toBe(rest);
  });

  it('on a root or heartbeat row, picks the nearest column', () => {
    expect(pickColumn(columns, xOf, 99, null, 12)).toBe(rest);
    expect(pickColumn(columns, xOf, 95, null, 12)).toBe(ahead);
  });

  it('falls back to the nearest column when the shard has no block within reach, and to nothing beyond reach', () => {
    expect(pickColumn(columns, xOf, 99, '111', 12)).toBe(rest);
    expect(pickColumn([column(99, 50, ['10']), rest], xOf, 99, '10', 12)).toBe(rest);
    expect(pickColumn(columns, xOf, 130, '00', 12)).toBeNull();
  });
});
