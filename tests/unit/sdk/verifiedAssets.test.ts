import { describe, it, expect } from 'vitest';
import type { Asset } from '@unicitylabs/sphere-sdk';

import { assetKey, verifiedAssets } from '@/sdk/verifiedAssets';

const COIN = 'bb'.repeat(32);
const holding = (over: Partial<Asset> = {}) => ({ coinId: COIN, totalAmount: '10', ...over }) as Asset;

describe('verified assets', () => {
  it('keys a verified and an unverified holding of one coin apart', () => {
    expect(assetKey(holding())).not.toBe(assetKey(holding({ unverified: true })));
    expect(assetKey(holding())).toBe(COIN);
  });

  it('keeps only the holdings a send may spend', () => {
    const verified = holding();
    expect(verifiedAssets([holding({ unverified: true }), verified])).toEqual([verified]);
  });
});
