import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { createElement, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useNewAddressFlow,
  cleanNametagInput,
  canonicalNametag,
} from '../../../src/components/wallet/shared/hooks/useNewAddressFlow';

const OLD_PUBKEY = '02' + 'ab'.repeat(32);
const NEW_PUBKEY = '02' + 'cd'.repeat(32);

type EventHandler = (data: Record<string, unknown>) => void;

interface FakeSphere extends Record<string, unknown> {
  currentIndex: number;
  identity: Record<string, unknown> | null;
  _handlers: Record<string, EventHandler>;
}

// The hook reads sphere/providers/resolveNametag via useSphereContext — swap in fakes.
let fakeContext: {
  sphere: FakeSphere | null;
  providers: Record<string, unknown> | null;
  resolveNametag: (nametag: string) => Promise<unknown>;
};
vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => fakeContext,
}));

function makeSphere(overrides: Record<string, unknown> = {}): FakeSphere {
  const handlers: Record<string, EventHandler> = {};
  const sphere: FakeSphere = {
    currentIndex: 0,
    identity: null,
    _handlers: handlers,
    getCurrentAddressIndex: vi.fn(() => sphere.currentIndex),
    getAllTrackedAddresses: vi.fn(() => [{ index: 0 }, { index: 3, hidden: true }]),
    switchToAddress: vi.fn(async (index: number) => {
      sphere.currentIndex = index;
      sphere.identity = { chainPubkey: NEW_PUBKEY };
    }),
    deriveAddress: vi.fn((index: number) => ({
      publicKey: NEW_PUBKEY,
      privateKey: 'priv',
      path: `m/44'/1'/0'/0/${index}`,
      index,
    })),
    registerNametag: vi.fn(async () => {}),
    on: vi.fn((event: string, cb: EventHandler) => {
      handlers[event] = cb;
      return () => {
        delete handlers[event];
      };
    }),
  };
  return Object.assign(sphere, overrides);
}

function Wrapper({ children }: { children: ReactNode }) {
  const [qc] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return createElement(QueryClientProvider, { client: qc }, children);
}

function setup() {
  return renderHook(() => useNewAddressFlow(), { wrapper: Wrapper });
}

beforeEach(() => {
  fakeContext = {
    sphere: makeSphere(),
    providers: {
      transport: { resolveNametagInfo: vi.fn(), isConnected: vi.fn(() => true) },
    },
    resolveNametag: vi.fn(async () => null),
  };
});

afterEach(() => {
  vi.useRealTimers();
});

describe('nametag input normalization', () => {
  it('cleanNametagInput trims, strips the leading @ and lowercases', () => {
    expect(cleanNametagInput('  @Alice_1 ')).toBe('alice_1');
    expect(cleanNametagInput('BOB')).toBe('bob');
  });

  it('canonicalNametag converts phone numbers to E.164 like the SDK does', () => {
    expect(canonicalNametag('415.555.2671')).toBe('+14155552671');
    expect(canonicalNametag('@Bob_1')).toBe('bob_1');
  });
});

