/**
 * no-wallet-loss guard for the SDK 0.17.4 import contract (sphere-sdk#801/#808).
 *
 * The SDK now refuses to import over the wallet already on this device: it checks every
 * input AND the existing wallet BEFORE it touches storage, and rejects with
 * `ALREADY_INITIALIZED` unless the caller passes `overwrite: true`. `importFromFile`
 * catches whatever the import throws and used to run `cleanupOnError` → `Sphere.clear`
 * for all of it — which, on a refusal, would erase exactly the wallet the SDK had just
 * protected, and the file the user picked would never have replaced it.
 *
 * So: a refusal must come back as a failed result with the wallet untouched, while a real
 * failure must still clean up the half-written wallet it left behind.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SphereContextValue } from '../../../../src/sdk/SphereContext';

const PUBKEY = '02' + 'cd'.repeat(32);

const spies = vi.hoisted(() => ({
  clear: [] as unknown[],
  legacyImport: [] as Record<string, unknown>[],
  import: [] as Record<string, unknown>[],
  /** What the next importFromLegacyFile call does. */
  legacyOutcome: 'refuse' as 'refuse' | 'fail' | 'ok',
}));

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
      exists: vi.fn(async () => false),
      init: vi.fn(async () => ({ sphere: makeFakeSphere() })),
      clear: vi.fn(async (opts: unknown) => {
        spies.clear.push(opts);
      }),
      import: vi.fn(async (opts: Record<string, unknown>) => {
        spies.import.push(opts);
        return makeFakeSphere();
      }),
      importFromLegacyFile: vi.fn(async (opts: Record<string, unknown>) => {
        spies.legacyImport.push(opts);
        if (spies.legacyOutcome === 'refuse') {
          // The exact shape the SDK throws: SphereError with this code, from the gate
          // that runs before any storage write.
          throw new actual.SphereError(
            'A wallet already exists on this storage. Pass overwrite: true to replace it, ' +
              'or import into a different storage (on Node: another walletFileName or dataDir).',
            'ALREADY_INITIALIZED',
          );
        }
        if (spies.legacyOutcome === 'fail') {
          throw new actual.SphereError('relay unreachable', 'NETWORK_ERROR');
        }
        return { success: true, sphere: makeFakeSphere() };
      }),
    },
  };
});

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

let ctx: SphereContextValue | null = null;
function Probe() {
  ctx = useSphereContext();
  return <div data-testid="loading">{String(ctx.isLoading)}</div>;
}

async function mountProvider() {
  render(
    <Wrapper>
      <SphereProvider network="testnet2">
        <Probe />
      </SphereProvider>
    </Wrapper>,
  );
  await waitFor(() => expect(ctx?.isLoading).toBe(false));
}

const FILE = { fileContent: '{"version":"1.0"}', fileName: 'wallet.txt' };

beforeEach(() => {
  spies.clear.length = 0;
  spies.legacyImport.length = 0;
  spies.import.length = 0;
  spies.legacyOutcome = 'refuse';
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

describe('a refused import must not wipe the wallet it was refused over (#801)', () => {
  it('returns the refusal and never calls Sphere.clear', async () => {
    await mountProvider();

    const result = await ctx!.importFromFile(FILE);

    expect(result.success).toBe(false);
    // Mapped to the user-facing line, not the SDK's "pass overwrite: true" wording.
    expect(result.error).toMatch(/already has a wallet/i);
    // The whole point: the wallet on this device is still there.
    expect(spies.clear).toEqual([]);
  });

  it('still cleans up after a REAL import failure, which can leave half-written keys', async () => {
    spies.legacyOutcome = 'fail';
    await mountProvider();

    const result = await ctx!.importFromFile(FILE);

    expect(result.success).toBe(false);
    expect(spies.clear).toHaveLength(1);
  });

  it('forwards overwrite to the SDK only when the caller asks for a replace', async () => {
    spies.legacyOutcome = 'ok';
    await mountProvider();

    await ctx!.importFromFile(FILE);
    await ctx!.importFromFile({ ...FILE, overwrite: true });
    await ctx!.importWallet('phrase', { overwrite: true });
    await ctx!.importWallet('phrase');

    expect(spies.legacyImport.map((o) => o.overwrite)).toEqual([undefined, true]);
    expect(spies.import.map((o) => o.overwrite)).toEqual([true, undefined]);
  });
});
