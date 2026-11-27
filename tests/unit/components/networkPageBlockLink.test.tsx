import { beforeAll, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { NetworkPage } from '@/pages/NetworkPage';
import { RoundStore } from '@/modules/network-status/roundStore';
import { parseBlockDetail, type GatewayClient } from '@/modules/network-status/gatewayClient';
import emptyFixture from '../modules/network-status/fixtures/inspect_empty_block_testnet2.json';

const calls: string[] = [];

// The canvas and the uPlot charts need browser APIs jsdom lacks; this suite is about the URL.
vi.mock('@/components/network/BeatCanvas', () => ({ BeatCanvas: () => null }));
vi.mock('@/components/network/SessionCharts', () => ({ SessionCharts: () => null }));

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
});

vi.mock('@/modules/network-status/useNetworkStatus', () => ({
  useNetworkStatus: () => {
    const store = new RoundStore({ now: () => 0 });
    return { store, snapshot: store.getSnapshot(), source: 'polling' };
  },
}));

vi.mock('@/modules/network-status/gatewayClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/network-status/gatewayClient')>();
  return {
    ...actual,
    createGatewayClient: (baseUrl: string): GatewayClient => ({
      baseUrl,
      getShards: async () => [],
      getBlock: async () => null,
      getNetworkStatus: async () => null,
      getBlockDetail: async (shardId, index) => {
        calls.push(`block:${baseUrl}:${shardId}:${index}`);
        return actual.parseBlockDetail(emptyFixture.result, shardId);
      },
      getBlockRecords: async () => [],
      getInclusionProof: async () => '',
    }),
  };
});

vi.mock('@/modules/network-status/verify/trustBase', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/network-status/verify/trustBase')>();
  const json = (await import('../modules/network-status/fixtures/trustbase_testnet2.json')).default;
  const context = actual.verifyContextFromJson(json);
  return { ...actual, loadTrustBase: async () => context };
});

function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.search}</output>;
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/network"
          element={
            <>
              <NetworkPage />
              <Location />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NetworkPage block links', () => {
  it('opens the block a link names, on the link’s network', async () => {
    calls.length = 0;
    renderAt('/network?network=testnet2&shard=000&block=8464890');
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(await screen.findByRole('heading', { name: /Shard 0 · Block #8,464,890/ })).toBeTruthy();
    expect(calls).toEqual([expect.stringMatching(/testnet2\.unicity\.network.*:000:8464890$/)]);
    void parseBlockDetail;
  });

  it('explains a link for a network it does not offer and fetches nothing', async () => {
    calls.length = 0;
    renderAt('/network?network=devnet&shard=00&block=5');
    expect(await screen.findByText(/This link is for devnet, which this deployment doesn't offer/)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it('closing removes the block from the URL and keeps the network', async () => {
    renderAt('/network?network=testnet2&shard=000&block=8464890');
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('location').textContent).toBe('?network=testnet2');
  });

  it('a page without a block link shows no inspector', () => {
    renderAt('/network');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
