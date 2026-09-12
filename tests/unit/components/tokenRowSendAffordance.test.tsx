import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Token, CoinlessToken } from '@unicitylabs/sphere-sdk';

import { TokenRow } from '../../../src/components/wallet/shared/components/TokenRow';
import { CoinlessTokenRow } from '../../../src/components/wallet/shared/components/CoinlessTokenRow';

/**
 * A row may only offer Send for a token the SDK would actually accept as a
 * source. `spendableToken()` refuses an in-flight token and a #625-demoted one
 * (state proven spent on-chain), so offering the action for either promises
 * something that can only come back as "not a spendable holding".
 */
const coin = (over: Partial<Token> = {}): Token =>
  ({
    id: 'aa'.repeat(32),
    coinId: 'bb'.repeat(32),
    symbol: 'UCT',
    name: 'Unicity',
    decimals: 0,
    amount: '100',
    status: 'confirmed',
    createdAt: 1,
    updatedAt: 1,
    ...over,
  }) as Token;

const nft = (over: Partial<CoinlessToken> = {}): CoinlessToken =>
  ({
    tokenId: 'cc'.repeat(32),
    tokenType: 'dd'.repeat(32),
    name: 'Cool Cat',
    stateHash: 's',
    transferring: false,
    createdAt: 1,
    updatedAt: 1,
    ...over,
  }) as CoinlessToken;

const sendButton = () => screen.queryByRole('button', { name: 'Send this token' });

describe('the Send affordance tracks spendability', () => {
  it('offers Send for a settled coin token', () => {
    render(<TokenRow token={coin()} delay={0} isNew={false} onSend={vi.fn()} />);
    expect(sendButton()).toBeTruthy();
  });

  it('withholds it from a #625-demoted coin token', () => {
    // status stays 'confirmed' on a demoted row, so the status check alone misses it.
    render(<TokenRow token={coin({ suspectedSpent: true })} delay={0} isNew={false} onSend={vi.fn()} />);
    expect(sendButton()).toBeNull();
  });

  it('withholds it from an in-flight coin token', () => {
    render(<TokenRow token={coin({ status: 'transferring' })} delay={0} isNew={false} onSend={vi.fn()} />);
    expect(sendButton()).toBeNull();
  });

  it('offers Send for a settled coinless token', () => {
    render(<CoinlessTokenRow token={nft()} delay={0} isNew={false} onSend={vi.fn()} />);
    expect(sendButton()).toBeTruthy();
  });

  it('withholds it from a #625-demoted coinless token', () => {
    render(
      <CoinlessTokenRow token={nft({ suspectedSpent: true })} delay={0} isNew={false} onSend={vi.fn()} />,
    );
    expect(sendButton()).toBeNull();
  });

  it('still RENDERS a demoted token — a demotion is recoverable by resync', () => {
    // Withholding the action must not hide the holding: #625 marks a source
    // suspect and resync can clear it, so the token is not gone.
    render(
      <CoinlessTokenRow token={nft({ suspectedSpent: true })} delay={0} isNew={false} onSend={vi.fn()} />,
    );
    expect(screen.getByText('Cool Cat')).toBeTruthy();
  });
});
