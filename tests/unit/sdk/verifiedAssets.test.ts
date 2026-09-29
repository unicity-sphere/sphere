import { describe, it, expect } from 'vitest';
import type { Asset, Token } from '@unicitylabs/sphere-sdk';

import { assetKey, shownAssets, shownTokens, verifiedAssets } from '@/sdk/verifiedAssets';

const COIN = 'bb'.repeat(32);
const holding = (over: Partial<Asset> = {}) => ({ coinId: COIN, totalAmount: '10', ...over }) as Asset;

describe('verified assets', () => {
  it('keys the verified, pending and refused holdings of one coin apart', () => {
    const keys = [holding(), holding({ unverified: 'pending' }), holding({ unverified: 'refused' })].map(assetKey);
    expect(new Set(keys).size).toBe(3);
    expect(keys[0]).toBe(COIN);
  });

  it('keeps only the holdings a send may spend', () => {
    const verified = holding();
    expect(verifiedAssets([holding({ unverified: 'refused' }), holding({ unverified: 'pending' }), verified])).toEqual([verified]);
  });

  it('shows the counted holdings and then the unverified ones, which the SDK reads apart', async () => {
    const counted = holding();
    const refused = holding({ unverified: 'refused' });
    const token = (id: string, unverified?: 'pending') => ({ id, ...(unverified ? { unverified } : {}) }) as Token;
    const payments = {
      assets: async () => [counted],
      unverifiedAssets: async () => [refused],
      tokens: () => [token('a')],
      unverifiedTokens: () => [token('b', 'pending')],
    };

    expect(await shownAssets(payments)).toEqual([counted, refused]);
    expect(shownTokens(payments).map((t) => t.id)).toEqual(['a', 'b']);
  });
});
