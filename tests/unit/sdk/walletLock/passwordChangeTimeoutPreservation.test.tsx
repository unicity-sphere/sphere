/**
 * #449 review-fix regression: Set/Change password must PRESERVE the user's
 * chosen auto-lock timeout, not silently reset it to the 15-min default.
 *
 * Root cause that was fixed: the timeout is persisted ENCRYPTED with the
 * wallet password (encodeLockSettings/decodeLockSettings —
 * src/sdk/walletLock/lockSettings.ts). setWalletPassword/changeWalletPassword
 * re-encrypt the mnemonic and call setSessionPassword(newPassword) — without
 * ALSO re-persisting the timeout blob under the NEW password,
 * decodeLockSettings(oldBlob, newPassword) fails to decrypt and silently
 * falls back to DEFAULT_AUTO_LOCK_MINUTES (15). See SphereProvider.tsx:
 * readCurrentAutoLockMinutes / setWalletPassword / changeWalletPassword.
 *
 * Runs REAL SDK crypto (reencryptStoredMnemonic + encode/decodeLockSettings)
 * against a fake in-memory storage — same approach as reencryptMnemonic.test.ts
 * and lockSettings.test.ts. These tests are given a generous timeout; PBKDF2
 * is intentionally slow.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SphereContextValue } from '../../../../src/sdk/SphereContext';

// Each test here runs SEVERAL real PBKDF2 round-trips (unlock, setAutoLockTimeout,
// and change/remove/set password — the latter alone is decrypt+encrypt+verify-decrypt
// inside reencryptStoredMnemonic), more than lockSettings.test.ts's single round-trip.
// Under full-suite parallelism (many worker threads doing real crypto concurrently)
// that can intermittently push past a 20s budget even though each test is fast in
// isolation — give these a wide margin so they're reliably green under `npm run test:run`.
const SLOW_CRYPTO_TIMEOUT_MS = 45000;

const PUBKEY = '02' + 'ab'.repeat(32);
const OLD_PASSWORD = 'correct horse battery staple';
const NEW_PASSWORD = 'new correct horse battery staple';

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

// Shared, mutable per-test fake storage + wallet-shape toggle. Referenced
// from inside the (hoisted) vi.mock factories below, so it must itself be
// created via vi.hoisted — mirrors autoLockWiring.test.tsx's mockState.
const testState = vi.hoisted(() => ({
  store: new Map<string, string>(),
  mode: 'encrypted' as 'plaintext' | 'encrypted',
}));

vi.mock('@unicitylabs/sphere-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@unicitylabs/sphere-sdk')>();
  return {
    ...actual,
    Sphere: {
      ...actual.Sphere,
      exists: vi.fn(async () => true),
      init: vi.fn(async (opts: Record<string, unknown>) => {
        // 'encrypted': a passwordless load always throws DECRYPTION_ERROR
        // (locked); any password unlocks. 'plaintext': always succeeds. The
        // REAL password verification this file actually exercises happens
        // inside reencryptStoredMnemonic against the fake storage below, not
        // here — Sphere.init's own credential logic is irrelevant to it.
        if (testState.mode === 'encrypted' && !opts.password) {
          throw { code: 'DECRYPTION_ERROR' };
        }
        return { sphere: makeFakeSphere() };
      }),
    },
  };
});

// The real browser provider bundle opens IndexedDB/Nostr/network connections
// that are irrelevant here — stub it with a minimal, inert bundle (shape:
// BrowserProviders) whose storage is backed by testState.store so
// reencryptStoredMnemonic (called for REAL by setWalletPassword/
// changeWalletPassword/removeWalletPassword) round-trips against it.
vi.mock('@unicitylabs/sphere-sdk/impl/browser', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@unicitylabs/sphere-sdk/impl/browser')>();
  return {
    ...actual,
    createBrowserProviders: vi.fn(() => ({
      storage: {
        get: vi.fn(async (key: string) => testState.store.get(key) ?? null),
        set: vi.fn(async (key: string, value: string) => {
          testState.store.set(key, value);
        }),
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

import {
  TokenRegistry,
  STORAGE_KEYS_GLOBAL,
  generateMnemonic,
  encryptMnemonic,
} from '@unicitylabs/sphere-sdk';
import { SphereProvider } from '../../../../src/sdk/SphereProvider';
import { useSphereContext } from '../../../../src/sdk/hooks/core/useSphere';
import { STORAGE_KEYS } from '../../../../src/config/storageKeys';
import { decodeLockSettings, DEFAULT_AUTO_LOCK_MINUTES } from '../../../../src/sdk/walletLock/lockSettings';

function Wrapper({ children }: { children: ReactNode }) {
  const [qc] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

// Captures the live context so the test can drive setAutoLockTimeout/
// changeWalletPassword/etc imperatively — same pattern as
// autoLockWiring.test.tsx.
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
      <SphereProvider>
        <Probe />
      </SphereProvider>
    </Wrapper>,
  );
}

beforeEach(() => {
  ctx = null;
  testState.mode = 'encrypted';
  testState.store.clear();
  localStorage.clear();
  const mnemonic = generateMnemonic();
  testState.store.set(STORAGE_KEYS_GLOBAL.MNEMONIC, encryptMnemonic(mnemonic, OLD_PASSWORD));
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
  localStorage.clear();
  // TokenRegistry is a process-wide singleton that starts a background
  // refresh timer on configure() — reset it so it doesn't leak into (or slow
  // down) other test files.
  TokenRegistry.resetInstance();
});

describe('auto-lock timeout survives Set/Change password (#449 review fix)', () => {
  it('a custom timeout chosen before a password Change is still in effect after it', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('locked').textContent).toBe('true'));

    await act(async () => {
      await ctx!.unlock(OLD_PASSWORD);
    });
    expect(screen.getByTestId('locked').textContent).toBe('false');
    expect(ctx!.hasWalletPassword).toBe(true);

    // User picks a non-default timeout.
    act(() => {
      ctx!.setAutoLockTimeout(5);
    });
    expect(ctx!.autoLockMinutes).toBe(5);

    // Now change the password.
    await act(async () => {
      await ctx!.changeWalletPassword(OLD_PASSWORD, NEW_PASSWORD);
    });

    // REGRESSION CHECK: must still be 5, not silently reset to the 15-min
    // default (the bug this test guards against).
    expect(ctx!.autoLockMinutes).toBe(5);

    // And the persisted blob is genuinely readable under the NEW password —
    // not just a stale in-memory state value that happens to still say 5.
    const blob = localStorage.getItem(STORAGE_KEYS.AUTO_LOCK_TIMEOUT);
    expect(blob).toBeTruthy();
    expect(decodeLockSettings(blob!, NEW_PASSWORD)).toBe(5);
    // The OLD password must no longer decode it (it was genuinely re-encrypted).
    expect(decodeLockSettings(blob!, OLD_PASSWORD)).not.toBe(5);
  }, SLOW_CRYPTO_TIMEOUT_MS);

  it('"never" survives a password Change too', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('locked').textContent).toBe('true'));

    await act(async () => {
      await ctx!.unlock(OLD_PASSWORD);
    });

    act(() => {
      ctx!.setAutoLockTimeout('never');
    });
    expect(ctx!.autoLockMinutes).toBe('never');

    await act(async () => {
      await ctx!.changeWalletPassword(OLD_PASSWORD, NEW_PASSWORD);
    });

    expect(ctx!.autoLockMinutes).toBe('never');
  }, SLOW_CRYPTO_TIMEOUT_MS);

  it('Remove disarms auto-lock instead of preserving the timeout (by design, not a regression)', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('locked').textContent).toBe('true'));

    await act(async () => {
      await ctx!.unlock(OLD_PASSWORD);
    });

    act(() => {
      ctx!.setAutoLockTimeout(30);
    });
    expect(ctx!.autoLockMinutes).toBe(30);

    await act(async () => {
      await ctx!.removeWalletPassword(OLD_PASSWORD);
    });

    // No password left → nothing to arm auto-lock with; the context
    // reflects the secure default rather than a stale custom value.
    expect(ctx!.hasWalletPassword).toBe(false);
    expect(ctx!.autoLockMinutes).toBe(DEFAULT_AUTO_LOCK_MINUTES);
  }, SLOW_CRYPTO_TIMEOUT_MS);

  it('Set on a plaintext wallet (nothing to preserve) still ends up armed at the default, without crashing', async () => {
    testState.mode = 'plaintext';
    testState.store.clear();
    const mnemonic = generateMnemonic();
    testState.store.set(STORAGE_KEYS_GLOBAL.MNEMONIC, mnemonic); // plaintext, no password yet

    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('locked').textContent).toBe('false');
    expect(ctx!.hasWalletPassword).toBe(false);

    await act(async () => {
      await ctx!.setWalletPassword(NEW_PASSWORD);
    });

    expect(ctx!.hasWalletPassword).toBe(true);
    expect(ctx!.autoLockMinutes).toBe(DEFAULT_AUTO_LOCK_MINUTES);

    const blob = localStorage.getItem(STORAGE_KEYS.AUTO_LOCK_TIMEOUT);
    expect(blob).toBeTruthy();
    expect(decodeLockSettings(blob!, NEW_PASSWORD)).toBe(DEFAULT_AUTO_LOCK_MINUTES);
  }, SLOW_CRYPTO_TIMEOUT_MS);
});
