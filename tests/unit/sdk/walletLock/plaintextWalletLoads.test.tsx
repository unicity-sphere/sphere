/**
 * #449 MANDATORY no-wallet-loss regression: an existing wallet stored WITHOUT
 * a password (Sphere.init SUCCEEDS with no password — an existing plaintext
 * user) must load with isLocked === false and no unlock step, and the
 * existing-wallet load path must NEVER pass a `password` to Sphere.init. If
 * this test ever fails, DECRYPTION_ERROR / lock detection has leaked into the
 * plaintext-wallet path (see src/sdk/walletLock/classifyInitFailure.ts and
 * SphereProvider.initialize()'s existing-wallet branch).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const PUBKEY = '02' + 'ab'.repeat(32);

const initSpy = vi.hoisted(() => ({ calls: [] as Record<string, unknown>[] }));

function makeFakeSphere() {
  return {
    identity: { chainPubkey: PUBKEY },
    // SphereProvider's existing-wallet success path (initialize()) only ever
    // calls these on the adopted instance — keep this in sync with
    // src/sdk/SphereProvider.tsx if that path grows new calls.
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
        return { sphere: makeFakeSphere() };
      }),
    },
  };
});

// The real browser provider bundle opens IndexedDB/Nostr/network connections
// that are irrelevant here — this test only exercises SphereProvider's own
// lock/no-password decision on an existing wallet, not provider composition.
// Stub it with a minimal, inert bundle (shape: BrowserProviders).
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

function Wrapper({ children }: { children: ReactNode }) {
  const [qc] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function Probe() {
  const { isLocked, isLoading, sphere } = useSphereContext();
  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="sphere">{sphere ? 'present' : 'null'}</div>
      <div data-testid="locked">{String(isLocked)}</div>
    </div>
  );
}

beforeEach(() => {
  initSpy.calls.length = 0;
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
  vi.unstubAllGlobals();
  // TokenRegistry is a process-wide singleton that starts a background
  // refresh timer on configure() — reset it so it doesn't leak into (or slow
  // down) other test files.
  TokenRegistry.resetInstance();
});

describe('existing plaintext wallet', () => {
  it('loads without a password and never locks', async () => {
    render(
      <Wrapper>
        <SphereProvider network="testnet2">
          <Probe />
        </SphereProvider>
      </Wrapper>,
    );

    // Wait for the full initialize() flow to finish (not just the initial
    // synchronous render) so a lock flag flipped asynchronously — a false
    // positive from a leaked DECRYPTION_ERROR classification — would be
    // observed here rather than racing past it.
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('sphere').textContent).toBe('present');

    // Assertion 1: the wallet loaded straight through, never locked.
    expect(screen.getByTestId('locked').textContent).toBe('false');

    // Assertion 2: Sphere.init was called at least once, and NONE of those
    // calls carried a `password` — the existing-wallet load path must stay
    // exactly as it was for a plaintext wallet (#449).
    expect(initSpy.calls.length).toBeGreaterThan(0);
    expect(initSpy.calls.every((c) => c.password === undefined)).toBe(true);
  });
});
