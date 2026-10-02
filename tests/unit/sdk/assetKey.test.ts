import { describe, it, expect } from 'vitest';
import type { Asset } from '@unicitylabs/sphere-sdk';

import { assetKey } from '@/sdk/assetKey';

const COIN = 'bb'.repeat(32);
const holding = (over: Partial<Asset> = {}) => ({ coinId: COIN, totalAmount: '10', ...over }) as Asset;

describe('asset keys', () => {
  it('keys the verified, pending and refused holdings of one coin apart', () => {
    const keys = [holding(), holding({ unverified: 'pending' }), holding({ unverified: 'refused' })].map(assetKey);
    expect(new Set(keys).size).toBe(3);
    expect(keys[0]).toBe(COIN);
  });
});
