/**
 * Graceful lock §8.4: a lock must reach EVERY live ConnectHost, must use the
 * session-PRESERVING verb (setLocked, never revokeSession), must call it BEFORE
 * sphere.destroy() (the ordering contract), must still broadcast cross-tab from
 * a manual lock (PR #456 prerequisite — guarded here so it cannot regress), must
 * clear the react-query cache so balances/history/DMs are not readable behind
 * the lock screen, and must be exactly-once under the same-tab BroadcastChannel
 * loopback.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ConnectHost } from '@unicitylabs/sphere-sdk/connect';
import type { SphereContextValue } from '../../../../src/sdk/SphereContext';

const PUBKEY = '02' + 'ab'.repeat(32);

// Shared ordering probe: setLocked() must land before destroy().
const probe = vi.hoisted(() => ({ order: [] as string[] }));

function makeFakeSphere() {
  return {
    identity: { chainPubkey: PUBKEY },
    on: vi.fn(() => () => {}),
    destroy: vi.fn(async () => { probe.order.push('destroy'); }),
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
      groupChat: true,
      market: true,
    })),
  };
});

import { TokenRegistry } from '@unicitylabs/sphere-sdk';
import { SphereProvider } from '../../../../src/sdk/SphereProvider';
import { useSphereContext } from '../../../../src/sdk/hooks/core/useSphere';
import { registerConnectHost, clearConnectHosts } from '../../../../src/sdk/connectHostRegistry';
import { subscribeLockBroadcast } from '../../../../src/sdk/walletLock/lockBroadcast';

let queryClient: QueryClient;
function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

let ctx: SphereContextValue | null = null;
function Probe() {
  ctx = useSphereContext();
  return (
    <div>
      <div data-testid="loading">{String(ctx.isLoading)}</div>
      <div data-testid="sphere">{ctx.sphere ? 'present' : 'null'}</div>
      <div data-testid="locked">{String(ctx.isLocked)}</div>
    </div>
  );
}

function makeFakeHost(label: string) {
  return {
    setLocked: vi.fn(() => { probe.order.push(`setLocked:${label}`); }),
    setUnavailable: vi.fn(),
    revokeSession: vi.fn(),
    updateSphere: vi.fn(),
    getSession: vi.fn(() => null),
    getState: vi.fn(() => ({ walletState: 'live', session: null })),
    destroy: vi.fn(),
  };
}

function attach(host: ReturnType<typeof makeFakeHost>, origin: string) {
  registerConnectHost(host as unknown as ConnectHost, { origin });
}

beforeEach(() => {
  ctx = null;
  probe.order.length = 0;
  clearConnectHosts();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network disabled in test'); }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearConnectHosts();
  TokenRegistry.resetInstance();
});

describe('SphereProvider.lock() fan-out (graceful lock §8.4)', () => {
  it('locks EVERY registered host with setLocked(), never revoking their sessions', async () => {
    render(<Wrapper><SphereProvider network="testnet2"><Probe /></SphereProvider></Wrapper>);
    await waitFor(() => expect(screen.getByTestId('sphere').textContent).toBe('present'));

    const hostA = makeFakeHost('A');
    const hostB = makeFakeHost('B');
    attach(hostA, 'https://a.example');
    attach(hostB, 'https://b.example');

    await act(async () => { await ctx!.lock(); });

    expect(hostA.setLocked).toHaveBeenCalledTimes(1);
    expect(hostB.setLocked).toHaveBeenCalledTimes(1);
    // A lock is a STATE, not a teardown: the dApp keeps its session.
    expect(hostA.revokeSession).not.toHaveBeenCalled();
    expect(hostB.revokeSession).not.toHaveBeenCalled();
    expect(screen.getByTestId('locked').textContent).toBe('true');
    expect(screen.getByTestId('sphere').textContent).toBe('null');
  });

  it('tells every host BEFORE destroying the Sphere (ordering contract)', async () => {
    render(<Wrapper><SphereProvider network="testnet2"><Probe /></SphereProvider></Wrapper>);
    await waitFor(() => expect(screen.getByTestId('sphere').textContent).toBe('present'));

    const hostA = makeFakeHost('A');
    const hostB = makeFakeHost('B');
    attach(hostA, 'https://a.example');
    attach(hostB, 'https://b.example');
    probe.order.length = 0;

    await act(async () => { await ctx!.lock(); });

    // destroy() LAST: setLocked() drops the host's Sphere reference and settles
    // in-flight requests with 4009. Destroying first leaves them reading a dead
    // instance (-32603, or `undefined` returned AS SUCCESS from getIdentity).
    expect(probe.order).toEqual(['setLocked:A', 'setLocked:B', 'destroy']);
  });

  it('is exactly-once: a second lock() (same-tab broadcast loopback) is a no-op', async () => {
    render(<Wrapper><SphereProvider network="testnet2"><Probe /></SphereProvider></Wrapper>);
    await waitFor(() => expect(screen.getByTestId('sphere').textContent).toBe('present'));

    const host = makeFakeHost('A');
    attach(host, 'https://a.example');
    // lock() no longer uses clear(): that also wiped the UI-state caches React Query doubles
    // as (open desktop tabs, walletOpen), leaving the Wallet button dead after an auto-lock.
    // It removes every NON-UI query instead — see src/config/uiQueryKeys.ts.
    const clearSpy = vi.spyOn(queryClient, 'removeQueries');

    await act(async () => { await ctx!.lock(); await ctx!.lock(); });

    expect(host.setLocked).toHaveBeenCalledTimes(1);
    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  it('clears the react-query cache so balances/history/DMs are not readable behind the lock screen', async () => {
    render(<Wrapper><SphereProvider network="testnet2"><Probe /></SphereProvider></Wrapper>);
    await waitFor(() => expect(screen.getByTestId('sphere').textContent).toBe('present'));

    queryClient.setQueryData(['balance'], { total: '1000' });
    expect(queryClient.getQueryData(['balance'])).toBeDefined();

    await act(async () => { await ctx!.lock(); });

    expect(queryClient.getQueryData(['balance'])).toBeUndefined();
  });

  it('PRESERVES the UI-state caches, so the lock does not kill the Wallet button', async () => {
    render(<Wrapper><SphereProvider network="testnet2"><Probe /></SphereProvider></Wrapper>);
    await waitFor(() => expect(screen.getByTestId('sphere').textContent).toBe('present'));

    // React Query doubles as this app's UI store. DesktopLayout consumes no Sphere hook, so a
    // lock never re-renders it: removing these left its observer bound to a discarded Query and
    // the next setWalletOpen(true) wrote to an instance nobody reads — the Wallet button,
    // fullscreen and Escape all dead until a reload, and with them the "Unlock Wallet" button
    // the locked screens offer.
    queryClient.setQueryData(['desktop', 'state'], { walletOpen: true, tabs: ['dm'] });
    queryClient.setQueryData(['ui', 'state'], { theme: 'dark' });
    queryClient.setQueryData(['desktop-order'], ['dm', 'group-chat']);
    queryClient.setQueryData(['installed-projects'], ['a']);
    queryClient.setQueryData(['balance'], { total: '1000' });

    await act(async () => { await ctx!.lock(); });

    expect(queryClient.getQueryData(['desktop', 'state'])).toEqual({ walletOpen: true, tabs: ['dm'] });
    expect(queryClient.getQueryData(['ui', 'state'])).toEqual({ theme: 'dark' });
    expect(queryClient.getQueryData(['desktop-order'])).toEqual(['dm', 'group-chat']);
    expect(queryClient.getQueryData(['installed-projects'])).toEqual(['a']);
    // …while wallet data still goes.
    expect(queryClient.getQueryData(['balance'])).toBeUndefined();
  });

  it('still broadcasts from a MANUAL lock (PR #456 prerequisite, guarded)', async () => {
    render(<Wrapper><SphereProvider network="testnet2"><Probe /></SphereProvider></Wrapper>);
    await waitFor(() => expect(screen.getByTestId('sphere').textContent).toBe('present'));

    const onLock = vi.fn();
    const unsubscribe = subscribeLockBroadcast(undefined, onLock);
    try {
      await act(async () => {
        await ctx!.lock();
        // BroadcastChannel delivery is real-async across instances.
        await new Promise<void>((resolve) => setTimeout(resolve, 50));
      });
      expect(onLock).toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });

  it('locks a tab whose Sphere is momentarily null — a re-init must not swallow a cross-tab lock', async () => {
    render(<Wrapper><SphereProvider network="testnet2"><Probe /></SphereProvider></Wrapper>);
    await waitFor(() => expect(screen.getByTestId('sphere').textContent).toBe('present'));

    const host = makeFakeHost('A');
    attach(host, 'https://a.example');

    // toggleIpfs()/reinitialize() leave sphereRef null while the new instance comes up. A lock
    // arriving in that window used to return immediately: the tab stayed unlocked, its hosts
    // kept reporting 'live', no epoch was written, and the in-flight init went on to adopt a
    // fully usable Sphere. Modelled by locking twice — the first empties sphereRef, the second
    // stands in for the cross-tab lock that lands during the re-init.
    await act(async () => { await ctx!.lock(); });
    expect(screen.getByTestId('locked').textContent).toBe('true');

    // A second lock while already locked is still a no-op — the guard narrowed, it did not go.
    host.setLocked.mockClear();
    await act(async () => { await ctx!.lock(); });
    expect(host.setLocked).not.toHaveBeenCalled();
  });
});
