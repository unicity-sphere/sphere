import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const transferMock = vi.fn();
vi.mock('../../../src/sdk/hooks', () => ({
  useTransfer: () => ({ transfer: transferMock }),
}));

import { SendWholeTokenModal, type WholeTokenTarget } from '../../../src/components/wallet/L3/modals/SendWholeTokenModal';

const NFT: WholeTokenTarget = { tokenId: 'tok-nft', label: 'Cool Cat', coinless: true };
const COIN: WholeTokenTarget = { tokenId: 'tok-coin', label: 'UCT', coinless: false };

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

const DELIVERED = { id: 't', status: 'delivered', tokens: [], tokenTransfers: [] };

beforeEach(() => {
  transferMock.mockReset().mockResolvedValue(DELIVERED);
});

describe('SendWholeTokenModal', () => {
  it('sends the NAMED token whole, with no amount input to get wrong', () => {
    render(<SendWholeTokenModal target={NFT} onClose={vi.fn()} />);
    // A whole spend never splits, so an amount field would be a lie.
    expect(screen.queryByLabelText(/amount/i)).toBeNull();
    expect(screen.getByText(/Cool Cat/)).toBeTruthy();
  });

  it('routes a coinless target to the coinless-scoped verb, and a coin target to the general one', async () => {
    const { rerender } = render(<SendWholeTokenModal target={NFT} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Recipient'), { target: { value: '@bob' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(transferMock).toHaveBeenCalled());
    expect(transferMock.mock.calls[0][0]).toMatchObject({
      kind: 'whole', tokenId: 'tok-nft', recipient: '@bob', coinless: true,
    });

    transferMock.mockClear();
    rerender(<SendWholeTokenModal target={COIN} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Recipient'), { target: { value: '@bob' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(transferMock).toHaveBeenCalled());
    expect(transferMock.mock.calls[0][0]).toMatchObject({ tokenId: 'tok-coin', coinless: false });
  });

  it('refuses to close while a send is in flight — the spend may already be on-chain', async () => {
    const d = deferred<typeof DELIVERED>();
    transferMock.mockReturnValue(d.promise);
    const onClose = vi.fn();
    render(<SendWholeTokenModal target={NFT} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText('Recipient'), { target: { value: '@bob' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(screen.getByText('Sending…')).toBeTruthy());

    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).not.toHaveBeenCalled();

    d.resolve(DELIVERED);
    await waitFor(() => expect(screen.getByText('Sent')).toBeTruthy());
  });

  it('never attributes a late completion to a different token', async () => {
    // Close is blocked mid-send, but the PARENT can still swap `target`. A send
    // that resolves after that must not paint its success over the new token.
    const d = deferred<typeof DELIVERED>();
    transferMock.mockReturnValue(d.promise);
    const { rerender } = render(<SendWholeTokenModal target={NFT} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Recipient'), { target: { value: '@bob' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(screen.getByText('Sending…')).toBeTruthy());

    rerender(<SendWholeTokenModal target={null} onClose={vi.fn()} />);
    rerender(<SendWholeTokenModal target={COIN} onClose={vi.fn()} />);
    d.resolve(DELIVERED);

    // The NFT's success must not claim the coin token sent.
    await waitFor(() => expect(screen.getByText(/UCT/)).toBeTruthy());
    expect(screen.queryByText(/is on its way/)).toBeNull();
  });

  it('presents a keep-open outcome as pending, and tells the user NOT to re-send', async () => {
    // The money-safety copy: re-issuing a possibly-committed send double-pays.
    transferMock.mockResolvedValue({ id: 'keep', status: 'pending', tokens: [], tokenTransfers: [], deliveryPending: true });
    render(<SendWholeTokenModal target={NFT} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Recipient'), { target: { value: '@bob' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(screen.getByText(/Do not send it again/)).toBeTruthy());
  });

  it('surfaces a send failure and returns to the form rather than claiming success', async () => {
    transferMock.mockRejectedValue(new Error('recipient has no published key'));
    render(<SendWholeTokenModal target={NFT} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Recipient'), { target: { value: '@nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(screen.getByText(/no published key/)).toBeTruthy());
    expect(screen.queryByText('Sent')).toBeNull();
  });
});
