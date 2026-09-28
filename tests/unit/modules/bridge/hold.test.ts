import { describe, it, expect, vi } from 'vitest';
import type { Token } from '@unicitylabs/sphere-sdk';

const settling = vi.fn();
vi.mock('@/modules/bridge/assets', () => ({
  bridgeAssetByCoin: (coinId: string) =>
    coinId === 'bb'.repeat(32) ? { coinIdHex: coinId, chain: { name: 'Ethereum' }, settling } : undefined,
  bridgeAssets: () => [],
  bridgeAssetsFor: () => [],
}));

import bridgeModule from '@/modules/bridge/module';

let nextId = 0;
const token = (coinId: string, id = (nextId++).toString(16).padStart(64, '0')): Token =>
  ({ id, coinId, amount: '1000000', status: 'confirmed' }) as Token;
const ctx = { justification: async () => new Uint8Array([1]) };

describe('bridge module token hold', () => {
  it('holds a settling bridged token, naming the chain and the minutes left', async () => {
    settling.mockResolvedValueOnce({ final: false, secondsLeft: 84 });
    expect(await bridgeModule.tokenHold!(token('bb'.repeat(32)), ctx)).toEqual({ reason: 'Settling on Ethereum, about 2 min left' });
  });

  it('says under a minute when that is what is left', async () => {
    settling.mockResolvedValueOnce({ final: false, secondsLeft: 20 });
    expect(await bridgeModule.tokenHold!(token('bb'.repeat(32)), ctx)).toEqual({ reason: 'Settling on Ethereum, under a minute left' });
  });

  it('has no hold on a final token', async () => {
    settling.mockResolvedValueOnce({ final: true, secondsLeft: 0 });
    expect(await bridgeModule.tokenHold!(token('bb'.repeat(32)), ctx)).toBeUndefined();
  });

  it('does not ask the source chain again about a token whose lock was final', async () => {
    settling.mockResolvedValueOnce({ final: true, secondsLeft: 0 });
    const final = token('bb'.repeat(32));
    await bridgeModule.tokenHold!(final, ctx);
    const calls = settling.mock.calls.length;
    expect(await bridgeModule.tokenHold!(final, ctx)).toBeUndefined();
    expect(settling.mock.calls.length).toBe(calls);
  });

  it('keeps asking about a token that is still settling', async () => {
    settling.mockResolvedValue({ final: false, secondsLeft: 20 });
    const young = token('bb'.repeat(32));
    await bridgeModule.tokenHold!(young, ctx);
    const calls = settling.mock.calls.length;
    await bridgeModule.tokenHold!(young, ctx);
    expect(settling.mock.calls.length).toBe(calls + 1);
    settling.mockReset();
  });

  it('has no hold on an unverified token, which the wallet never spends, and does not ask the source chain', async () => {
    const calls = settling.mock.calls.length;
    const counterfeit = { ...token('bb'.repeat(32)), unverified: true } as Token;
    expect(await bridgeModule.tokenHold!(counterfeit, ctx)).toBeUndefined();
    expect(settling.mock.calls.length).toBe(calls);
  });

  it('has no hold on a token of a coin the bridge does not know', async () => {
    const calls = settling.mock.calls.length;
    expect(await bridgeModule.tokenHold!(token('cc'.repeat(32)), ctx)).toBeUndefined();
    expect(settling.mock.calls.length).toBe(calls);
  });

  it('holds the token when the source chain cannot be read, since not knowing is not safe', async () => {
    settling.mockRejectedValueOnce(new Error('node down'));
    expect(await bridgeModule.tokenHold!(token('bb'.repeat(32)), ctx)).toEqual({ reason: 'Cannot confirm finality on Ethereum right now' });
  });
});