describe('useNewAddressFlow — derivation', () => {
  it('derives the next index across ALL tracked addresses (hidden included)', async () => {
    const { result } = setup();
    await act(() => result.current.start());

    const sphere = fakeContext.sphere!;
    // max(0, 3-hidden) + 1 = 4 — a hidden index must never be re-derived
    expect(sphere.switchToAddress).toHaveBeenCalledWith(4);
    expect(result.current.state.step).toBe('nametag_input');
    expect(result.current.state.newAddress).toEqual({ chainPubkey: NEW_PUBKEY, index: 4 });
  });

  it('starts from index 1 when nothing is tracked', async () => {
    fakeContext.sphere = makeSphere({ getAllTrackedAddresses: vi.fn(() => []) });
    const { result } = setup();
    await act(() => result.current.start());
    expect(fakeContext.sphere.switchToAddress).toHaveBeenCalledWith(1);
  });

  it('completes as "recovered" without a prompt when the SDK restored a nametag during the switch', async () => {
    const sphere = makeSphere({
      switchToAddress: vi.fn(async (index: number) => {
        sphere.currentIndex = index;
        sphere.identity = { chainPubkey: NEW_PUBKEY, nametag: 'alice' };
      }),
    });
    fakeContext.sphere = sphere;
    const { result } = setup();
    await act(() => result.current.start());

    expect(result.current.state.step).toBe('complete');
    expect(result.current.state.outcome).toBe('recovered');
    expect(result.current.state.completedNametag).toBe('alice');
  });

  it('never attributes a nametag from an identity with a different pubkey', async () => {
    // Identity claims a nametag but belongs to another key — must prompt, not "recover".
    const sphere = makeSphere({
      switchToAddress: vi.fn(async (index: number) => {
        sphere.currentIndex = index;
        sphere.identity = { chainPubkey: OLD_PUBKEY, nametag: 'not_mine' };
      }),
    });
    fakeContext.sphere = sphere;
    const { result } = setup();
    await act(() => result.current.start());

    expect(result.current.state.step).toBe('nametag_input');
    expect(result.current.state.completedNametag).toBeNull();
  });

  it('lands on the error step when derivation fails', async () => {
    fakeContext.sphere = makeSphere({
      switchToAddress: vi.fn(async () => {
        throw new Error('boom');
      }),
    });
    const { result } = setup();
    await act(() => result.current.start());
    expect(result.current.state.step).toBe('error');
    expect(result.current.state.error).toBe('boom');
  });
});

describe('useNewAddressFlow — slow switch (timeout) handling', () => {
  it('keeps waiting after the quick timeout instead of trusting the OLD identity', async () => {
    vi.useFakeTimers();
    // Old address has a nametag — the buggy pattern would flash a false "recovered".
    const sphere = makeSphere({
      identity: { chainPubkey: OLD_PUBKEY, nametag: 'old_tag' },
      switchToAddress: vi.fn(() => new Promise<void>(() => {})), // hangs
    });
    fakeContext.sphere = sphere;
    const { result } = setup();

    let startPromise: Promise<void> | undefined;
    act(() => {
      startPromise = result.current.start();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    // Still deriving — no prompt, no false recovered, slow hint on.
    expect(result.current.state.step).toBe('deriving');
    expect(result.current.state.slow).toBe(true);
    expect(result.current.state.outcome).toBeNull();

    // The SDK finishes the switch in the background.
    sphere.currentIndex = 4;
    sphere.identity = { chainPubkey: NEW_PUBKEY };
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
      await startPromise;
    });

    expect(result.current.state.step).toBe('nametag_input');
    expect(result.current.state.completedNametag).toBeNull();
  });

  it('errors out when the switch never completes within the extended window', async () => {
    vi.useFakeTimers();
    const sphere = makeSphere({
      switchToAddress: vi.fn(() => new Promise<void>(() => {})), // hangs forever
    });
    fakeContext.sphere = sphere;
    const { result } = setup();

    let startPromise: Promise<void> | undefined;
    act(() => {
      startPromise = result.current.start();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
      await startPromise;
    });

    expect(result.current.state.step).toBe('error');
    expect(result.current.state.error).toMatch(/taking too long/i);
  });

  it('reuses the same index on retry after a failure — no address leak', async () => {
    const sphere = makeSphere({
      switchToAddress: vi
        .fn()
        .mockRejectedValueOnce(new Error('provider init failed'))
        .mockImplementation(async (index: number) => {
          sphere.currentIndex = index;
          sphere.identity = { chainPubkey: NEW_PUBKEY };
        }),
      // After the failed attempt the SDK has already tracked index 4.
      getAllTrackedAddresses: vi
        .fn()
        .mockReturnValueOnce([{ index: 0 }, { index: 3, hidden: true }])
        .mockReturnValue([{ index: 0 }, { index: 3, hidden: true }, { index: 4 }]),
    });
    fakeContext.sphere = sphere;
    const { result } = setup();

    await act(() => result.current.start());
    expect(result.current.state.step).toBe('error');

    await act(() => result.current.start());
    expect(result.current.state.step).toBe('nametag_input');
    // Both attempts used index 4 — a naive max+1 would have leaked to 5.
    expect(sphere.switchToAddress).toHaveBeenNthCalledWith(1, 4);
    expect(sphere.switchToAddress).toHaveBeenNthCalledWith(2, 4);
  });
});

