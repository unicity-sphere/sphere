import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, cleanup } from '@testing-library/react';
import React, { type ReactNode } from 'react';

import type { ShowToastDetail } from '../../../src/components/ui/toast-utils';
import { SPHERE_KEYS } from '../../../src/sdk/queryKeys';

/**
 * A coinless arrival (an NFT) is announced in `coinless`, never in `tokens` —
 * it carries no coin. Read through the coin path it produced "+0 ?": a zero
 * summed from an empty token list, and '?' for the symbol no NFT has.
 */
type Handler = (payload: unknown) => void;
const handlers = new Map<string, Handler>();
const fakeSphere = {
  on: (event: string, fn: Handler) => { handlers.set(event, fn); },
  off: (event: string) => { handlers.delete(event); },
  identity: null,
};

vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: fakeSphere }),
}));

import { useSphereEvents } from '../../../src/sdk/hooks/core/useSphereEvents';

function harness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return { client, wrapper };
}

function captureToasts(fire: () => void): ShowToastDetail[] {
  const seen: ShowToastDetail[] = [];
  const handler = (e: Event) => seen.push((e as CustomEvent<ShowToastDetail>).detail);
  window.addEventListener('show-toast', handler);
  try { fire(); } finally { window.removeEventListener('show-toast', handler); }
  return seen;
}

const nft = (over: Record<string, unknown> = {}) => ({
  tokenId: 'aa'.repeat(32),
  tokenType: 'bb'.repeat(32),
  stateHash: 's',
  transferring: false,
  createdAt: 1,
  updatedAt: 1,
  ...over,
});

const arrival = (over: Record<string, unknown> = {}) => ({
  id: 'tr-1',
  senderPubkey: '02' + 'cc'.repeat(32),
  senderNametag: 'api-4',
  tokens: [],
  receivedAt: 1,
  ...over,
});

beforeEach(() => { handlers.clear(); });
afterEach(cleanup);

describe('incoming coinless arrival — the toast', () => {
  it('names what arrived instead of rendering "+0 ?"', () => {
    const { wrapper } = harness();
    renderHook(() => useSphereEvents(), { wrapper });

    const toasts = captureToasts(() => {
      act(() => {
        handlers.get('transfer:incoming')?.(
          arrival({ coinless: [nft({ name: 'Cool Cat' })] }),
        );
      });
    });

    expect(toasts).toHaveLength(1);
    const t = toasts[0]!;
    expect(t.transfer?.coinless).toBe(true);
    expect(t.transfer?.label).toBe('Cool Cat');
    expect(t.message).toBe('@api-4 sent you Cool Cat');
    // The exact regression: a zero amount and a '?' symbol must not reach the UI.
    expect(t.message).not.toContain('+0');
    expect(t.message).not.toContain('?');
  });

  it('falls back to a generic label when the token type is unrecognised', () => {
    const { wrapper } = harness();
    renderHook(() => useSphereEvents(), { wrapper });

    const toasts = captureToasts(() => {
      act(() => {
        handlers.get('transfer:incoming')?.(arrival({ coinless: [nft()] }));
      });
    });

    // An unknown type is legitimate — it must still announce as an NFT.
    expect(toasts[0]?.transfer?.label).toBe('an NFT');
    expect(toasts[0]?.transfer?.coinless).toBe(true);
  });

  it('counts several NFTs from one sender into a single toast', () => {
    const { wrapper } = harness();
    renderHook(() => useSphereEvents(), { wrapper });

    const toasts = captureToasts(() => {
      act(() => {
        handlers.get('transfer:incoming')?.(arrival({ id: 'a', coinless: [nft({ name: 'One' })] }));
        handlers.get('transfer:incoming')?.(
          arrival({ id: 'b', coinless: [nft({ tokenId: 'dd'.repeat(32), name: 'Two' })] }),
        );
      });
    });

    // Names differ, so a count is the only honest summary.
    expect(toasts[toasts.length - 1]?.transfer?.label).toBe('2 NFTs');
    // One coalesced toast, not two stacked.
    expect(new Set(toasts.map((t) => t.groupId)).size).toBe(1);
  });

  it('publishes NO balance progress — an NFT moves no money', () => {
    const { client, wrapper } = harness();
    renderHook(() => useSphereEvents(), { wrapper });

    act(() => {
      handlers.get('transfer:incoming')?.(arrival({ coinless: [nft({ name: 'Cool Cat' })] }));
    });

    // The progress line is a running COIN total; showing one for an NFT would
    // promise the balance is about to move when it never will.
    expect(client.getQueryData(SPHERE_KEYS.incoming.progress)).toBeUndefined();
  });

  it('leaves an ordinary coin arrival on the amount path', () => {
    const { wrapper } = harness();
    renderHook(() => useSphereEvents(), { wrapper });

    const toasts = captureToasts(() => {
      act(() => {
        handlers.get('transfer:incoming')?.(
          arrival({
            tokens: [{ id: 't', coinId: 'ee'.repeat(32), symbol: 'UCT', decimals: 0, amount: '1200' }],
          }),
        );
      });
    });

    expect(toasts[0]?.transfer?.coinless).toBeUndefined();
    expect(toasts[0]?.message).toBe('@api-4 sent you 1200 UCT');
  });
});
