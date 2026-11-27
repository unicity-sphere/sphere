import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import liveBlock from '../modules/network-status/fixtures/get_block_testnet2.json';
import notFound from '../modules/network-status/fixtures/get_block_not_found.json';

vi.mock('uplot', () => {
  class FakeUPlot {
    static paths = { bars: () => () => null };
    over = document.createElement('div');
    setData() {}
    setSize() {}
    destroy() {}
  }
  return { default: FakeUPlot };
});

import { NetworkPage } from '../../../src/pages/NetworkPage';

/** A two-shard gateway that serves blocks but not /network/status (as every gateway does today). */
function gatewayFetch() {
  const calls: string[] = [];
  const impl = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    if (url.includes('/network/status')) {
      calls.push('status');
      return new Response('Not Found', { status: 404 });
    }
    if (url.endsWith('/config/shards')) {
      calls.push('shards');
      return Response.json({ version: 1, mode: 'bft-shard', bftShardPrefixes: ['00', '01'] });
    }
    const body = JSON.parse(String(init.body)) as { params: { blockNumber: string; shardId: string } };
    calls.push(`get_block ${body.params.shardId} ${body.params.blockNumber}`);
    return Response.json(body.params.blockNumber === 'latest' ? liveBlock : notFound);
  });
  return { impl, calls };
}

describe('NetworkPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        private readonly cb: ResizeObserverCallback;
        constructor(cb: ResizeObserverCallback) {
          this.cb = cb;
        }
        observe() {
          this.cb([{ contentRect: { width: 1000 } } as ResizeObserverEntry], this as unknown as ResizeObserver);
        }
        disconnect() {}
      },
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('falls back to polling the gateway, and shows the network live with every shard and root', async () => {
    const gateway = gatewayFetch();
    vi.stubGlobal('fetch', gateway.impl);

    render(
      <MemoryRouter initialEntries={['/network']}>
        <NetworkPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(document.querySelector('h1')?.textContent).toBe('Network status: Live'));
    expect(gateway.calls[0]).toBe('status');
    expect(gateway.calls).toContain('get_block 00 latest');
    expect(gateway.calls).toContain('get_block 01 latest');
    expect(screen.getByText(/every shard, every second/)).toBeTruthy();

    const shards = screen.getByRole('heading', { name: 'Shards' }).parentElement!;
    await waitFor(() => expect(within(shards).getAllByText('Healthy')).toHaveLength(2));
    // The fixture's seal names 4 roots, all of which signed.
    expect(screen.getByRole('img', { name: /4 of 4 roots signed root round 24790909/ })).toBeTruthy();
  });

  it('says it cannot read the gateway, and keeps retrying, when the gateway is down', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    render(
      <MemoryRouter initialEntries={['/network']}>
        <NetworkPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Can’t read gateway\..* \(unreachable\)\. Retrying/)).toBeTruthy();
    expect(document.querySelector('h1')?.textContent).toBe('Network status: Connecting');
  });
});
