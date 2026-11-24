import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { RoundsTable } from '@/components/network/RoundsTable';
import { RoundStore } from '@/modules/network-status/roundStore';
import type { RoundSummary } from '@/modules/network-status/types';

const SHARDS = ['00', '01', '10', '11'];

/** testnet2's shape: shards 10 and 11 sealed one root round ahead of 00 and 01, every shard on every round. */
function staggered(n: number): RoundSummary[] {
  return SHARDS.map((shardId) => {
    const ahead = shardId.startsWith('1');
    return {
      shardId,
      index: 1000 + n,
      createdAt: 1_000_000 + n * 900 - (ahead ? 300 : 0),
      totalCommitments: 0,
      rootHash: `h${n}`,
      empty: true,
      seal: { rootRound: 100 + 3 * n - (ahead ? 1 : 0), certifiedAt: 1000, signers: ['root-a'] },
    };
  });
}

describe('RoundsTable', () => {
  it('shows a shard sealed in a neighbouring root round as absent from this one, never as missed', () => {
    const store = new RoundStore({ now: () => 5_000 });
    store.setShards(SHARDS);
    store.ingest([0, 1, 2].flatMap(staggered));
    const { container } = render(<RoundsTable snapshot={store.getSnapshot()} network="testnet" />);
    const rows = [...container.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td')].slice(4).map((td) => td.textContent));
    expect(container.textContent).not.toMatch(/missed/i);
    // Newest first: root round 106 sealed shards 00 and 01, root round 105 sealed 10 and 11.
    expect(rows.slice(0, 2)).toEqual([
      ['#1002', '#1002', '—', '—'],
      ['—', '—', '#1002', '#1002'],
    ]);
  });
});
