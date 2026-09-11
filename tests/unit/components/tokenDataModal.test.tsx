import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';

const tokenDataMock = vi.fn();
vi.mock('../../../src/sdk/payments', () => ({
  getPayments: () => ({ tokenData: tokenDataMock }),
}));
vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: {} }),
}));

import { TokenDataModal, type TokenDataTarget } from '../../../src/components/wallet/L3/modals/TokenDataModal';

const NFT: TokenDataTarget = { tokenId: 'aa'.repeat(32), label: 'Cool Cat', tokenType: 'bb'.repeat(32) };
const COIN: TokenDataTarget = { tokenId: 'cc'.repeat(32), label: 'UCT' };

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

beforeEach(() => { tokenDataMock.mockReset(); });

describe('TokenDataModal', () => {
  it('renders the genesis payload as hex, with its byte length', async () => {
    // 0x63 'gm!' — a 4-byte CBOR text string.
    tokenDataMock.mockResolvedValue(new Uint8Array([0x63, 0x67, 0x6d, 0x21]));
    render(<TokenDataModal target={NFT} onClose={vi.fn()} />, { wrapper });

    await waitFor(() => expect(screen.getByText('63676d21')).toBeTruthy());
    expect(screen.getByText(/4 bytes, CBOR/)).toBeTruthy();
  });

  it('shows the token type for a coinless token and omits it for a coin token', async () => {
    tokenDataMock.mockResolvedValue(new Uint8Array([0x63]));
    const { rerender } = render(<TokenDataModal target={NFT} onClose={vi.fn()} />, { wrapper });
    await waitFor(() => expect(screen.getByText('Token type (class)')).toBeTruthy());

    rerender(<TokenDataModal target={COIN} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText('Token type (class)')).toBeNull());
    // A coin token's payload IS the value envelope — say so, since that is what
    // makes the hex meaningful in a CBOR decoder.
    expect(screen.getByText(/value envelope/)).toBeTruthy();
  });

  it('says so plainly when a token carries no genesis data', async () => {
    tokenDataMock.mockResolvedValue(null);
    render(<TokenDataModal target={NFT} onClose={vi.fn()} />, { wrapper });

    await waitFor(() => expect(screen.getByText(/carries no genesis data/)).toBeTruthy());
  });

  it('surfaces a read failure rather than showing an empty payload', async () => {
    // readTokenData THROWS for a token not in inventory or with no blob —
    // rendering that as "no data" would be a lie about what the token holds.
    tokenDataMock.mockRejectedValue(new Error('Token is not in inventory'));
    render(<TokenDataModal target={NFT} onClose={vi.fn()} />, { wrapper });

    await waitFor(() => expect(screen.getByText(/not in inventory/)).toBeTruthy());
    expect(screen.queryByText(/carries no genesis data/)).toBeNull();
  });

  it('fetches nothing until a token is actually selected', () => {
    render(<TokenDataModal target={null} onClose={vi.fn()} />, { wrapper });
    // The blob is a round trip per token; opening the tab must not prefetch them.
    expect(tokenDataMock).not.toHaveBeenCalled();
  });
});
