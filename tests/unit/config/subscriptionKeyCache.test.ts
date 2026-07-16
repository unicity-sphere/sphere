import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { STORAGE_KEYS } from '../../../src/config/storageKeys';
import {
  getStoredSubscriptionKey,
  setStoredSubscriptionKey,
} from '../../../src/config/subscriptionKeyCache';

// The module reads the active network at import; tests run as the build
// default (testnet2), which is also the network the legacy slot belonged to.
const ACTIVE = 'testnet2';
const SCOPED = `${STORAGE_KEYS.SUBSCRIPTION_API_KEY}.${ACTIVE}`;
const LEGACY = STORAGE_KEYS.SUBSCRIPTION_API_KEY;

let store: Record<string, string>;

beforeEach(() => {
  store = {};
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => {
      store[k] = v;
    }),
    removeItem: vi.fn((k: string) => {
      delete store[k];
    }),
    key: vi.fn((i: number) => Object.keys(store)[i] || null),
    get length() {
      return Object.keys(store).length;
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('subscription API key boot cache', () => {
  it('returns null when no key has been stored', () => {
    expect(getStoredSubscriptionKey()).toBeNull();
  });

  it('round-trips a key under the network-scoped slot', () => {
    setStoredSubscriptionKey('sk_secret');

    expect(store[SCOPED]).toBe('sk_secret');
    expect(getStoredSubscriptionKey()).toBe('sk_secret');
  });

  it('overwrites the previous key for the same network', () => {
    setStoredSubscriptionKey('sk_first');
    setStoredSubscriptionKey('sk_second');

    expect(getStoredSubscriptionKey()).toBe('sk_second');
  });

  it('does not read another network\'s key', () => {
    // The whole point: an SGW key is minted per network and is unknown to
    // another network's gateway. A shared slot meant the oracle booted with the
    // previous network's key while the send gate reported 'ready' on it.
    store[`${STORAGE_KEYS.SUBSCRIPTION_API_KEY}.mainnet`] = 'sk_mainnet';

    expect(getStoredSubscriptionKey()).toBeNull();
  });

  it('keeps both networks\' keys side by side instead of overwriting', () => {
    store[`${STORAGE_KEYS.SUBSCRIPTION_API_KEY}.mainnet`] = 'sk_mainnet';
    setStoredSubscriptionKey('sk_testnet2');

    expect(store[`${STORAGE_KEYS.SUBSCRIPTION_API_KEY}.mainnet`]).toBe('sk_mainnet');
    expect(store[SCOPED]).toBe('sk_testnet2');
  });

  it('adopts a legacy unscoped key once, then removes it', () => {
    // Every deployment predating scoping ran the one network the legacy slot
    // could have belonged to, so adopting it is correct — and the slot is
    // app-owned, so deleting it is safe.
    store[LEGACY] = 'sk_legacy';

    expect(getStoredSubscriptionKey()).toBe('sk_legacy');
    expect(store[SCOPED]).toBe('sk_legacy');
    expect(store[LEGACY]).toBeUndefined();
  });

  it('prefers an existing scoped key over a legacy one', () => {
    store[SCOPED] = 'sk_scoped';
    store[LEGACY] = 'sk_legacy';

    expect(getStoredSubscriptionKey()).toBe('sk_scoped');
  });
});
