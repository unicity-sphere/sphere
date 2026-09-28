import { describe, it, expect } from 'vitest';
import type { Token } from '@unicitylabs/sphere-sdk';
import type { BridgePayments } from '@unicitylabs/bridge-core';

import { returnCandidates, splitReturnable } from '@/modules/bridge/returnable';
import type { BridgeAsset, BridgeOutSide } from '@/modules/bridge/types';

const REASON_V2 = new Uint8Array([2]);
const REASON_V1 = new Uint8Array([1]);

function wallet(reasons: Record<string, Uint8Array | null | Error>): BridgePayments {
  return {
    tokenJustification: async (id: string) => {
      const r = reasons[id];
      if (r instanceof Error) throw r;
      return r ?? null;
    },
  } as unknown as BridgePayments;
}

const out = { backs: (j: Uint8Array) => j[0] === 2 } as unknown as BridgeOutSide;
const tokens = (...ids: string[]) => ids.map((id) => ({ id })) as Token[];

describe('returnCandidates', () => {
  it('offers the confirmed, verified tokens of the bridged coin', () => {
    const asset = { coinIdHex: 'bb'.repeat(32) } as BridgeAsset;
    const held = (id: string, over: Partial<Token> = {}) => ({ id, coinId: 'BB'.repeat(32), status: 'confirmed', ...over }) as Token;

    const candidates = returnCandidates(asset, [
      held('good'),
      held('unverified', { unverified: true }),
      held('moving', { status: 'transferring' }),
      held('spent', { suspectedSpent: true }),
      held('other', { coinId: 'cc'.repeat(32) }),
    ]);

    expect(candidates.map((t) => t.id)).toEqual(['good']);
  });
});

describe('splitReturnable', () => {
  it('offers only tokens whose mint reason names the active vault', async () => {
    const payments = wallet({ new: REASON_V2, old: REASON_V1, plain: null });
    const { eligible, ineligible } = await splitReturnable(payments, out, tokens('new', 'old', 'plain'));
    expect(eligible.map((t) => t.id)).toEqual(['new']);
    expect(ineligible.map((t) => t.id)).toEqual(['old', 'plain']);
  });

  it('treats a token whose reason cannot be read as not returnable', async () => {
    const payments = wallet({ new: REASON_V2, broken: new Error('no blob in storage') });
    const { eligible, ineligible } = await splitReturnable(payments, out, tokens('new', 'broken'));
    expect(eligible.map((t) => t.id)).toEqual(['new']);
    expect(ineligible.map((t) => t.id)).toEqual(['broken']);
  });
});
