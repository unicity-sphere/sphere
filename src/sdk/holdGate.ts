import type { Token } from '@unicitylabs/sphere-sdk';
import type { PaymentsV2 } from '@unicitylabs/sphere-sdk/payments-v2';

import { moduleTokenHold, moduleTokenView } from '../modules/registry';

export type SpendSource = { readonly coinId: string } | { readonly tokenId: string };

export async function refuseHeldSources(payments: PaymentsV2, source: SpendSource): Promise<void> {
  const tokens = candidates(payments, source);
  const ctx = { justification: (tokenId: string) => payments.tokenJustification(tokenId) };
  const holds = await Promise.all(tokens.map((t) => moduleTokenHold(t, ctx)));
  const index = holds.findIndex((hold) => hold !== undefined);
  if (index < 0) return;
  throw new Error(`${moduleTokenView(tokens[index]).symbol} cannot be sent yet: ${holds[index]?.reason}.`);
}

function candidates(payments: PaymentsV2, source: SpendSource): Token[] {
  if ('tokenId' in source) return payments.tokens().filter((t) => t.id === source.tokenId);
  return payments.tokens({ coinId: source.coinId }).filter((t) => !t.unverified);
}
