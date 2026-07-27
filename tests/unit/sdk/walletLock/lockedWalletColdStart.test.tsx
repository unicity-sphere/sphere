/**
 * #449 CRITICAL regression guard (ship-blocking bug fix): cold-start/reload of
 * a PASSWORD-PROTECTED wallet must land on the UnlockScreen (isLocked ===
 * true), never on the "Initialization error" screen and never stuck retrying.
 *
 * Root cause this guards against: @unicitylabs/sphere-sdk@0.12.0 does NOT
 * throw `DECRYPTION_ERROR` on a mnemonic-decrypt failure — it throws
 * `SphereError('Failed to decrypt mnemonic', 'STORAGE_ERROR')` (code-verified
 * in node_modules/@unicitylabs/sphere-sdk/dist/core/index.cjs,
 * loadIdentityFromStorage — see src/sdk/walletLock/isDecryptionError.ts).
 * Before the fix, `isDecryptionError`/`classifyInitFailure` only matched a
 * literal `code === 'DECRYPTION_ERROR'`, so this real error fell through to
 * `classifyInitFailure() === 'error'`, re-threw out of the inner try/catch in
 * SphereProvider.initialize(), and was caught by the OUTER catch's
 * `isSphereError(err) && err.code === 'STORAGE_ERROR'` IndexedDB-retry guard
 * — which retried once (Sphere.init called TWICE) and then surfaced a fatal
 * `error`, stranding a password-protected wallet with no way to unlock.
 *
 * This test fails without the fix: it asserts isLocked ends true, error stays
 * null, and — the sharpest guard against "retried, then errored" — Sphere.init
 * is called exactly ONCE (the outer STORAGE_ERROR retry never fires).
 *
 * See also plaintextWalletLoads.test.tsx (the other side of the invariant —
 * an existing PLAINTEXT wallet must keep loading straight through) and
 * autoLockWiring.test.tsx (broader idle-lock integration, same wallet shape).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
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
        // The password-protected wallet, opened passwordlessly on cold start —
        // the REAL SDK signal, not the DECRYPTION_ERROR the old (buggy)
        // predicate looked for.
        if (!opts.password) {
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

function Wrapper({ children }: { children: ReactNode }) {
  const [qc] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

let ctx: SphereContextValue | null = null;
function Probe() {
  ctx = useSphereContext();
  const { isLocked, isLoading, sphere, error } = ctx;
  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="sphere">{sphere ? 'present' : 'null'}</div>
      <div data-testid="locked">{String(isLocked)}</div>
      <div data-testid="error">{error ? error.message : 'null'}</div>
    </div>
  );
}

beforeEach(() => {
  initSpy.calls.length = 0;
  ctx = null;
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new Error('network disabled in test');
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  TokenRegistry.resetInstance();
});

describe('cold-start of a password-protected wallet (#449 critical fix regression)', () => {
  it('ends locked (UnlockScreen), NOT on an error screen, and does not retry', async () => {
    render(
      <Wrapper>
        <SphereProvider>
          <Probe />
        </SphereProvider>
      </Wrapper>,
    );

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    // The bug's exact symptom, inverted: locked, not stuck/errored.
    expect(screen.getByTestId('locked').textContent).toBe('true');
    expect(screen.getByTestId('sphere').textContent).toBe('null');
    expect(screen.getByTestId('error').textContent).toBe('null');
    expect(ctx?.isLocked).toBe(true);

    // Sharpest guard: the inner catch must classify this as 'locked' and
    // return BEFORE the outer IndexedDB-retry catch ever sees it. Before the
    // fix, this error fell through to the outer catch's
    // `err.code === 'STORAGE_ERROR' && attempt < 1` guard and retried once —
    // Sphere.init would have been called twice.
    expect(initSpy.calls.length).toBe(1);
    expect(initSpy.calls[0].password).toBeUndefined();
  });
});
