import { beforeAll, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { NetworkPage } from '@/pages/NetworkPage';
import { RoundStore } from '@/modules/network-status/roundStore';

vi.mock('@/components/network/BeatCanvas', () => ({ BeatCanvas: () => null }));
vi.mock('@/components/network/SessionCharts', () => ({ SessionCharts: () => null }));
vi.mock('@/modules/network-status/useNetworkStatus', () => ({
  useNetworkStatus: () => {
    const store = new RoundStore({ now: () => 0 });
    return { store, snapshot: store.getSnapshot(), source: 'polling' };
  },
}));
vi.mock('@/components/network/block/BlockModal', () => ({
  default: () => {
    throw new Error('inspector exploded');
  },
}));

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

function Location() {
  return <output data-testid="location">{useLocation().search}</output>;
}

describe('NetworkPage inspector boundary', () => {
  it('a crash inside the inspector costs only the inspector, and it can still be closed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <MemoryRouter initialEntries={['/network?network=testnet2&shard=000&block=1']}>
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
    expect(await screen.findByText(/This block could not be shown/)).toBeTruthy();
    expect(screen.getByText('Certified rounds')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByTestId('location').textContent).toBe('?network=testnet2');
  });
});
