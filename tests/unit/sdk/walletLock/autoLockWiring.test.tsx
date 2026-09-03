/**
 * #449 Task 8a integration coverage: the idle-auto-lock WIRING inside
 * SphereProvider (as opposed to the unit-level useIdleTimer/lockBroadcast
 * tests, which don't touch the provider at all).
 *
 * Covers the two load-bearing behaviors:
 *  - A wallet unlocked WITH a password arms the idle timer (idleLockConfig
 *    goes enabled), and an idle timeout actually locks the wallet AND
 *    tells every registered ConnectHost setLocked() (session-preserving).
 *  - A wallet that never had a password (this session) — the plaintext
 *    regression, from the OTHER side of the invariant — never arms the idle
 *    timer, no matter how long the user is "idle" for.
 *
 * See also plaintextWalletLoads.test.tsx (init-path plaintext regression)
 * and useIdleTimer.test.tsx / lockBroadcast.test.ts (unit-level timer/
 * broadcast mechanics).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ConnectHost } from '@unicitylabs/sphere-sdk/connect';
import type { SphereContextValue } from '../../../../src/sdk/SphereContext';

const PUBKEY = '02' + 'ab'.repeat(32);

const initSpy = vi.hoisted(() => ({ calls: [] as Record<string, unknown>[] }));
// Toggles the mocked Sphere.init behavior between the two wallet shapes this
// file exercises: an existing wallet stored WITHOUT a password (Sphere.init
// always succeeds, like plaintextWalletLoads.test.tsx) vs one stored WITH a
// password (the passwordless load throws DECRYPTION_ERROR — "locked" — and
// only a call carrying the right password succeeds, mirroring unlock()).
const mockState = vi.hoisted(() => ({ mode: 'plaintext' as 'plaintext' | 'encrypted' }));

function makeFakeSphere() {
  return {
    identity: { chainPubkey: PUBKEY },
    // SphereProvider's existing-wallet / unlock() success paths only ever
    // call these on the adopted instance — keep in sync with SphereProvider.
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
        if (mockState.mode === 'encrypted' && !opts.password) {
          // The REAL SDK signal (@unicitylabs/sphere-sdk@0.12.0, code-verified)
          // for an encrypted wallet opened without/with the wrong password —
          // see src/sdk/walletLock/isDecryptionError.ts.
          throw new actual.SphereError('Failed to decrypt mnemonic', 'STORAGE_ERROR');
        }
        return { sphere: makeFakeSphere() };
      }),
    },
  };
});

// The real browser provider bundle opens IndexedDB/Nostr/network connections
// that are irrelevant here — stub it with a minimal, inert bundle (shape:
// BrowserProviders), same as plaintextWalletLoads.test.tsx.
vi.mock('@unicitylabs/sphere-sdk/impl/browser', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@unicitylabs/sphere-sdk/impl/browser')>();
  return {
    ...actual,
    createBrowserProviders: vi.fn(() => ({
      storage: {
        get: vi.fn(async () => null),
        set: vi.fn(async () => {}),
        disconnect: vi.fn(async () => {}),
      },
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

function Wrapper({ children }: { children: ReactNode }) {
  const [qc] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

// Captures the live context so the test can call unlock()/etc. imperatively
// — this file needs to DRIVE the provider (not just observe it), which a
// display-only Probe (as in plaintextWalletLoads.test.tsx) can't do.
let ctx: SphereContextValue | null = null;
function Probe() {
  ctx = useSphereContext();
  const { isLocked, isLoading, sphere } = ctx;
  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="sphere">{sphere ? 'present' : 'null'}</div>
      <div data-testid="locked">{String(isLocked)}</div>
    </div>
  );
}

function renderProvider() {
  render(
    <Wrapper>
      <SphereProvider network="testnet2">
        <Probe />
      </SphereProvider>
    </Wrapper>,
  );
}

beforeEach(() => {
  initSpy.calls.length = 0;
  mockState.mode = 'plaintext';
  ctx = null;
  // SphereProvider calls the real TokenRegistry.configure() as part of its
  // normal init flow; with a cache miss that fetches its remote token list
  // for real. Stub fetch so this test never makes a real network call.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new Error('network disabled in test');
    }),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  clearConnectHosts();
  // TokenRegistry is a process-wide singleton that starts a background
  // refresh timer on configure() — reset it so it doesn't leak into (or slow
  // down) other test files.
  TokenRegistry.resetInstance();
});

describe('idle auto-lock wiring (#449 Task 8a)', () => {
  it('a wallet WITH a password arms auto-lock, and idle locks it + notifies the connected dApp', async () => {
    mockState.mode = 'encrypted';
    renderProvider();

    // Mount-time initialize() runs the passwordless load path first, which
    // throws DECRYPTION_ERROR for this wallet shape — real timers here, this
    // part is plain async resolution (see plaintextWalletLoads.test.tsx).
    await waitFor(() => expect(screen.getByTestId('locked').textContent).toBe('true'));
    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(screen.getByTestId('sphere').textContent).toBe('null');

    const fakeHost = { setLocked: vi.fn(), revokeSession: vi.fn() };
    registerConnectHost(fakeHost as unknown as ConnectHost, { origin: 'https://lock.test' });

    // Fake timers from here on — the idle timer's setTimeout must be armed by
    // unlock()'s setSessionPassword(password) call, and we need to fast-forward
    // past it deterministically.
    vi.useFakeTimers();
    await act(async () => {
      await ctx!.unlock('correct horse battery staple');
    });

    // Unlock succeeded: the wallet is live and no longer locked.
    expect(screen.getByTestId('locked').textContent).toBe('false');
    expect(screen.getByTestId('sphere').textContent).toBe('present');
    expect(fakeHost.setLocked).not.toHaveBeenCalled();

    // Default auto-lock timeout (no stored settings blob → DEFAULT_AUTO_LOCK_MINUTES,
    // 15 minutes — src/sdk/walletLock/lockSettings.ts) — advance just past it.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000 + 5000);
    });

    // Idle timeout fired: the provider locked itself and told the dApp.
    expect(screen.getByTestId('locked').textContent).toBe('true');
    expect(screen.getByTestId('sphere').textContent).toBe('null');
    // At least once — the same-tab BroadcastChannel loopback (see the onIdle
    // comment in SphereProvider.tsx) can legitimately drive lock() a second
    // time in this very tab; lock() is exactly-once, so
    // this test asserts the load-bearing fact (the dApp WAS told) rather than
    // an exact call count that depends on that loopback timing.
    expect(fakeHost.setLocked).toHaveBeenCalledTimes(1);
  });

  it('a wallet with NO password never arms auto-lock, even far past any timeout', async () => {
    mockState.mode = 'plaintext';
    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('sphere').textContent).toBe('present');
    expect(screen.getByTestId('locked').textContent).toBe('false');

    const fakeHost = { setLocked: vi.fn(), revokeSession: vi.fn() };
    registerConnectHost(fakeHost as unknown as ConnectHost, { origin: 'https://lock.test' });

    vi.useFakeTimers();
    // Ten times the longest configurable auto-lock option (30 min) — if the
    // no-password invariant ever regressed, this would be more than enough
    // time to observe a false lock.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 30 * 60 * 1000);
    });

    expect(screen.getByTestId('locked').textContent).toBe('false');
    expect(screen.getByTestId('sphere').textContent).toBe('present');
    expect(fakeHost.setLocked).not.toHaveBeenCalled();

    // The existing-wallet load path must still never have passed a password —
    // this is a plaintext wallet throughout (mirrors plaintextWalletLoads.test.tsx).
    expect(initSpy.calls.length).toBeGreaterThan(0);
    expect(initSpy.calls.every((c) => c.password === undefined)).toBe(true);
  });

  it('a MANUAL lock fans out to every host and crosses tabs, exactly once', async () => {
    mockState.mode = 'encrypted';
    renderProvider();

    await waitFor(() => expect(screen.getByTestId('locked').textContent).toBe('true'));

    // Two framed dApps: DesktopLayout keeps every tab mounted, so a wallet with
    // two open agent tabs really does have two live hosts. A single-slot registry
    // reached only the last one.
    const hostA = { setLocked: vi.fn(), revokeSession: vi.fn() };
    const hostB = { setLocked: vi.fn(), revokeSession: vi.fn() };
    registerConnectHost(hostA as unknown as ConnectHost, { origin: 'https://a.test' });
    registerConnectHost(hostB as unknown as ConnectHost, { origin: 'https://b.test' });

    // Watch the cross-tab channel: the Connect popup is a separate window with its
    // own SphereProvider, and before this the manual lock never reached it.
    const posted: unknown[] = [];
    const channel = new BroadcastChannel('sphere-wallet-lock');
    channel.onmessage = (e) => { posted.push((e as MessageEvent).data); };

    await act(async () => {
      await ctx!.unlock('correct horse battery staple');
    });
    expect(screen.getByTestId('sphere').textContent).toBe('present');

    await act(async () => {
      await ctx!.lock();
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(screen.getByTestId('locked').textContent).toBe('true');
    expect(screen.getByTestId('sphere').textContent).toBe('null');
    // BOTH hosts, not just the last registered one.
    expect(hostA.setLocked).toHaveBeenCalledTimes(1);
    expect(hostB.setLocked).toHaveBeenCalledTimes(1);
    // And the manual path broadcast, which it never used to do.
    expect(posted.length).toBeGreaterThan(0);

    // Exactly-once: the same-tab loopback re-enters lock(), and without the guard
    // that re-entry would broadcast again, unboundedly.
    await act(async () => {
      await ctx!.lock();
    });
    expect(hostA.setLocked).toHaveBeenCalledTimes(1);

    channel.close();
  });

});
