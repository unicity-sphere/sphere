import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import type { NftView } from '@unicitylabs/sphere-sdk';

/**
 * The rename of an incoming NFT toast (#785) lands late: after a blob read, and
 * usually only on a later inventory:updated, because the drain announces a token
 * before the view nfts() reads has caught up. By then the user may have closed
 * the toast, and the rename must not bring it back. The real hook drives the
 * real toast container here.
 */
vi.mock('framer-motion', async () => (await import('../../support/framerMotionStub')).framerMotionStub());

type Handler = (payload: unknown) => void;
const handlers = new Map<string, Handler>();
const nftsMock = vi.fn<(tokenIds: readonly string[]) => Promise<ReadonlyMap<string, NftView>>>();
const fakeSphere = {
  on: (event: string, fn: Handler) => { handlers.set(event, fn); },
  off: (event: string) => { handlers.delete(event); },
  identity: null,
  payments: { nfts: nftsMock },
};

vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: fakeSphere }),
}));

import { useSphereEvents } from '../../../src/sdk/hooks/core/useSphereEvents';
import { ToastContainer } from '../../../src/components/ui/Toast';

const TOKEN_ID = 'aa'.repeat(32);

const arrival = {
  id: 'tr-1',
  senderPubkey: '02' + 'cc'.repeat(32),
  senderNametag: 'api-4',
  tokens: [],
  receivedAt: 1,
  coinless: [
    {
      tokenId: TOKEN_ID,
      tokenType: 'bb'.repeat(32),
      name: 'Cats',
      stateHash: 's',
      transferring: false,
      createdAt: 1,
      updatedAt: 1,
    },
  ],
};

const reading: NftView = {
  tokenId: TOKEN_ID,
  content: {
    kind: 'metadata',
    name: 'Cool Cat #7',
    description: null,
    image: null,
    animation_url: null,
    external_url: null,
    attributes: [],
    collection: null,
  },
  creator: null,
  signature: 'unsigned',
};

function Events() {
  useSphereEvents();
  return null;
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Events />
      <ToastContainer />
    </QueryClientProvider>,
  );
}

function fire(event: string, payload: unknown) {
  act(() => {
    handlers.get(event)?.(payload);
  });
}

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** The toast as announced, its first name read still empty — the usual order. */
async function announce() {
  mount();
  fire('transfer:incoming', arrival);
  expect(screen.getByText('Cats')).toBeTruthy();
  await waitFor(() => expect(nftsMock).toHaveBeenCalledTimes(1));
  await flush();
}

beforeEach(() => {
  handlers.clear();
  nftsMock.mockReset();
  nftsMock.mockResolvedValueOnce(new Map()).mockResolvedValue(new Map([[TOKEN_ID, reading]]));
});

afterEach(() => {
  cleanup();
});

describe('incoming NFT toast — a late rename (#785)', () => {
  it('renames the toast while it is still up', async () => {
    await announce();

    fire('inventory:updated', {});

    await waitFor(() => expect(screen.getByText('Cool Cat #7')).toBeTruthy());
    expect(screen.getAllByTestId('toast')).toHaveLength(1);
    expect(screen.queryByText('Cats')).toBeNull();
  });

  it('does not bring back a toast the user closed before the name was read', async () => {
    await announce();

    act(() => {
      within(screen.getByTestId('toast')).getByRole('button').click();
    });
    expect(screen.queryByTestId('toast')).toBeNull();

    fire('inventory:updated', {});
    await waitFor(() => expect(nftsMock).toHaveBeenCalledTimes(2));
    await flush();

    expect(screen.queryByTestId('toast')).toBeNull();
    expect(screen.queryByText('Cool Cat #7')).toBeNull();
  });
});