describe('useNewAddressFlow — availability', () => {
  it('reports taken / available from the resolver (canonical form)', async () => {
    fakeContext.resolveNametag = vi.fn(async (tag: string) =>
      tag === 'taken_tag' ? { nametag: tag } : null,
    );
    const { result } = setup();
    expect(await result.current.checkAvailability('taken_tag')).toBe('taken');
    expect(await result.current.checkAvailability('free_tag')).toBe('available');
    // Phone input is resolved in its E.164 form — the key the SDK registers.
    expect(await result.current.checkAvailability('415.555.2671')).toBe('available');
    expect(fakeContext.resolveNametag).toHaveBeenCalledWith('+14155552671');
  });

  it('reports "unknown" (cannot verify) when the resolver throws', async () => {
    fakeContext.resolveNametag = vi.fn(async () => {
      throw new Error('relay down');
    });
    const { result } = setup();
    expect(await result.current.checkAvailability('any_tag')).toBe('unknown');
  });

  it('does not trust a null result while the transport is disconnected', async () => {
    (fakeContext.providers as { transport: { isConnected: () => boolean } }).transport.isConnected =
      () => false;
    const { result } = setup();
    expect(await result.current.checkAvailability('any_tag')).toBe('unknown');
  });

  it('reports "unknown" when the transport cannot resolve nametags at all', async () => {
    fakeContext.providers = { transport: {} };
    const { result } = setup();
    expect(await result.current.checkAvailability('any_tag')).toBe('unknown');
  });
});

