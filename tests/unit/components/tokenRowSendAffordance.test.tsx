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

describe('the Send affordance follows a flag that changes on an already-mounted row', () => {
  // Both rows are memoized with custom comparators. A refetch or resync that
  // changes ONLY suspectedSpent leaves every other compared field identical, so
  // a comparator that omits the flag skips the re-render and the button keeps
  // reflecting the old value. rerender() reuses the mounted instance, which is
  // exactly the path the memo comparator guards.
  it('drops Send from a coin row when it is demoted in place', () => {
    const onSend = vi.fn();
    const { rerender } = render(<TokenRow token={coin()} delay={0} isNew={false} onSend={onSend} />);
    expect(sendButton()).toBeTruthy();

    rerender(<TokenRow token={coin({ suspectedSpent: true })} delay={0} isNew={false} onSend={onSend} />);
    expect(sendButton()).toBeNull();
  });

  it('restores Send to a coin row when a resync clears the demotion', () => {
    const onSend = vi.fn();
    const { rerender } = render(
      <TokenRow token={coin({ suspectedSpent: true })} delay={0} isNew={false} onSend={onSend} />,
    );
    expect(sendButton()).toBeNull();

    rerender(<TokenRow token={coin()} delay={0} isNew={false} onSend={onSend} />);
    expect(sendButton()).toBeTruthy();
  });

  it('drops Send from a coinless row when it is demoted in place', () => {
    const onSend = vi.fn();
    const { rerender } = render(<CoinlessTokenRow token={nft()} delay={0} isNew={false} onSend={onSend} />);
    expect(sendButton()).toBeTruthy();

    rerender(<CoinlessTokenRow token={nft({ suspectedSpent: true })} delay={0} isNew={false} onSend={onSend} />);
    expect(sendButton()).toBeNull();
  });

  it('restores Send to a coinless row when a resync clears the demotion', () => {
    const onSend = vi.fn();
    const { rerender } = render(
      <CoinlessTokenRow token={nft({ suspectedSpent: true })} delay={0} isNew={false} onSend={onSend} />,
    );
    expect(sendButton()).toBeNull();

    rerender(<CoinlessTokenRow token={nft()} delay={0} isNew={false} onSend={onSend} />);
    expect(sendButton()).toBeTruthy();
  });

  it('adopts a handler that is supplied after mount', () => {
    // The same class of defect: a comparator that ignores onSend keeps rendering
    // the row without the action even once the parent provides one.
    const { rerender } = render(<CoinlessTokenRow token={nft()} delay={0} isNew={false} />);
    expect(sendButton()).toBeNull();

    rerender(<CoinlessTokenRow token={nft()} delay={0} isNew={false} onSend={vi.fn()} />);
    expect(sendButton()).toBeTruthy();
  });
});
