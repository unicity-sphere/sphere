/**
 * Graceful lock §8.5: initialize() doubles as `reinitialize`. Omitting the
 * session password there relocks an encrypted wallet the user just unlocked.
 *
 * The other side of the invariant is guarded by plaintextWalletLoads.test.tsx
 * and lockedWalletColdStart.test.tsx: with NO session password the cold load
 * path must still pass none.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SphereContextValue } from '../../../../src/sdk/SphereContext';

const PUBKEY = '02' + 'ab'.repeat(32);
const initSpy = vi.hoisted(() => ({ calls: [] as Record<string, unknown>[] }));

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
      init: vi.fn(async (opts: Record<string, unknown>) => {
        initSpy.calls.push(opts);
        if (!opts.password) {
          throw new actual.SphereError('Failed to decrypt mnemonic', 'STORAGE_ERROR');
        }
        return { sphere: makeFakeSphere() };
      }),
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
  initSpy.calls.length = 0;
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

describe('re-init keeps an unlocked encrypted wallet unlocked (graceful lock §8.5)', () => {
  it('reinitialize() does not relock', async () => {
    render(<Wrapper><SphereProvider network="testnet2"><Probe /></SphereProvider></Wrapper>);
    await waitFor(() => expect(screen.getByTestId('locked').textContent).toBe('true'));

    await act(async () => { await ctx!.unlock('correct horse battery staple'); });
    expect(screen.getByTestId('locked').textContent).toBe('false');

    await act(async () => { await ctx!.reinitialize(); });

    await waitFor(() => expect(screen.getByTestId('sphere').textContent).toBe('present'));
    expect(screen.getByTestId('locked').textContent).toBe('false');

    // The re-init carried the session password.
    const last = initSpy.calls[initSpy.calls.length - 1];
    expect(last).toBeDefined();
    expect(last!.password).toBe('correct horse battery staple');
  });

  it('the COLD load still passes no password (plaintext wallets must be untouched)', async () => {
    render(<Wrapper><SphereProvider network="testnet2"><Probe /></SphereProvider></Wrapper>);
    await waitFor(() => expect(screen.getByTestId('locked').textContent).toBe('true'));

    expect(initSpy.calls.length).toBe(1);
    expect(initSpy.calls[0]).toBeDefined();
    expect(initSpy.calls[0]!.password).toBeUndefined();
  });
});