describe('useNewAddressFlow — registration', () => {
  async function startToPrompt() {
    const rendered = setup();
    await act(() => rendered.result.current.start());
    expect(rendered.result.current.state.step).toBe('nametag_input');
    return rendered;
  }

  it('registers a valid, available ID', async () => {
    const { result } = await startToPrompt();
    await act(() => result.current.register('@Bob_1'));

    expect(fakeContext.sphere!.registerNametag).toHaveBeenCalledWith('bob_1');
    expect(result.current.state.step).toBe('complete');
    expect(result.current.state.outcome).toBe('registered');
    expect(result.current.state.completedNametag).toBe('bob_1');
  });

  it('registers phone numbers in the E.164 form the SDK uses', async () => {
    const { result } = await startToPrompt();
    await act(() => result.current.register('415.555.2671'));
    expect(fakeContext.sphere!.registerNametag).toHaveBeenCalledWith('+14155552671');
    expect(result.current.state.step).toBe('complete');
    expect(result.current.state.completedNametag).toBe('+14155552671');
  });

  it('shows the SDK-stored nametag on completion when the SDK normalized it', async () => {
    const sphere = fakeContext.sphere!;
    sphere.registerNametag = vi.fn(async () => {
      sphere.identity = { ...(sphere.identity ?? {}), nametag: 'sdk_normalized' };
    });
    const { result } = await startToPrompt();
    await act(() => result.current.register('bob_1'));
    expect(result.current.state.completedNametag).toBe('sdk_normalized');
  });

  it('rejects IDs the SDK would reject — before any network call', async () => {
    const { result } = await startToPrompt();

    for (const bad of ['ab', 'my.name', 'a'.repeat(21)]) {
      await act(() => result.current.register(bad));
      expect(result.current.state.step).toBe('nametag_input');
      expect(result.current.state.registerError).toContain('Invalid Unicity ID format');
    }
    expect(fakeContext.resolveNametag).not.toHaveBeenCalled();
    expect(fakeContext.sphere!.registerNametag).not.toHaveBeenCalled();
  });

  it('refuses to register when the wallet is no longer on the new address', async () => {
    const { result } = await startToPrompt();
    fakeContext.sphere!.currentIndex = 0;
    await act(() => result.current.register('bob_1'));

    expect(result.current.state.registerError).toMatch(/no longer on this address/i);
    expect(fakeContext.sphere!.registerNametag).not.toHaveBeenCalled();
  });

  it('shows "already taken" and returns to the prompt when the pre-check hits', async () => {
    fakeContext.resolveNametag = vi.fn(async () => ({ nametag: 'bob' }));
    const { result } = await startToPrompt();
    await act(() => result.current.register('bob'));

    expect(result.current.state.step).toBe('nametag_input');
    expect(result.current.state.registerError).toBe('@bob is already taken');
    expect(fakeContext.sphere!.registerNametag).not.toHaveBeenCalled();
  });

  it('still registers when availability cannot be verified (relay enforces uniqueness)', async () => {
    fakeContext.resolveNametag = vi.fn(async () => {
      throw new Error('relay down');
    });
    const { result } = await startToPrompt();
    await act(() => result.current.register('bob_2'));

    expect(fakeContext.sphere!.registerNametag).toHaveBeenCalledWith('bob_2');
    expect(result.current.state.step).toBe('complete');
  });

  it('surfaces registration failures inline and keeps the prompt', async () => {
    fakeContext.sphere = makeSphere({
      registerNametag: vi.fn(async () => {
        throw new Error('Failed to register Unicity ID. It may already be taken.');
      }),
    });
    const { result } = await startToPrompt();
    await act(() => result.current.register('bob_3'));

    expect(result.current.state.step).toBe('nametag_input');
    expect(result.current.state.registerError).toContain('may already be taken');
  });

  it('treats ALREADY_INITIALIZED as a lost recovery race, not an error', async () => {
    const err = Object.assign(new Error('already has a nametag'), {
      code: 'ALREADY_INITIALIZED',
    });
    fakeContext.sphere = makeSphere({
      registerNametag: vi.fn(async () => {
        throw err;
      }),
    });
    const { result } = await startToPrompt();
    fakeContext.sphere.identity = { chainPubkey: NEW_PUBKEY, nametag: 'raced' };
    await act(() => result.current.register('bob_4'));

    expect(result.current.state.step).toBe('complete');
    expect(result.current.state.outcome).toBe('recovered');
    expect(result.current.state.completedNametag).toBe('raced');
  });
});

describe('useNewAddressFlow — skip & recovery race', () => {
  it('skip completes without registering', async () => {
    const { result } = setup();
    await act(() => result.current.start());
    act(() => result.current.skip());

    expect(result.current.state.step).toBe('complete');
    expect(result.current.state.outcome).toBe('skipped');
    expect(result.current.state.completedNametag).toBeNull();
    expect(fakeContext.sphere!.registerNametag).not.toHaveBeenCalled();
  });

  it('a background nametag:recovered event while the prompt is open completes the flow', async () => {
    const { result } = setup();
    await act(() => result.current.start());
    expect(result.current.state.step).toBe('nametag_input');

    const handlers = fakeContext.sphere!._handlers;
    await waitFor(() => expect(handlers['nametag:recovered']).toBeDefined());

    act(() => handlers['nametag:recovered']({ nametag: 'zoe' }));

    expect(result.current.state.step).toBe('complete');
    expect(result.current.state.outcome).toBe('recovered');
    expect(result.current.state.completedNametag).toBe('zoe');
  });

  it('clearRegisterError dismisses the inline error only', async () => {
    const { result } = setup();
    await act(() => result.current.start());
    await act(() => result.current.register('ab'));
    expect(result.current.state.registerError).not.toBeNull();

    act(() => result.current.clearRegisterError());
    expect(result.current.state.registerError).toBeNull();
    expect(result.current.state.step).toBe('nametag_input');
  });
});
