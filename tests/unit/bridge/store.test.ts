/**
 * BridgeStore return lifecycle: a `PendingReturn` carries the recovery-critical
 * burned blob (ZK_BACK3 §13), so `removeReturn` must refuse to drop it while a
 * return is still in flight — only a terminal status (settled/failed/stale) is
 * safe to discard.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bridgeStoreFor, isTerminalReturn, type PendingReturn } from '@/bridge/store';

const ADDRESS = 'test-address';

// Node's own global `localStorage` (Node 22+, gated behind --localstorage-file)
// shadows jsdom's — the repo's convention (tests/unit/config/storageKeys.test.ts)
// is to stub it with an in-memory mock rather than rely on the jsdom environment global.
let backing: Record<string, string>;

function makeReturn(overrides: Partial<PendingReturn> = {}): PendingReturn {
  return {
    id: 'return-1',
    coinIdHex: 'aa'.repeat(32),
    nullifierHex: 'bb'.repeat(32),
    burnedTokenCborHex: 'cc'.repeat(16),
    reasonBytesHex: 'dd'.repeat(16),
    configHashHex: 'ee'.repeat(32),
    recipient: 'Tfake',
    amount: '1000000',
    deadline: '9999999999',
    returnServiceUrl: 'https://example.invalid',
    createdAt: Date.now(),
    status: 'queued',
    ...overrides,
  };
}

beforeEach(() => {
  backing = {};
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => backing[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      backing[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete backing[key];
    }),
    clear: vi.fn(() => {
      backing = {};
    }),
    key: vi.fn((index: number) => Object.keys(backing)[index] ?? null),
    get length() {
      return Object.keys(backing).length;
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isTerminalReturn', () => {
  it('is false for in-flight statuses', () => {
    for (const status of ['queued', 'proving', 'proven', 'submitted'] as const) {
      expect(isTerminalReturn({ status })).toBe(false);
    }
  });

  it('is true for terminal statuses', () => {
    for (const status of ['settled', 'failed', 'stale'] as const) {
      expect(isTerminalReturn({ status })).toBe(true);
    }
  });
});

describe('BridgeStore.removeReturn', () => {
  it('refuses to drop a non-terminal return (recovery-critical blob)', () => {
    const store = bridgeStoreFor(ADDRESS);
    store.persistReturn(makeReturn({ status: 'proving' }));
    store.removeReturn('return-1');
    expect(store.listReturns()).toHaveLength(1);
  });

  it('drops a terminal return', () => {
    const store = bridgeStoreFor(ADDRESS);
    store.persistReturn(makeReturn({ status: 'settled' }));
    store.removeReturn('return-1');
    expect(store.listReturns()).toHaveLength(0);
  });

  it('is a no-op for an unknown id', () => {
    const store = bridgeStoreFor(ADDRESS);
    store.persistReturn(makeReturn({ status: 'settled' }));
    store.removeReturn('does-not-exist');
    expect(store.listReturns()).toHaveLength(1);
  });
});
