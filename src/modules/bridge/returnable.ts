import type { Token } from '@unicitylabs/sphere-sdk';
import type { BridgePayments } from '@unicitylabs/bridge-core';

import type { BridgeOutSide } from './types';

export interface ReturnableSplit {
  readonly eligible: Token[];
  readonly ineligible: Token[];
}

export async function splitReturnable(payments: BridgePayments, out: BridgeOutSide, tokens: readonly Token[]): Promise<ReturnableSplit> {
  const verdicts = await Promise.all(tokens.map((t) => backedByVault(payments, out, t.id)));
  return {
    eligible: tokens.filter((_, i) => verdicts[i]),
    ineligible: tokens.filter((_, i) => !verdicts[i]),
  };
}

async function backedByVault(payments: BridgePayments, out: BridgeOutSide, tokenId: string): Promise<boolean> {
  try {
    return await out.backs(await payments.tokenJustification(tokenId));
  } catch {
    return false;
  }
}
