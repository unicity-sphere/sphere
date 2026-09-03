import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getApprovedOrigins,
  getApprovedOrigin,
  saveApprovedOrigin,
  updateLastSeen,
  revokeApprovedOrigin,
  migrateApprovedSessions,
} from '../../../src/utils/connected-sites';
import { STORAGE_KEYS } from '../../../src/config/storageKeys';

// Mock localStorage
let localStorageMock: Record<string, string>;

beforeEach(() => {
  localStorageMock = {};
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => localStorageMock[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      localStorageMock[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete localStorageMock[key];
    }),
    clear: vi.fn(() => { localStorageMock = {}; }),
    key: vi.fn((index: number) => Object.keys(localStorageMock)[index] ?? null),
    get length() { return Object.keys(localStorageMock).length; },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const DAPP = { name: 'TestDApp', url: 'https://example.com' };
const ORIGIN = 'https://example.com';
const PERMISSIONS = ['identity:read', 'balance:read'] as unknown as import('@unicitylabs/sphere-sdk/connect').PermissionScope[];

// ==========================================
// Network scoping (#497 item 1)
// ==========================================

/**
 * The bug this scoping exists for, and the only shape that can catch it: an
 * approval must be written under ONE network and read back under ANOTHER.
 * A single-network test passes whether the store is scoped or not — the first
 * bucket IS the current bucket when there is only one.
 *
 * SPHERE_NETWORK is resolved at module scope, so switching networks means
 * re-importing the module under a different runtime config. localStorage is the
 * mock above and survives that, which is exactly the real upgrade path.
 */
describe('approvals are scoped to the network they were granted on', () => {
  const MAINNET_LIVE = {
    DEFAULT_NETWORK: 'mainnet',
    WALLET_API_URL_MAINNET: 'https://wallet-api.example',
    SUBSCRIPTION_ENABLED: 'true',
    MAINNET_ROLLOUT_ENABLED: 'true',
  };

  const load = async (
    runtime: Record<string, string> | null,
  ): Promise<typeof import('../../../src/utils/connected-sites')> => {
    (window as unknown as { __SPHERE_RUNTIME_CONFIG__?: unknown }).__SPHERE_RUNTIME_CONFIG__ =
      runtime ?? {};
    vi.resetModules();
    return import('../../../src/utils/connected-sites');
  };

  afterEach(() => {
    delete (window as unknown as { __SPHERE_RUNTIME_CONFIG__?: unknown }).__SPHERE_RUNTIME_CONFIG__;
  });

  it('does not re-grant a testnet approval on mainnet', async () => {
    const onTestnet = await load(null);
    onTestnet.saveApprovedOrigin(ORIGIN, DAPP, PERMISSIONS);
    expect(onTestnet.getApprovedOrigin(ORIGIN)).not.toBeNull();

    const onMainnet = await load(MAINNET_LIVE);

    // Test-money consent must not become real-money authority: the dApp is
    // prompted again rather than silently auto-approved with its old scopes.
    expect(onMainnet.getApprovedOrigin(ORIGIN)).toBeNull();
    expect(onMainnet.getApprovedOrigins()).toEqual({});
  });

  it('keeps each network\'s grants — switching back finds the original', async () => {
    const onTestnet = await load(null);
    onTestnet.saveApprovedOrigin(ORIGIN, DAPP, PERMISSIONS);

    const onMainnet = await load(MAINNET_LIVE);
    onMainnet.saveApprovedOrigin(ORIGIN, { name: 'Mainnet App', url: ORIGIN }, PERMISSIONS);
    expect(onMainnet.getApprovedOrigin(ORIGIN)?.dapp.name).toBe('Mainnet App');

    const backOnTestnet = await load(null);
    expect(backOnTestnet.getApprovedOrigin(ORIGIN)?.dapp.name).toBe('TestDApp');
  });

  it('revoking on one network leaves the other network\'s grant alone', async () => {
    const onTestnet = await load(null);
    onTestnet.saveApprovedOrigin(ORIGIN, DAPP, PERMISSIONS);
    const onMainnet = await load(MAINNET_LIVE);
    onMainnet.saveApprovedOrigin(ORIGIN, { name: 'Mainnet App', url: ORIGIN }, PERMISSIONS);

    onMainnet.revokeApprovedOrigin(ORIGIN);
    expect(onMainnet.getApprovedOrigin(ORIGIN)).toBeNull();

    const backOnTestnet = await load(null);
    expect(backOnTestnet.getApprovedOrigin(ORIGIN)?.dapp.name).toBe('TestDApp');
  });
});

// ==========================================
// getApprovedOrigins
// ==========================================

describe('getApprovedOrigins', () => {
  it('returns empty object when no data exists', () => {
    expect(getApprovedOrigins()).toEqual({});
  });

  it('returns empty object on corrupted JSON', () => {
    localStorageMock[STORAGE_KEYS.CONNECTED_SITES] = '{invalid json';
    expect(getApprovedOrigins()).toEqual({});
  });
});

// ==========================================
// getApprovedOrigin
// ==========================================

describe('getApprovedOrigin', () => {
  it('returns null for unknown origin', () => {
    expect(getApprovedOrigin(ORIGIN)).toBeNull();
  });
});

// ==========================================
// saveApprovedOrigin
// ==========================================

describe('saveApprovedOrigin', () => {
  it('saves and retrieves an entry', () => {
    saveApprovedOrigin(ORIGIN, DAPP, PERMISSIONS);

    const entry = getApprovedOrigin(ORIGIN);
    expect(entry).not.toBeNull();
    expect(entry!.dapp.name).toBe('TestDApp');
    expect(entry!.permissions).toEqual(PERMISSIONS);
    expect(entry!.connectedAt).toBeGreaterThan(0);
    expect(entry!.lastSeenAt).toBeGreaterThan(0);
  });

  it('preserves connectedAt on re-save of same origin', () => {
    saveApprovedOrigin(ORIGIN, DAPP, PERMISSIONS);
    const first = getApprovedOrigin(ORIGIN)!;
    const originalConnectedAt = first.connectedAt;

    // Re-save with updated permissions
    saveApprovedOrigin(ORIGIN, DAPP, ['identity:read'] as unknown as import('@unicitylabs/sphere-sdk/connect').PermissionScope[]);
    const second = getApprovedOrigin(ORIGIN)!;

    expect(second.connectedAt).toBe(originalConnectedAt);
    expect(second.permissions).toEqual(['identity:read']);
  });

  it('updates lastSeenAt on re-save', () => {
    saveApprovedOrigin(ORIGIN, DAPP, PERMISSIONS);
    const first = getApprovedOrigin(ORIGIN)!;

    // Advance time slightly
    vi.spyOn(Date, 'now').mockReturnValue(first.lastSeenAt + 5000);

    saveApprovedOrigin(ORIGIN, DAPP, PERMISSIONS);
    const second = getApprovedOrigin(ORIGIN)!;

    expect(second.lastSeenAt).toBe(first.lastSeenAt + 5000);

    vi.restoreAllMocks();
  });

  it('stores full DAppMetadata', () => {
    const dapp = { name: 'Rich', description: 'A dApp', icon: 'https://example.com/icon.png', url: 'https://example.com' };
    saveApprovedOrigin(ORIGIN, dapp, PERMISSIONS);

    const entry = getApprovedOrigin(ORIGIN)!;
    expect(entry.dapp).toEqual(dapp);
  });
});

// ==========================================
// updateLastSeen
// ==========================================

describe('updateLastSeen', () => {
  it('updates only lastSeenAt field', () => {
    saveApprovedOrigin(ORIGIN, DAPP, PERMISSIONS);
    const before = getApprovedOrigin(ORIGIN)!;

    vi.spyOn(Date, 'now').mockReturnValue(before.lastSeenAt + 10_000);
    updateLastSeen(ORIGIN);
    vi.restoreAllMocks();

    const after = getApprovedOrigin(ORIGIN)!;
    expect(after.lastSeenAt).toBe(before.lastSeenAt + 10_000);
    expect(after.connectedAt).toBe(before.connectedAt);
    expect(after.dapp).toEqual(before.dapp);
    expect(after.permissions).toEqual(before.permissions);
  });

  it('is no-op for unknown origin', () => {
    updateLastSeen('https://unknown.com');
    expect(getApprovedOrigins()).toEqual({});
  });
});

// ==========================================
// revokeApprovedOrigin
// ==========================================

describe('revokeApprovedOrigin', () => {
  it('removes the entry', () => {
    saveApprovedOrigin(ORIGIN, DAPP, PERMISSIONS);
    expect(getApprovedOrigin(ORIGIN)).not.toBeNull();

    revokeApprovedOrigin(ORIGIN);
    expect(getApprovedOrigin(ORIGIN)).toBeNull();
  });

  it('is no-op for unknown origin', () => {
    saveApprovedOrigin(ORIGIN, DAPP, PERMISSIONS);
    revokeApprovedOrigin('https://unknown.com');
    expect(getApprovedOrigin(ORIGIN)).not.toBeNull();
  });
});

// ==========================================
// migrateApprovedSessions
// ==========================================

describe('migrateApprovedSessions', () => {
  const OLD_KEY = 'sphere-connect:approved';

  it('DROPS the old array format instead of converting it (#497 item 1)', () => {
    // This used to convert. It must not any more: neither pre-network shape
    // records the network its grants were given on, and a permission store must
    // not guess — inheriting them into the active network is exactly how
    // test-money consent becomes real-money authority. The user re-approves once,
    // with a prompt, which is the right price.
    localStorageMock[OLD_KEY] = JSON.stringify([
      { origin: 'https://a.com', dappName: 'App A', permissions: ['identity:read'], approvedAt: 1000 },
      { origin: 'https://b.com', dappName: 'App B', permissions: ['balance:read'], approvedAt: 2000 },
    ]);

    migrateApprovedSessions();

    expect(getApprovedOrigins()).toEqual({});
    expect(localStorageMock[OLD_KEY]).toBeUndefined();
  });

  it('DROPS a flat pre-network record — an unscoped grant is not inherited', () => {
    // The shape that replaced the array, and the one most wallets actually hold.
    // readStore() refuses anything without `v: 2`.
    localStorageMock[STORAGE_KEYS.CONNECTED_SITES] = JSON.stringify({
      'https://a.com': {
        permissions: ['transfer:request'],
        connectedAt: 1000,
        lastSeenAt: 1000,
        dapp: { name: 'App A', url: 'https://a.com' },
      },
    });

    expect(getApprovedOrigins()).toEqual({});
    expect(getApprovedOrigin('https://a.com')).toBeNull();
  });

  it('removes old key after migration', () => {
    localStorageMock[OLD_KEY] = JSON.stringify([
      { origin: ORIGIN, dappName: 'Test', permissions: [], approvedAt: 1000 },
    ]);

    migrateApprovedSessions();
    expect(localStorageMock[OLD_KEY]).toBeUndefined();
  });

  it('is idempotent', () => {
    localStorageMock[OLD_KEY] = JSON.stringify([
      { origin: ORIGIN, dappName: 'Test', permissions: ['identity:read'], approvedAt: 1000 },
    ]);

    migrateApprovedSessions();
    migrateApprovedSessions(); // second call — old key already gone

    expect(getApprovedOrigins()).toEqual({});
    expect(localStorageMock[OLD_KEY]).toBeUndefined();
  });

  it('does not overwrite existing new-format entries', () => {
    // Pre-existing entry in new format
    saveApprovedOrigin(ORIGIN, { name: 'NewName', url: ORIGIN }, PERMISSIONS);

    // Old format has different data for same origin
    localStorageMock[OLD_KEY] = JSON.stringify([
      { origin: ORIGIN, dappName: 'OldName', permissions: ['identity:read'], approvedAt: 500 },
    ]);

    migrateApprovedSessions();

    const entry = getApprovedOrigin(ORIGIN)!;
    expect(entry.dapp.name).toBe('NewName'); // new-format preserved
    expect(entry.permissions).toEqual(PERMISSIONS);
  });

  it('is no-op when no old data exists', () => {
    migrateApprovedSessions();
    expect(getApprovedOrigins()).toEqual({});
  });

  it('removes old key if old data is empty array', () => {
    localStorageMock[OLD_KEY] = JSON.stringify([]);
    migrateApprovedSessions();
    expect(localStorageMock[OLD_KEY]).toBeUndefined();
  });
});
