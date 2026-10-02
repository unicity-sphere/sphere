import { describe, it, expect, vi } from 'vitest';
import type { Token } from '@unicitylabs/sphere-sdk';
import type { PaymentsV2 } from '@unicitylabs/sphere-sdk/payments-v2';

const held = new Map<string, string>();
vi.mock('../../../src/modules/registry', () => ({
  moduleTokenHold: vi.fn(async (token: Token) => (held.has(token.id) ? { reason: held.get(token.id) } : undefined)),
  moduleTokenView: (token: Token) => ({ ...token, symbol: 'USDC' }),
}));

import { refuseHeldSources } from '../../../src/sdk/holdGate';

const token = (id: string, coinId: string): Token => ({ id, coinId, amount: '1', status: 'confirmed' }) as Token;

function payments(tokens: Token[]): PaymentsV2 {
  return {
    tokens: (filter?: { coinId?: string }) => tokens.filter((t) => !filter?.coinId || t.coinId === filter.coinId),
    tokenJustification: async () => null,
  } as unknown as PaymentsV2;
}

describe('refuseHeldSources', () => {
  it('refuses a coin send while any token of the coin is held, since the wallet picks the sources itself', async () => {
    held.set('b', 'Settling on Ethereum, about 2 min left');
    await expect(refuseHeldSources(payments([token('a', 'usdc'), token('b', 'usdc')]), { coinId: 'usdc' })).rejects.toThrow(
      'USDC cannot be sent yet: Settling on Ethereum, about 2 min left.',
    );
  });

  it('lets a coin send through when the held token is not yet verified, since the wallet never picks it', async () => {
    held.set('b', 'Settling on Ethereum, about 2 min left');
    const pending = { ...token('b', 'usdc'), unverified: 'pending' } as Token;
    await expect(refuseHeldSources(payments([token('a', 'usdc'), pending]), { coinId: 'usdc' })).resolves.toBeUndefined();
  });

  it('lets a coin send through when the held token is of another coin', async () => {
    held.set('b', 'Settling on Ethereum, about 2 min left');
    await expect(refuseHeldSources(payments([token('a', 'uct'), token('b', 'usdc')]), { coinId: 'uct' })).resolves.toBeUndefined();
  });

  it('checks only the named token of a whole-token send', async () => {
    held.set('b', 'Settling on Ethereum, about 2 min left');
    const wallet = payments([token('a', 'usdc'), token('b', 'usdc')]);
    await expect(refuseHeldSources(wallet, { tokenId: 'a' })).resolves.toBeUndefined();
    await expect(refuseHeldSources(wallet, { tokenId: 'b' })).rejects.toThrow(/cannot be sent yet/);
  });
});
