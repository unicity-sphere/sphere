/**
 * Graceful lock §8.4: a tab that resumes (pageshow / visibilitychange) while a
 * lock is on record must lock itself. Without this, a bfcache restore returns a
 * fully decrypted Sphere — and now a live Connect session with it — long after
 * another tab locked the wallet.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SphereContextValue } from '../../../../src/sdk/SphereContext';

const PUBKEY = '02' + 'ab'.repeat(32);

function makeFakeSphere() {
  return {
    identity: { chainPubkey: PUBKEY },
    on: vi.fn(() => () => {}),
    destroy: vi.fn(async () => {}),
    discoverAddresses: vi.fn(async () => ({ addresses: [] })),
  };
}

vi.mock('@unicitylabs/sphere-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@unicitylabs/sphere-sdk')>();
  return {
    ...actual,
    Sphere: {
      ...actual.Sphere,
      exists: vi.fn(async () => true),
      init: vi.fn(async () => ({ sphere: makeFakeSphere() })),
    },
  };
});

vi.mock('@unicitylabs/sphere-sdk/impl/browser', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@unicitylabs/sphere-sdk/impl/browser')>();
  return {
    ...actual,
    createBrowserProviders: vi.fn(() => ({
      storage: { get: vi.fn(async () => null), set: vi.fn(async () => {}), disconnect: vi.fn(async () => {}) },
      transport: {
        isConnected: () => false,
        connect: vi.fn(async () => {}),
        disconnect: vi.fn(async () => {}),
        setIdentity: vi.fn(async () => {}),
      },
      oracle: {},
      tokenStorage: { disconnect: vi.fn(async () => {}) },
      ipfsTokenStorage: undefined,
      groupChat: true,
      market: true,
    })),
  };
});

import { TokenRegistry } from '@unicitylabs/sphere-sdk';
import { SphereProvider } from '../../../../src/sdk/SphereProvider';
import { useSphereContext } from '../../../../src/sdk/hooks/core/useSphere';
import { markLockEpoch, readLockEpoch } from '../../../../src/sdk/walletLock/lockEpoch';
import { clearConnectHosts } from '../../../../src/sdk/connectHostRegistry';

let queryClient: QueryClient;
function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

let ctx: SphereContextValue | null = null;
function Probe() {
  ctx = useSphereContext();
  return (
    <div>
      <div data-testid="sphere">{ctx.sphere ? 'present' : 'null'}</div>
      <div data-testid="locked">{String(ctx.isLocked)}</div>
    </div>
  );
}

beforeEach(() => {
  ctx = null;
  localStorage.clear();
  clearConnectHosts();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network disabled in test'); }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearConnectHosts();
  TokenRegistry.resetInstance();
});

describe('lock epoch relock (graceful lock §8.4)', () => {
  it('locks a resuming tab when another tab locked while it was away', async () => {
    render(<Wrapper><SphereProvider><Probe /></SphereProvider></Wrapper>);
    await waitFor(() => expect(screen.getByTestId('sphere').textContent).toBe('present'));

    // Another tab locked one hour into the future relative to this tab's session
    // start — unambiguously newer.
    markLockEpoch(Date.now() + 60 * 60 * 1000);

    await act(async () => {
      window.dispatchEvent(new Event('pageshow'));
    });

    await waitFor(() => expect(screen.getByTestId('locked').textContent).toBe('true'));
    expect(screen.getByTestId('sphere').textContent).toBe('null');
  });

  it('leaves a resuming tab alone when no lock is on record', async () => {
    render(<Wrapper><SphereProvider><Probe /></SphereProvider></Wrapper>);
    await waitFor(() => expect(screen.getByTestId('sphere').textContent).toBe('present'));

    await act(async () => {
      window.dispatchEvent(new Event('pageshow'));
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(screen.getByTestId('locked').textContent).toBe('false');
    expect(screen.getByTestId('sphere').textContent).toBe('present');
  });

  it('records the epoch on lock and has none while the wallet is live', async () => {
    render(<Wrapper><SphereProvider><Probe /></SphereProvider></Wrapper>);
    await waitFor(() => expect(screen.getByTestId('sphere').textContent).toBe('present'));
    // A fresh, live session must not leave a stale marker behind.
    expect(readLockEpoch()).toBeNull();

    await act(async () => { await ctx!.lock(); });

    expect(readLockEpoch()).not.toBeNull();
  });
});
